import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

export const organizerRouter = Router();
organizerRouter.use(requireAuth, requireRole('ORGANIZER', 'ADMIN'));

// GET /api/organizer/dashboard
organizerRouter.get('/dashboard', async (req: AuthRequest, res: Response, next) => {
  try {
    const organizerId = req.user!.userId;
    const [totalEvents, bookingStats, attendanceStats, recentEvents] = await prisma.$transaction([
      prisma.event.count({ where: { organizerId } }),
      prisma.booking.aggregate({
        where: { event: { organizerId }, status: 'CONFIRMED' },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.checkIn.count({ where: { event: { organizerId } } }),
      prisma.event.findMany({
        where: { organizerId },
        take: 5,
        orderBy: { startDate: 'desc' },
        select: { id: true, title: true, startDate: true, status: true, bookedSeats: true, totalCapacity: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalEvents,
        totalBookings: bookingStats._count.id,
        totalRevenue: bookingStats._sum.totalAmount || 0,
        totalAttendance: attendanceStats,
        recentEvents,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/organizer/events
organizerRouter.get('/events', async (req: AuthRequest, res: Response, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { organizerId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        _count: { select: { bookings: true, reviews: true } },
      },
    });
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
});

// GET /api/organizer/events/:id/attendees
organizerRouter.get('/events/:id/attendees', async (req: AuthRequest, res: Response, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) { res.status(404).json({ success: false, message: 'Event not found.' }); return; }
    if (event.organizerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized.' }); return;
    }

    const bookings = await prisma.booking.findMany({
      where: { eventId: req.params.id, status: { in: ['CONFIRMED'] } },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        tickets: { select: { code: true, isCheckedIn: true } },
      },
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
});

// GET /api/organizer/events/:id/analytics
organizerRouter.get('/events/:id/analytics', async (req: AuthRequest, res: Response, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) { res.status(404).json({ success: false, message: 'Event not found.' }); return; }
    if (event.organizerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized.' }); return;
    }

    const [bookingsByDay, reviews, checkInCount] = await prisma.$transaction([
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "Booking" WHERE "eventId" = ${req.params.id} AND status = 'CONFIRMED'
        GROUP BY DATE("createdAt") ORDER BY date ASC
      `,
      prisma.review.findMany({ where: { eventId: req.params.id, moderationStatus: 'PUBLISHED' } }),
      prisma.checkIn.count({ where: { eventId: req.params.id } }),
    ]);

    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

    res.json({
      success: true,
      data: {
        bookingsByDay: bookingsByDay.map(d => ({ date: d.date.toISOString().split('T')[0], count: Number(d.count) })),
        occupancyRate: Math.round((event.bookedSeats / event.totalCapacity) * 100),
        checkInCount,
        checkInRate: event.bookedSeats > 0 ? Math.round((checkInCount / event.bookedSeats) * 100) : 0,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: reviews.length,
      },
    });
  } catch (err) { next(err); }
});
