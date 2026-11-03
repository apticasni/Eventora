import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/admin/dashboard
adminRouter.get('/dashboard', async (_req, res: Response, next) => {
  try {
    const [totalUsers, totalEvents, bookingStats, totalAttendance, recentRegistrations] = await prisma.$transaction([
      prisma.user.count(),
      prisma.event.count(),
      prisma.booking.aggregate({ _count: { id: true }, _sum: { totalAmount: true }, where: { status: 'CONFIRMED' } }),
      prisma.checkIn.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalEvents,
        totalBookings: bookingStats._count.id,
        totalRevenue: bookingStats._sum.totalAmount || 0,
        totalAttendance,
        recentRegistrations,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/admin/users
adminRouter.get('/users', async (req, res: Response, next) => {
  try {
    const { q, role, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
    if (role) where.role = role;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, avatar: true, isVerified: true, createdAt: true, _count: { select: { bookings: true, organizedEvents: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ success: true, data: { users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id/role
adminRouter.put('/users/:id/role', async (req, res: Response, next) => {
  try {
    const { role } = req.body;
    if (!['ATTENDEE', 'ORGANIZER', 'ADMIN'].includes(role)) throw new AppError(400, 'Invalid role.');
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role }, select: { id: true, name: true, email: true, role: true } });
    res.json({ success: true, data: user, message: 'User role updated.' });
  } catch (err) { next(err); }
});

// GET /api/admin/events
adminRouter.get('/events', async (req, res: Response, next) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' } : {};
    const [events, total] = await prisma.$transaction([
      prisma.event.findMany({
        where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, slug: true, status: true, startDate: true, totalCapacity: true, bookedSeats: true, price: true, isFree: true, createdAt: true, organizer: { select: { name: true, email: true } }, category: { select: { name: true } }, _count: { select: { bookings: true } } },
      }),
      prisma.event.count({ where }),
    ]);
    res.json({ success: true, data: { events, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// GET /api/admin/bookings
adminRouter.get('/bookings', async (req, res: Response, next) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status: status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' } : {};
    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { title: true, startDate: true } },
          payment: { select: { status: true, razorpayPaymentId: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);
    res.json({ success: true, data: { bookings, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// GET /api/admin/analytics/registrations
adminRouter.get('/analytics/registrations', async (_req, res: Response, next) => {
  try {
    const data = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Booking"
      WHERE status = 'CONFIRMED' AND "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt") ORDER BY date ASC
    `;
    res.json({ success: true, data: data.map(d => ({ date: d.date.toISOString().split('T')[0], count: Number(d.count) })) });
  } catch (err) { next(err); }
});

// GET /api/admin/analytics/revenue
adminRouter.get('/analytics/revenue', async (_req, res: Response, next) => {
  try {
    const data = await prisma.$queryRaw<Array<{ date: Date; revenue: number }>>`
      SELECT DATE("createdAt") as date, SUM("totalAmount") as revenue
      FROM "Booking"
      WHERE status = 'CONFIRMED' AND "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt") ORDER BY date ASC
    `;
    res.json({ success: true, data: data.map(d => ({ date: d.date.toISOString().split('T')[0], revenue: Number(d.revenue) })) });
  } catch (err) { next(err); }
});

// GET /api/admin/analytics/categories
adminRouter.get('/analytics/categories', async (_req, res: Response, next) => {
  try {
    const data = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT c.name, COUNT(b.id) as count
      FROM "Category" c
      LEFT JOIN "Event" e ON e."categoryId" = c.id
      LEFT JOIN "Booking" b ON b."eventId" = e.id AND b.status = 'CONFIRMED'
      GROUP BY c.name ORDER BY count DESC
    `;
    res.json({ success: true, data: data.map(d => ({ name: d.name, count: Number(d.count) })) });
  } catch (err) { next(err); }
});

// GET /api/admin/export/attendees/:eventId
adminRouter.get('/export/attendees/:eventId', async (req, res: Response, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { eventId: req.params.eventId, status: 'CONFIRMED' },
      include: { user: { select: { name: true, email: true } }, tickets: { select: { code: true, isCheckedIn: true } } },
    });
    const csv = ['Name,Email,Seats,Reference,Checked In,Ticket Codes'];
    bookings.forEach(b => {
      const checkedIn = b.tickets.filter(t => t.isCheckedIn).length;
      const codes = b.tickets.map(t => t.code).join('|');
      csv.push(`"${b.user.name}","${b.user.email}",${b.seats},${b.reference},${checkedIn}/${b.seats},"${codes}"`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendees-${req.params.eventId}.csv"`);
    res.send(csv.join('\n'));
  } catch (err) { next(err); }
});

// GET /api/admin/export/bookings
adminRouter.get('/export/bookings', async (_req, res: Response, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const csv = ['Reference,User Name,User Email,Event,Seats,Amount,Status,Created'];
    bookings.forEach(b => {
      csv.push(`${b.reference},"${b.user.name}","${b.user.email}","${b.event.title}",${b.seats},${b.totalAmount},${b.status},${b.createdAt.toISOString()}`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
    res.send(csv.join('\n'));
  } catch (err) { next(err); }
});

// GET /api/admin/checkins
adminRouter.get('/checkins', async (req, res: Response, next) => {
  try {
    const { eventId } = req.query as Record<string, string>;
    const where = eventId ? { eventId } : {};
    const checkins = await prisma.checkIn.findMany({
      where,
      orderBy: { checkedInAt: 'desc' },
      take: 100,
      include: {
        ticket: { include: { booking: { include: { user: { select: { name: true, email: true } } } } } },
        staff: { select: { name: true } },
        event: { select: { title: true } },
      },
    });
    res.json({ success: true, data: checkins });
  } catch (err) { next(err); }
});
