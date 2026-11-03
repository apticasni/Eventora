import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { issueTicketsIfMissing } from '../services/tickets';
import { sendBookingConfirmation, sendTicketDetails } from '../lib/email';

export const waitlistRouter = Router();

waitlistRouter.post('/join', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { eventId } = req.body;
    const userId = req.user!.userId;
    if (!eventId) throw new AppError(400, 'eventId is required.');

    const entry = await prisma.$transaction(async (tx) => {
      const events = await tx.$queryRaw<Array<{ id: string; total_capacity: number; booked_seats: number }>>`
        SELECT id, "totalCapacity" as total_capacity, "bookedSeats" as booked_seats
        FROM "Event" WHERE id = ${eventId} FOR UPDATE
      `;
      const event = events[0];
      if (!event) throw new AppError(404, 'Event not found.');
      if (event.total_capacity - event.booked_seats > 0) {
        throw new AppError(400, 'Seats are still available. Please book directly.');
      }

      const existing = await tx.waitlistEntry.findUnique({ where: { userId_eventId: { userId, eventId } } });
      if (existing && existing.status !== 'WITHDRAWN' && existing.status !== 'EXPIRED') {
        throw new AppError(409, 'You are already on the waitlist.');
      }

      const count = await tx.waitlistEntry.count({ where: { eventId, status: 'WAITING' } });
      if (existing) {
        return tx.waitlistEntry.update({
          where: { id: existing.id },
          data: { status: 'WAITING', position: count + 1, offeredAt: null, offerExpiresAt: null },
        });
      }
      return tx.waitlistEntry.create({
        data: { userId, eventId, position: count + 1 },
      });
    });

    res.status(201).json({ success: true, data: entry, message: `You are #${entry.position} on the waitlist.` });
  } catch (err) { next(err); }
});

waitlistRouter.delete('/leave', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { eventId } = req.body;
    const userId = req.user!.userId;

    const entry = await prisma.waitlistEntry.findUnique({ where: { userId_eventId: { userId, eventId } } });
    if (!entry) throw new AppError(404, 'Waitlist entry not found.');
    await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'WITHDRAWN' } });
    res.json({ success: true, message: 'You have been removed from the waitlist.' });
  } catch (err) { next(err); }
});

waitlistRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const entries = await prisma.waitlistEntry.findMany({
      where: { userId: req.user!.userId },
      include: { event: { select: { id: true, title: true, slug: true, startDate: true, coverImage: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: entries });
  } catch (err) { next(err); }
});

waitlistRouter.post('/claim/:entryId', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { entryId } = req.params;

    const claimed = await prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findUnique({ where: { id: entryId }, include: { event: true } });
      if (!entry) throw new AppError(404, 'Waitlist entry not found.');
      if (entry.userId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
      if (entry.status !== 'OFFERED') throw new AppError(400, 'No seat offer available.');
      if (entry.offerExpiresAt && entry.offerExpiresAt < new Date()) throw new AppError(400, 'Offer has expired.');
      if (!entry.event.isFree) throw new AppError(400, 'This is a paid event. Use the paid claim flow.');

      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${entry.eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id: entry.eventId } });
      if (!event) throw new AppError(404, 'Event not found.');
      if (event.totalCapacity - event.bookedSeats < 1) {
        throw new AppError(400, 'The offered seat is no longer available.');
      }

      await tx.waitlistEntry.update({ where: { id: entryId }, data: { status: 'CONFIRMED' } });

      const existing = await tx.booking.findUnique({
        where: { userId_eventId: { userId: entry.userId, eventId: entry.eventId } },
      });

      let booking;
      if (existing && existing.status === 'CANCELLED') {
        booking = await tx.booking.update({
          where: { id: existing.id },
          data: { status: 'CONFIRMED', seats: 1, totalAmount: 0, cancelledAt: null, cancellationReason: null },
        });
      } else if (existing) {
        throw new AppError(409, 'You already have a booking for this event.');
      } else {
        booking = await tx.booking.create({
          data: { userId: entry.userId, eventId: entry.eventId, seats: 1, totalAmount: 0, status: 'CONFIRMED' },
        });
      }

      await tx.event.update({ where: { id: entry.eventId }, data: { bookedSeats: { increment: 1 } } });
      const tickets = await issueTicketsIfMissing(tx, booking);
      return { booking, tickets, event };
    });

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (user) {
      sendBookingConfirmation(user.email, user.name, {
        title: claimed.event.title, startDate: claimed.event.startDate,
        venueName: claimed.event.venueName, city: claimed.event.city,
        seats: 1, reference: claimed.booking.reference,
      }).catch(console.error);
      sendTicketDetails(user.email, user.name, claimed.tickets, {
        title: claimed.event.title, startDate: claimed.event.startDate,
        venueName: claimed.event.venueName, city: claimed.event.city,
      }).catch(console.error);
    }

    res.json({ success: true, data: claimed, message: 'Seat claimed successfully! Your booking is confirmed.' });
  } catch (err) { next(err); }
});
