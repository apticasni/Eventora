import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, optionalAuth, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { CreateEventSchema, UpdateEventSchema, SearchEventsSchema } from '@eventora/shared';
import { resolveIsFree } from '../lib/eventPricing';

export const eventsRouter = Router();

const eventSelect = {
  id: true, title: true, slug: true, description: true, shortDescription: true,
  coverImage: true, images: true, status: true, format: true,
  startDate: true, endDate: true, timezone: true,
  venueName: true, venueAddress: true, city: true, state: true, country: true, onlineLink: true,
  totalCapacity: true, bookedSeats: true, price: true, currency: true, isFree: true,
  instructorName: true, instructorBio: true, instructorAvatar: true,
  tags: true, schedule: true, requirements: true, whatYouLearn: true,
  isFeatured: true, viewCount: true, createdAt: true, updatedAt: true,
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  organizer: { select: { id: true, name: true, avatar: true, bio: true } },
  _count: { select: { reviews: true, bookings: true } },
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
    '-' + Math.random().toString(36).slice(2, 6);
}

// GET /api/events
eventsRouter.get('/', optionalAuth, validateQuery(SearchEventsSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { q, category, format, city, isFree, minPrice, maxPrice, startDate, endDate, sortBy, page, limit, status } = req.query as Record<string, string>;
    const skip = (parseInt(page || '1') - 1) * parseInt(limit || '12');
    const take = parseInt(limit || '12');

    const where: Record<string, unknown> = {
      status: req.user?.role === 'ADMIN' && status ? status : 'PUBLISHED',
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { instructorName: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: [q] } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (category) where.category = { slug: category };
    if (format) where.format = format;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (isFree === 'true') where.isFree = true;
    if (minPrice) where.price = { ...((where.price as object) || {}), gte: parseFloat(minPrice) };
    if (maxPrice) where.price = { ...((where.price as object) || {}), lte: parseFloat(maxPrice) };
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { ...((where.endDate as object) || {}), lte: new Date(endDate) };

    const orderBy: Record<string, unknown> =
      sortBy === 'popularity' ? { bookedSeats: 'desc' } :
      sortBy === 'price' ? { price: 'asc' } :
      sortBy === 'price_desc' ? { price: 'desc' } :
      { startDate: 'asc' };

    const [items, total] = await prisma.$transaction([
      prisma.event.findMany({ where, orderBy, skip, take, select: eventSelect }),
      prisma.event.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map(e => ({ ...e, availableSeats: e.totalCapacity - e.bookedSeats })),
        total,
        page: parseInt(page || '1'),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/events/featured
eventsRouter.get('/featured', async (_req, res: Response, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      orderBy: { startDate: 'asc' },
      take: 6,
      select: eventSelect,
    });
    res.json({ success: true, data: events.map(e => ({ ...e, availableSeats: e.totalCapacity - e.bookedSeats })) });
  } catch (err) { next(err); }
});

// GET /api/events/categories
eventsRouter.get('/categories', async (_req, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { events: { where: { status: 'PUBLISHED' } } } } },
    });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

// GET /api/events/:slug
eventsRouter.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { slug } = req.params;
    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        ...eventSelect,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, rating: true, comment: true, createdAt: true,
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });
    if (!event) throw new AppError(404, 'Event not found.');
    if (event.status !== 'PUBLISHED') {
      if (!req.user || (req.user.role !== 'ADMIN' && req.user.userId !== event.organizer.id)) {
        throw new AppError(404, 'Event not found.');
      }
    }

    // Increment view count (non-blocking)
    prisma.event.update({ where: { id: event.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    const avgRating = event.reviews.length > 0
      ? event.reviews.reduce((sum, r) => sum + r.rating, 0) / event.reviews.length
      : null;

    res.json({
      success: true,
      data: {
        ...event,
        availableSeats: event.totalCapacity - event.bookedSeats,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: event._count.reviews,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/events
eventsRouter.post('/', requireAuth, requireRole('ORGANIZER', 'ADMIN'), validateBody(CreateEventSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = req.body;
    const slug = slugify(data.title);
    const event = await prisma.event.create({
      data: {
        ...data,
        slug,
        organizerId: req.user!.userId,
        isFree: resolveIsFree(false, { price: data.price, isFree: data.isFree }),
        isFeatured: req.user!.role === 'ADMIN' ? !!data.isFeatured : false,
      },
      select: eventSelect,
    });
    res.status(201).json({ success: true, data: { ...event, availableSeats: event.totalCapacity - event.bookedSeats }, message: 'Event created successfully' });
  } catch (err) { next(err); }
});

// PUT /api/events/:id
eventsRouter.put('/:id', requireAuth, requireRole('ORGANIZER', 'ADMIN'), validateBody(UpdateEventSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new AppError(404, 'Event not found.');
    if (req.user!.role !== 'ADMIN' && event.organizerId !== req.user!.userId) throw new AppError(403, 'Not authorized.');

    const { isFeatured, ...rest } = req.body;
    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...rest,
        isFree: resolveIsFree(event.isFree, { price: req.body.price, isFree: req.body.isFree }),
        ...(req.user!.role === 'ADMIN' ? { isFeatured } : {}),
      },
      select: eventSelect,
    });
    res.json({ success: true, data: { ...updated, availableSeats: updated.totalCapacity - updated.bookedSeats } });
  } catch (err) { next(err); }
});

// DELETE /api/events/:id
eventsRouter.delete('/:id', requireAuth, requireRole('ORGANIZER', 'ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new AppError(404, 'Event not found.');
    if (req.user!.role !== 'ADMIN' && event.organizerId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
    const confirmedCount = await prisma.booking.count({ where: { eventId: id, status: { in: ['CONFIRMED', 'PENDING'] } } });
    if (confirmedCount > 0) {
      throw new AppError(400, 'Cannot delete an event with existing bookings. Unpublish or cancel it instead.');
    }
    await prisma.event.delete({ where: { id } });
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) { next(err); }
});

// POST /api/events/:id/publish
eventsRouter.post('/:id/publish', requireAuth, requireRole('ORGANIZER', 'ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new AppError(404, 'Event not found.');
    if (req.user!.role !== 'ADMIN' && event.organizerId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
    await prisma.event.update({ where: { id }, data: { status: 'PUBLISHED' } });
    res.json({ success: true, message: 'Event published successfully' });
  } catch (err) { next(err); }
});

// POST /api/events/:id/unpublish
eventsRouter.post('/:id/unpublish', requireAuth, requireRole('ORGANIZER', 'ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new AppError(404, 'Event not found.');
    if (req.user!.role !== 'ADMIN' && event.organizerId !== req.user!.userId) throw new AppError(403, 'Not authorized.');
    await prisma.event.update({ where: { id }, data: { status: 'DRAFT' } });
    res.json({ success: true, message: 'Event unpublished successfully' });
  } catch (err) { next(err); }
});
