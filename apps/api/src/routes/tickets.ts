import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export const ticketsRouter = Router();

ticketsRouter.get('/booking/:bookingId', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError(404, 'Booking not found.');
    if (booking.userId !== req.user!.userId && req.user!.role !== 'ADMIN') throw new AppError(403, 'Not authorized.');

    const tickets = await prisma.ticket.findMany({
      where: { bookingId },
      include: { checkIn: { include: { staff: { select: { name: true } } } } },
    });
    res.json({ success: true, data: tickets });
  } catch (err) { next(err); }
});

ticketsRouter.get('/:code', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { code: req.params.code },
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            event: { select: { id: true, title: true, startDate: true, endDate: true, venueName: true, city: true, format: true, organizerId: true } },
          },
        },
        checkIn: { include: { staff: { select: { name: true } } } },
      },
    });
    if (!ticket) throw new AppError(404, 'Ticket not found.');

    const isOwner = ticket.booking.userId === req.user!.userId;
    const isOrganizer = ticket.booking.event.organizerId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isOwner && !isOrganizer && !isAdmin) throw new AppError(403, 'Not authorized.');

    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
});

ticketsRouter.post('/:code/checkin', requireAuth, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { code: req.params.code },
      include: { booking: { include: { event: true, user: { select: { name: true, email: true, avatar: true } } } } },
    });
    if (!ticket) throw new AppError(404, 'Ticket not found.');
    if (ticket.isCheckedIn) throw new AppError(400, 'Ticket has already been checked in.');
    if (ticket.booking.status !== 'CONFIRMED') throw new AppError(400, 'Booking is not confirmed.');

    const isAdmin = req.user!.role === 'ADMIN';
    const isOrganizer = ticket.booking.event.organizerId === req.user!.userId;
    if (!isAdmin && !isOrganizer) throw new AppError(403, 'You can only check in attendees for your own events.');

    try {
      const checkIn = await prisma.$transaction(async (tx) => {
        const locked = await tx.ticket.findUnique({ where: { id: ticket.id } });
        if (!locked || locked.isCheckedIn) throw new AppError(400, 'Ticket has already been checked in.');
        await tx.ticket.update({ where: { id: ticket.id }, data: { isCheckedIn: true } });
        return tx.checkIn.create({
          data: {
            ticketId: ticket.id,
            eventId: ticket.booking.eventId,
            staffId: req.user!.userId,
            method: req.body.method || 'QR',
          },
          include: { staff: { select: { name: true } } },
        });
      });

      res.json({ success: true, data: { ticket, checkIn }, message: 'Check-in successful!' });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(400, 'Ticket has already been checked in.');
      }
      throw err;
    }
  } catch (err) { next(err); }
});
