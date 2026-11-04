import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { SaveEventSchema } from '@eventora/shared';

export const savedEventsRouter = Router();
savedEventsRouter.use(requireAuth);

savedEventsRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const savedEvents = await prisma.savedEvent.findMany({
      where: { userId: req.user!.userId, event: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          include: {
            category: true,
            organizer: { select: { id: true, name: true, avatar: true, bio: true } },
            _count: { select: { reviews: true, bookings: true } },
          },
        },
      },
    });
    res.json({
      success: true,
      data: savedEvents.map(({ event, ...saved }) => ({
        ...saved,
        event: { ...event, availableSeats: event.totalCapacity - event.bookedSeats },
      })),
    });
  } catch (err) { next(err); }
});

savedEventsRouter.post('/', validateBody(SaveEventSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.body.eventId }, select: { id: true, status: true } });
    if (!event || event.status !== 'PUBLISHED') throw new AppError(404, 'Event not found.');
    const saved = await prisma.savedEvent.upsert({
      where: { userId_eventId: { userId: req.user!.userId, eventId: event.id } },
      create: { userId: req.user!.userId, eventId: event.id },
      update: {},
    });
    res.status(201).json({ success: true, data: saved, message: 'Event saved.' });
  } catch (err) { next(err); }
});

savedEventsRouter.delete('/:eventId', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.savedEvent.deleteMany({
      where: { userId: req.user!.userId, eventId: req.params.eventId },
    });
    res.json({ success: true, message: 'Event removed from saved events.' });
  } catch (err) { next(err); }
});
