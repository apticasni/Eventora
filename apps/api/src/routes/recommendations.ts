import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const recommendationsRouter = Router();

// GET /api/recommendations
recommendationsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { interests: true, bookings: { select: { event: { select: { categoryId: true } } }, take: 20, orderBy: { createdAt: 'desc' } } },
    });

    const bookedCategoryIds = user?.bookings.map(b => b.event.categoryId) || [];
    const interestCategories = user?.interests || [];

    // Find categories from interests
    const interestCatRows = interestCategories.length > 0
      ? await prisma.category.findMany({
          where: {
            OR: interestCategories.map((name) => ({
              name: { equals: name, mode: 'insensitive' as const },
            })),
          },
          select: { id: true },
        })
      : [];
    const interestCatIds = interestCatRows.map(c => c.id);

    // Combined preference category IDs (deduplicated)
    const preferredCategoryIds = [...new Set([...interestCatIds, ...bookedCategoryIds])];

    // Already booked event IDs
    const bookedEventIds = (await prisma.booking.findMany({
      where: { userId: req.user!.userId, status: { not: 'CANCELLED' } },
      select: { eventId: true },
    })).map(b => b.eventId);

    let events;
    if (preferredCategoryIds.length > 0) {
      events = await prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          startDate: { gte: new Date() },
          id: { notIn: bookedEventIds },
          categoryId: { in: preferredCategoryIds },
        },
        orderBy: { bookedSeats: 'desc' },
        take: 8,
        select: {
          id: true, title: true, slug: true, coverImage: true,
          startDate: true, price: true, isFree: true, city: true, format: true,
          totalCapacity: true, bookedSeats: true,
          category: { select: { id: true, name: true, slug: true, color: true } },
        },
      });
    } else {
      // Fallback: show featured/popular events
      events = await prisma.event.findMany({
        where: { status: 'PUBLISHED', startDate: { gte: new Date() }, id: { notIn: bookedEventIds } },
        orderBy: [{ isFeatured: 'desc' }, { bookedSeats: 'desc' }],
        take: 8,
        select: {
          id: true, title: true, slug: true, coverImage: true,
          startDate: true, price: true, isFree: true, city: true, format: true,
          totalCapacity: true, bookedSeats: true,
          category: { select: { id: true, name: true, slug: true, color: true } },
        },
      });
    }

    res.json({ success: true, data: events.map(e => ({ ...e, availableSeats: e.totalCapacity - e.bookedSeats })) });
  } catch (err) { next(err); }
});
