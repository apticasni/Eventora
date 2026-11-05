import { Router, Response, Request } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { VerifyPaymentSchema, CreateOrderSchema } from '@eventora/shared';
import {
  getRazorpayInstance,
  isRazorpayTestConfigured,
  isRazorpayWebhookConfigured,
  isCapturedRazorpayPayment,
  isRazorpayOrderId,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../lib/razorpay';
import { confirmPaidBooking } from '../services/payments';

export const paymentsRouter = Router();

paymentsRouter.post('/create-order', requireAuth, validateBody(CreateOrderSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isRazorpayTestConfigured()) {
      throw new AppError(503, 'Razorpay Test Mode is not configured. Set the test key ID and secret.');
    }

    const { bookingId } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new AppError(404, 'Booking not found.');
    if (booking.userId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
    if (booking.status !== 'PENDING') throw new AppError(400, 'Booking is not in pending status.');
    if (booking.totalAmount <= 0) {
      throw new AppError(400, 'This booking does not require payment.');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    if (booking.payment?.status === 'CAPTURED') {
      throw new AppError(409, 'This booking already has a captured payment.');
    }
    if (booking.payment?.status === 'PENDING' || booking.payment?.status === 'FAILED') {
      if (isRazorpayOrderId(booking.payment.razorpayOrderId)) {
        if (booking.payment.amount !== booking.totalAmount || booking.payment.currency !== booking.currency) {
          throw new AppError(409, 'Payment order amount or currency does not match this booking.');
        }
        // Razorpay permits retrying a failed attempt against the same order.
        if (booking.payment.status === 'FAILED') {
          await prisma.payment.update({
            where: { id: booking.payment.id },
            data: {
              status: 'PENDING',
              razorpayPaymentId: null,
              razorpaySignature: null,
              webhookVerified: false,
            },
          });
        }
        res.json({
          success: true,
          data: {
            orderId: booking.payment.razorpayOrderId,
            amount: amountPaise,
            currency: booking.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            bookingReference: booking.reference,
            paymentId: booking.payment.id,
          },
        });
        return;
      }
      if (booking.payment.razorpayPaymentId) {
        throw new AppError(409, 'This booking has an invalid payment order. Please contact support.');
      }
      // Existing local demo seeds used placeholder IDs. They are not provider orders;
      // replace them with a new server-created Test Mode order.
    }

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: booking.currency,
      receipt: booking.reference,
    });
    if (order.amount !== amountPaise || order.currency !== booking.currency) {
      throw new AppError(502, 'Razorpay returned an order with a mismatched amount or currency.');
    }

    const payment = await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        razorpayOrderId: order.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
      },
      update: {
        razorpayOrderId: order.id,
        razorpayPaymentId: null,
        razorpaySignature: null,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
        webhookVerified: false,
      },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingReference: booking.reference,
        paymentId: payment.id,
      },
    });
  } catch (err) { next(err); }
});

paymentsRouter.post('/verify', requireAuth, validateBody(VerifyPaymentSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!isRazorpayTestConfigured()) {
      throw new AppError(503, 'Razorpay Test Mode is not configured. Set the test key ID and secret.');
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
    if (!booking) throw new AppError(404, 'Booking not found.');
    if (booking.userId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
    if (!booking.payment || booking.payment.razorpayOrderId !== razorpayOrderId) {
      throw new AppError(400, 'Payment order does not match this booking.');
    }
    if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      throw new AppError(400, 'Payment verification failed. Invalid signature.');
    }

    const gatewayPayment = await getRazorpayInstance().payments.fetch(razorpayPaymentId);
    const expectedAmount = Math.round(booking.totalAmount * 100);
    if (!isCapturedRazorpayPayment(gatewayPayment, {
      orderId: booking.payment.razorpayOrderId,
      amount: expectedAmount,
      currency: booking.currency,
    })) {
      throw new AppError(409, 'Payment is not captured or does not match the booking amount, currency, and order.');
    }

    const result = await confirmPaidBooking({
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amountPaise: gatewayPayment.amount,
      currency: gatewayPayment.currency,
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

paymentsRouter.post('/webhook', async (req: Request, res: Response, next) => {
  try {
    if (!isRazorpayWebhookConfigured()) {
      res.status(400).json({ success: false, message: 'Razorpay Test Mode webhook is not configured.' });
      return;
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.body as Buffer;
    if (!verifyWebhookSignature(body, signature)) {
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
          amountPaise: paymentEntity.amount,
          currency: paymentEntity.currency,
          webhookVerified: true,
        });
      }
    }
    // A failed payment event describes one attempt. The Razorpay order remains retryable,
    // so keep the booking and its seat reservation pending until capture or explicit resolution.

    res.json({ received: true });
  } catch (err) { next(err); }
});
