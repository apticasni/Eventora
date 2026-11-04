import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { checkInTicket } from '../services/checkIn';

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
    const input = z.object({ method: z.enum(['QR', 'Manual']).default('QR') }).safeParse(req.body || {});
    if (!input.success) throw new AppError(400, 'Check-in method must be QR or Manual.');
    const result = await checkInTicket(req.params.code, {
      id: req.user!.userId,
      role: req.user!.role,
    }, input.data.method);
    res.json({
      success: true,
      data: result,
      message: result.status === 'checked_in' ? 'Check-in successful!' : 'Ticket could not be checked in.',
    });
  } catch (err) { next(err); }
});
