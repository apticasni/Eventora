import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { CreateBookingSchema, CancelBookingSchema } from '@eventora/shared';
import { sendBookingConfirmation, sendTicketDetails, sendCancellationConfirmation } from '../lib/email';
import { processWaitlist } from '../services/waitlist';
import { issueTicketsIfMissing } from '../services/tickets';
import { canAllocateSeats } from '../lib/razorpay';

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
        id: string; total_capacity: number; booked_seats: number; price: number; is_free: boolean; status: string;
      }>>`
        SELECT id, "totalCapacity" as total_capacity, "bookedSeats" as booked_seats, price, "isFree" as is_free, status
        FROM "Event" WHERE id = ${eventId} FOR UPDATE
      `;
      const event = events[0];
      if (!event) throw new AppError(404, 'Event not found.');
      if (event.status !== 'PUBLISHED') throw new AppError(400, 'This event is not open for registration.');

      const existing = await tx.booking.findUnique({
        where: { userId_eventId: { userId, eventId } },
        include: { payment: true },
      });
      if (existing && existing.status !== 'CANCELLED') {
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

    const initialBooking = await prisma.booking.findUnique({ where: { id } });
    if (!initialBooking) throw new AppError(404, 'Booking not found.');
    if (initialBooking.userId !== req.user!.userId && req.user!.role !== 'ADMIN') throw new AppError(403, 'Not authorized.');

    const booking = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${initialBooking.eventId} FOR UPDATE`;
      const currentBooking = await tx.booking.findUnique({ where: { id }, include: { event: true } });
      if (!currentBooking) throw new AppError(404, 'Booking not found.');
      if (currentBooking.status === 'CANCELLED') throw new AppError(400, 'Booking is already cancelled.');
      if (currentBooking.event.startDate < new Date()) throw new AppError(400, 'Cannot cancel a past event booking.');

      const shouldReleaseSeats = currentBooking.status === 'CONFIRMED' || currentBooking.status === 'PENDING';
      const cancelledBooking = await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason || null },
      });
      if (shouldReleaseSeats) {
        await tx.$executeRaw`
          UPDATE "Event"
          SET "bookedSeats" = GREATEST(0, "bookedSeats" - ${currentBooking.seats})
          WHERE id = ${currentBooking.eventId}
        `;
      }
      return { ...currentBooking, ...cancelledBooking, shouldReleaseSeats };
    });

    if (booking.shouldReleaseSeats) {
      processWaitlist(booking.eventId, booking.seats).catch(console.error);
    }

    const user = await prisma.user.findUnique({ where: { id: booking.userId } });
    if (user) {
      sendCancellationConfirmation(user.email, user.name, { title: booking.event.title }, booking.reference).catch(console.error);
    }

    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (err) { next(err); }
});
