import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const certificatesRouter = Router();

// POST /api/certificates/generate/:bookingId
certificatesRouter.post('/generate/:bookingId', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { event: true },
    });
    if (!booking) throw new AppError(404, 'Booking not found.');
    if (booking.userId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
    if (booking.status !== 'CONFIRMED') throw new AppError(400, 'Only confirmed bookings qualify for certificates.');

    // Event must be in the past
    if (booking.event.endDate > new Date()) throw new AppError(400, 'Certificate available after the event ends.');

    const existing = await prisma.certificate.findUnique({
      where: { userId_eventId: { userId: req.user!.userId, eventId: booking.eventId } },
    });
    if (existing) return res.json({ success: true, data: existing, message: 'Certificate already issued.' });

    const certificate = await prisma.certificate.create({
      data: { userId: req.user!.userId, eventId: booking.eventId },
      include: {
        event: { select: { title: true, startDate: true, endDate: true } },
        user: { select: { name: true } },
      },
    });

    res.status(201).json({ success: true, data: certificate, message: 'Certificate generated successfully.' });
  } catch (err) { next(err); }
});

// GET /api/certificates/:code (public)
certificatesRouter.get('/verify/:code', async (req, res: Response, next) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { code: req.params.code },
      include: {
        user: { select: { name: true } },
        event: { select: { title: true, startDate: true, endDate: true } },
      },
    });
    if (!cert) throw new AppError(404, 'Certificate not found or invalid code.');
    res.json({ success: true, data: cert });
  } catch (err) { next(err); }
});

// GET /api/certificates (user's own)
certificatesRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const certs = await prisma.certificate.findMany({
      where: { userId: req.user!.userId },
      include: { event: { select: { id: true, title: true, startDate: true, instructorName: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    res.json({ success: true, data: certs });
  } catch (err) { next(err); }
});
