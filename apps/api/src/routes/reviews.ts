import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { CreateReviewSchema } from '@eventora/shared';

export const reviewsRouter = Router();

// POST /api/reviews
reviewsRouter.post('/', requireAuth, validateBody(CreateReviewSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { eventId, rating, comment } = req.body;
    const userId = req.user!.userId;

    // Check if user attended the event (has a confirmed booking)
    const booking = await prisma.booking.findFirst({
      where: { userId, eventId, status: 'CONFIRMED' },
    });
    if (!booking) throw new AppError(403, 'You can only review events you have attended.');

    const existing = await prisma.review.findUnique({ where: { userId_eventId: { userId, eventId } } });
    if (existing) throw new AppError(409, 'You have already reviewed this event.');

    const review = await prisma.review.create({
      data: { userId, eventId, rating, comment },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json({ success: true, data: review, message: 'Review submitted successfully.' });
  } catch (err) { next(err); }
});

// GET /api/reviews/event/:eventId
reviewsRouter.get('/event/:eventId', async (req, res: Response, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { eventId: req.params.eventId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    res.json({ success: true, data: { reviews, average: avg ? Math.round(avg * 10) / 10 : null, total: reviews.length } });
  } catch (err) { next(err); }
});

// DELETE /api/reviews/:id
reviewsRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) throw new AppError(404, 'Review not found.');
    if (review.userId !== req.user!.userId && req.user!.role !== 'ADMIN') throw new AppError(403, 'Not authorized.');
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (err) { next(err); }
});
