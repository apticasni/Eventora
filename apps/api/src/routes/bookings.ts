import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { CreateBookingSchema, CancelBookingSchema } from '@eventora/shared';
import { sendBookingConfirmation, sendTicketDetails, sendCancellationConfirmation } from '../lib/email';
import { processWaitlist } from '../services/waitlist';
import { issueTicketsIfMissing } from '../services/tickets';
import { canAllocateSeats, getRazorpayInstance, isRazorpayOrderId, isRazorpayTestConfigured } from '../lib/razorpay';
import { isEventRegistrationOpen } from '../lib/eventEligibility';

export const bookingsRouter = Router();

bookingsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true, title: true, slug: true, coverImage: true,
            startDate: true, endDate: true, venueName: true, city: true, format: true,
            status: true,
          },
        },
        payment: { select: { status: true, razorpayPaymentId: true, amount: true } },
        tickets: { select: { id: true, code: true, seatNumber: true, isCheckedIn: true, qrCode: true } },
      },
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
});

bookingsRouter.post('/', requireAuth, validateBody(CreateBookingSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { eventId, seats } = req.body;
    const userId = req.user!.userId;

    const result = await prisma.$transaction(async (tx) => {
      const events = await tx.$queryRaw<Array<{
        id: string; title: string; start_date: Date; total_capacity: number; booked_seats: number; price: number; is_free: boolean; status: string;
      }>>`
        SELECT id, title, "startDate" as start_date, "totalCapacity" as total_capacity, "bookedSeats" as booked_seats, price, "isFree" as is_free, status
        FROM "Event" WHERE id = ${eventId} FOR UPDATE
      `;
      const event = events[0];
      if (!event) throw new AppError(404, 'Event not found.');
      if (event.status !== 'PUBLISHED') throw new AppError(400, 'This event is not open for registration.');
      if (!isEventRegistrationOpen(event.status, event.start_date)) {
        throw new AppError(400, 'Registration is closed for events that have started.');
      }

      const existing = await tx.booking.findUnique({
        where: { userId_eventId: { userId, eventId } },
        include: { payment: true },
      });
      if (existing && existing.status !== 'CANCELLED') {
        if (
          existing.status === 'PENDING' &&
          (!existing.payment || existing.payment.status === 'PENDING' || existing.payment.status === 'FAILED')
        ) {
          // Return the existing reservation without incrementing seats again. The payment
          // route reuses its Razorpay order so a dismissed or failed attempt can be retried.
          return {
            booking: existing,
            event,
            needsPayment: existing.totalAmount > 0,
            totalAmount: existing.totalAmount,
            tickets: [],
          };
        }
        throw new AppError(409, 'You already have a booking for this event.');
      }
      if (existing && existing.payment && existing.payment.status !== 'FAILED' && existing.payment.status !== 'REFUNDED') {
        throw new AppError(409, 'Your previous payment is still being processed. Please contact support before booking again.');
      }

      if (!canAllocateSeats(event.total_capacity, event.booked_seats, seats)) {
        throw new AppError(400, `Only ${Math.max(0, event.total_capacity - event.booked_seats)} seats available.`);
      }

      const totalAmount = event.is_free ? 0 : event.price * seats;
      const nextStatus = event.is_free ? 'CONFIRMED' : 'PENDING';

      let booking;
      if (existing && existing.status === 'CANCELLED') {
        booking = await tx.booking.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            seats,
            totalAmount,
            cancelledAt: null,
            cancellationReason: null,
          },
        });
      } else {
        booking = await tx.booking.create({
          data: { userId, eventId, seats, totalAmount, status: nextStatus },
        });
      }

      // Reserve seats immediately so concurrent checkouts cannot overbook.
      await tx.event.update({ where: { id: eventId }, data: { bookedSeats: { increment: seats } } });

      let tickets: Awaited<ReturnType<typeof issueTicketsIfMissing>> = [];
      if (event.is_free) {
        tickets = await issueTicketsIfMissing(tx, booking);
        await tx.inAppNotification.create({
          data: {
            userId,
            type: 'REGISTRATION_CONFIRMED',
            title: 'Registration confirmed',
            message: `Your registration for ${event.title} is confirmed. Your ticket is ready.`,
            link: '/dashboard/bookings',
            eventId,
            key: `booking-confirmed:${booking.id}:${booking.updatedAt.toISOString()}`,
          },
        });
      }

      return { booking, event, needsPayment: !event.is_free, totalAmount, tickets };
    });

    if (!result.needsPayment) {
      const fullEvent = await prisma.event.findUnique({ where: { id: eventId } });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (fullEvent && user) {
        sendBookingConfirmation(user.email, user.name, {
          title: fullEvent.title, startDate: fullEvent.startDate,
          venueName: fullEvent.venueName, city: fullEvent.city,
          seats: result.booking.seats, reference: result.booking.reference,
        }).catch(console.error);
        sendTicketDetails(user.email, user.name, result.tickets, {
          title: fullEvent.title, startDate: fullEvent.startDate,
          venueName: fullEvent.venueName, city: fullEvent.city,
        }).catch(console.error);
      }

      return res.status(201).json({
        success: true,
        data: { booking: result.booking, tickets: result.tickets, needsPayment: false },
        message: 'Booking confirmed!',
      });
    }

    res.status(201).json({
      success: true,
      data: { booking: result.booking, needsPayment: true, amount: result.totalAmount },
      message: 'Booking created. Please complete payment to confirm.',
    });
  } catch (err) { next(err); }
});

bookingsRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        payment: true,
        tickets: { include: { checkIn: { include: { staff: { select: { name: true } } } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!booking) throw new AppError(404, 'Booking not found.');
    if (booking.userId !== req.user!.userId && req.user!.role !== 'ADMIN') throw new AppError(403, 'Not authorized.');
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
});

bookingsRouter.post('/:id/cancel', requireAuth, validateBody(CancelBookingSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const initialBooking = await prisma.booking.findUnique({
      where: { id },
      include: { event: true, payment: true },
    });
    if (!initialBooking) throw new AppError(404, 'Booking not found.');
    if (initialBooking.userId !== req.user!.userId && req.user!.role !== 'ADMIN') throw new AppError(403, 'Not authorized.');
    if (initialBooking.status === 'CANCELLED' || initialBooking.status === 'REFUNDED') {
      throw new AppError(400, 'Booking is already cancelled.');
    }
    if (initialBooking.event.startDate < new Date()) throw new AppError(400, 'Cannot cancel a past event booking.');

    let finalStatus: 'CANCELLED' | 'REFUNDED' = 'CANCELLED';
    let providerRefundVerified = false;
    if (initialBooking.totalAmount > 0) {
      const payment = initialBooking.payment;
      if (!payment) {
        if (initialBooking.status !== 'PENDING') {
          throw new AppError(409, 'No payment record exists for this paid booking. Please contact support.');
        }
        // No Razorpay order exists yet, so a pending reservation can be cancelled safely.
      } else if (!isRazorpayOrderId(payment.razorpayOrderId) && !payment.razorpayPaymentId && payment.status !== 'REFUNDED') {
        // Legacy local demo rows contain placeholder order IDs that cannot be paid.
      } else if (!isRazorpayOrderId(payment.razorpayOrderId)) {
        throw new AppError(409, 'This booking has an invalid payment order. Please contact support.');
      } else if (payment.status === 'REFUNDED') {
        finalStatus = 'REFUNDED';
        providerRefundVerified = payment.webhookVerified;
      } else {
        if (!payment.razorpayPaymentId) {
          throw new AppError(409, 'Payment is still pending or retryable. Complete checkout before cancelling this booking.');
        }
        if (!isRazorpayTestConfigured()) {
          throw new AppError(503, 'Razorpay Test Mode is required to verify or refund this payment.');
        }
        const razorpay = getRazorpayInstance();
        const remotePayment = await razorpay.payments.fetch(payment.razorpayPaymentId);
        const expectedAmount = Math.round(initialBooking.totalAmount * 100);
        if (
          remotePayment.order_id !== payment.razorpayOrderId ||
          remotePayment.amount !== expectedAmount ||
          remotePayment.currency !== initialBooking.currency
        ) {
          throw new AppError(409, 'Razorpay payment does not match this booking. Please contact support.');
        }
        const amountAlreadyRefunded = remotePayment.amount_refunded || 0;
        if (amountAlreadyRefunded > expectedAmount) {
          throw new AppError(409, 'Razorpay reports a refund greater than the booking total. Please contact support.');
        }
        if (amountAlreadyRefunded < expectedAmount && remotePayment.status !== 'captured') {
          throw new AppError(409, 'Payment is not captured yet. Retry checkout or wait for its final status before cancelling.');
        }
        const amountToRefund = expectedAmount - amountAlreadyRefunded;
        if (amountToRefund > 0) {
          await razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: amountToRefund,
            notes: { booking_reference: initialBooking.reference, reason: reason || 'Booking cancelled' },
          });
        }
        finalStatus = 'REFUNDED';
        providerRefundVerified = true;
      }
    }

    const booking = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${initialBooking.eventId} FOR UPDATE`;
      const currentBooking = await tx.booking.findUnique({ where: { id }, include: { event: true, payment: true } });
      if (!currentBooking) throw new AppError(404, 'Booking not found.');
      if (currentBooking.status === 'CANCELLED' || currentBooking.status === 'REFUNDED') {
        return { ...currentBooking, shouldReleaseSeats: false, alreadyCancelled: true };
      }
      if (currentBooking.event.startDate < new Date()) throw new AppError(400, 'Cannot cancel a past event booking.');

      const shouldReleaseSeats = currentBooking.status === 'CONFIRMED' || currentBooking.status === 'PENDING';
      const cancelledBooking = await tx.booking.update({
        where: { id },
        data: { status: finalStatus, cancelledAt: new Date(), cancellationReason: reason || null },
      });
      if (finalStatus === 'REFUNDED') {
        await tx.payment.update({
          where: { bookingId: id },
          data: { status: 'REFUNDED', webhookVerified: providerRefundVerified || currentBooking.payment?.webhookVerified || false },
        });
      } else if (
        currentBooking.payment &&
        !currentBooking.payment.razorpayPaymentId &&
        !isRazorpayOrderId(currentBooking.payment.razorpayOrderId)
      ) {
        await tx.payment.update({
          where: { bookingId: id },
          data: { status: 'FAILED', webhookVerified: false },
        });
      }
      if (shouldReleaseSeats) {
        await tx.$executeRaw`
          UPDATE "Event"
          SET "bookedSeats" = GREATEST(0, "bookedSeats" - ${currentBooking.seats})
          WHERE id = ${currentBooking.eventId}
        `;
      }
      await tx.inAppNotification.create({
        data: {
          userId: currentBooking.userId,
          type: 'REGISTRATION_CANCELLED',
          title: 'Registration cancelled',
          message: `Your registration for ${currentBooking.event.title} has been cancelled.`,
          link: '/dashboard/bookings',
          eventId: currentBooking.eventId,
          key: `booking-cancelled:${currentBooking.id}:${cancelledBooking.updatedAt.toISOString()}`,
        },
      });
      return { ...currentBooking, ...cancelledBooking, shouldReleaseSeats, alreadyCancelled: false };
    });

    if (booking.shouldReleaseSeats) {
      processWaitlist(booking.eventId, booking.seats).catch(console.error);
    }

    const user = booking.alreadyCancelled ? null : await prisma.user.findUnique({ where: { id: booking.userId } });
    if (user) {
      sendCancellationConfirmation(user.email, user.name, { title: booking.event.title }, booking.reference).catch(console.error);
    }

    res.json({
      success: true,
      data: { status: booking.status },
      message: booking.status === 'REFUNDED'
        ? 'Booking cancelled and refund initiated through Razorpay.'
        : 'Booking cancelled successfully.',
    });
  } catch (err) { next(err); }
});
