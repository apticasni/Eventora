import { Router, Response, Request } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { VerifyPaymentSchema, CreateOrderSchema } from '@eventora/shared';
import {
  getRazorpayInstance,
  isRazorpayLiveConfigured,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../lib/razorpay';
import { confirmPaidBooking, failPendingPayment } from '../services/payments';
import { randomUUID } from 'crypto';

export const paymentsRouter = Router();

paymentsRouter.post('/create-order', requireAuth, validateBody(CreateOrderSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true },
    });
    if (!booking) throw new AppError(404, 'Booking not found.');
    if (booking.userId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
    if (booking.status !== 'PENDING') throw new AppError(400, 'Booking is not in pending status.');
    if (booking.totalAmount <= 0) {
      throw new AppError(400, 'This booking does not require payment.');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    let orderId: string;
    let orderAmount: number = amountPaise;
    let currency = booking.currency;
    let devMode = false;

    if (isRazorpayLiveConfigured()) {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: booking.currency,
        receipt: booking.reference,
      });
      orderId = order.id;
      orderAmount = order.amount;
      currency = order.currency;
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(503, 'Payment service not configured.');
      }
      // Local/dev only: simulated Razorpay order so checkout can be tested without live keys.
      orderId = `order_dev_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
      devMode = true;
    }

    const payment = await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        razorpayOrderId: orderId,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
      },
      update: {
        razorpayOrderId: orderId,
        amount: booking.totalAmount,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      data: {
        orderId,
        amount: orderAmount,
        currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingReference: booking.reference,
        paymentId: payment.id,
        devMode,
      },
    });
  } catch (err) { next(err); }
});

paymentsRouter.post('/verify', requireAuth, validateBody(VerifyPaymentSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

    if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      throw new AppError(400, 'Payment verification failed. Invalid signature.');
    }

    const result = await confirmPaidBooking({
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId: req.user!.userId,
    });

    res.json({
      success: true,
      data: { tickets: result.tickets },
      message: result.alreadyConfirmed
        ? 'Booking already confirmed.'
        : 'Payment verified and booking confirmed!',
    });
  } catch (err) { next(err); }
});

// Development-only confirmation for placeholder Razorpay keys. Never enabled in production.
paymentsRouter.post('/dev-confirm', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    if (process.env.NODE_ENV === 'production' || isRazorpayLiveConfigured()) {
      throw new AppError(404, 'Route not found');
    }
    const { bookingId } = req.body as { bookingId?: string };
    if (!bookingId) throw new AppError(400, 'bookingId is required.');

    const payment = await prisma.payment.findUnique({ where: { bookingId } });
    if (!payment) throw new AppError(404, 'Payment order not found.');
    if (!payment.razorpayOrderId.startsWith('order_dev_')) {
      throw new AppError(400, 'This booking requires a real Razorpay payment.');
    }

    const result = await confirmPaidBooking({
      bookingId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: `pay_dev_${randomUUID().replace(/-/g, '').slice(0, 14)}`,
      razorpaySignature: 'dev-simulated',
      userId: req.user!.userId,
    });

    res.json({
      success: true,
      data: { tickets: result.tickets, simulated: true },
      message: 'Development payment simulated and booking confirmed.',
    });
  } catch (err) { next(err); }
});

paymentsRouter.post('/webhook', async (req: Request, res: Response, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret.includes('sample')) {
      res.status(400).json({ success: false, message: 'Webhook secret is not configured.' });
      return;
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.body as Buffer;
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
      return;
    }

    const event = JSON.parse(body.toString());
    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId: paymentEntity.order_id },
      });
      if (payment) {
        await confirmPaidBooking({
          bookingId: payment.bookingId,
          razorpayOrderId: paymentEntity.order_id,
          razorpayPaymentId: paymentEntity.id,
          webhookVerified: true,
        });
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload.payment.entity;
      await failPendingPayment(paymentEntity.order_id);
    }

    res.json({ received: true });
  } catch (err) { next(err); }
});
