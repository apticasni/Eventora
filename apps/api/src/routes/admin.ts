import { Router, Response } from 'express';
import { Prisma, ReviewModerationStatus, WaitlistStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createCsv, parseAdminDateRange, parsePage, waitlistAvailableSeats } from '../lib/adminTools';
import { getSmtpConfig } from '../lib/emailConfig';
import { sendWaitlistOffer } from '../lib/email';
import { writeAuditLog } from '../services/auditLog';
import { checkInTicket } from '../services/checkIn';
import { isRazorpayTestConfigured } from '../lib/razorpay';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

const reasonSchema = z.string().trim().min(8).max(500);
const roleSchema = z.object({
  role: z.enum(['ATTENDEE', 'ORGANIZER', 'ADMIN']),
  reason: reasonSchema,
});
const statusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
  reason: reasonSchema,
});
const suspensionSchema = z.object({
  suspended: z.boolean(),
  reason: reasonSchema,
});
const reviewSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN', 'REMOVED']),
  reason: reasonSchema,
});
const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(60).optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
const categoryUpdateSchema = categorySchema.partial().refine((value) => Object.keys(value).length > 0);

function queryString(value: unknown, maxLength = 100): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || undefined;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], name: string): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new AppError(400, `Invalid ${name} filter.`);
  }
  return value as T;
}

function setCsvHeaders(res: Response, filename: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
}

// GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
adminRouter.get('/dashboard', async (req, res: Response, next) => {
  try {
    const range = parseAdminDateRange(req.query);
    const now = new Date();
    const activeWaitlistWhere = {
      OR: [
        { status: 'WAITING' as const },
        { status: 'OFFERED' as const, OR: [{ offerExpiresAt: null }, { offerExpiresAt: { gt: now } }] },
      ],
    };
    const [
      totalUsers,
      userRoles,
      totalEvents,
      eventStatuses,
      bookings,
      bookingStatuses,
      proposalsPending,
      activeWaitlist,
      confirmedPayments,
      refundedPayments,
      attendance,
      registrationsSeries,
      revenueSeries,
      eventActivity,
      categories,
      recentAudit,
      recentBookings,
      failedPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.event.count(),
      prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.booking.aggregate({
        _count: { id: true },
        _sum: { seats: true },
      }),
      prisma.booking.groupBy({ by: ['status'], _count: { _all: true }, _sum: { seats: true } }),
      prisma.proposal.count({ where: { status: 'PENDING' } }),
      prisma.waitlistEntry.count({ where: activeWaitlistWhere }),
      prisma.payment.aggregate({
        where: { status: 'CAPTURED', webhookVerified: true },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'REFUNDED', webhookVerified: true },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.checkIn.count(),
      prisma.$queryRaw<Array<{ date: Date; count: bigint; seats: bigint }>>`
        SELECT DATE("createdAt") AS date, COUNT(*) AS count, COALESCE(SUM(seats), 0) AS seats
        FROM "Booking"
        WHERE status = 'CONFIRMED' AND "createdAt" >= ${range.start} AND "createdAt" <= ${range.end}
        GROUP BY DATE("createdAt") ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; gross: Prisma.Decimal; refunds: Prisma.Decimal }>>`
        SELECT DATE(CASE WHEN status = 'REFUNDED' THEN "updatedAt" ELSE "createdAt" END) AS date,
          COALESCE(SUM(CASE WHEN status = 'CAPTURED' THEN amount ELSE 0 END), 0) AS gross,
          COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END), 0) AS refunds
        FROM "Payment"
        WHERE "webhookVerified" = TRUE
          AND status IN ('CAPTURED', 'REFUNDED')
          AND (CASE WHEN status = 'REFUNDED' THEN "updatedAt" ELSE "createdAt" END) >= ${range.start}
          AND (CASE WHEN status = 'REFUNDED' THEN "updatedAt" ELSE "createdAt" END) <= ${range.end}
        GROUP BY DATE(CASE WHEN status = 'REFUNDED' THEN "updatedAt" ELSE "createdAt" END)
        ORDER BY date ASC
      `,
      prisma.event.groupBy({
        by: ['status'],
        where: { createdAt: { gte: range.start, lte: range.end } },
        _count: { _all: true },
      }),
      prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              events: true,
            },
          },
          events: {
            select: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } } },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, action: true, entityType: true, entityId: true, reason: true, createdAt: true, actor: { select: { name: true } } },
      }),
      prisma.booking.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, reference: true, status: true, createdAt: true, user: { select: { name: true } }, event: { select: { title: true } } },
      }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
    ]);

    const roleCounts = Object.fromEntries(userRoles.map((item) => [item.role, item._count._all]));
    const eventCounts = Object.fromEntries(eventStatuses.map((item) => [item.status, item._count._all]));
    const bookingCounts = Object.fromEntries(bookingStatuses.map((item) => [item.status, item._count._all]));
    const confirmedBookingGroup = bookingStatuses.find((item) => item.status === 'CONFIRMED');
    const grossRevenue = confirmedPayments._sum.amount || 0;
    const refunds = refundedPayments._sum.amount || 0;
    const activities = [
      ...recentAudit.map((item) => ({
        id: item.id,
        type: 'ADMIN_ACTION',
        title: item.action.replace(/_/g, ' ').toLowerCase(),
        detail: `${item.actor?.name || 'Former administrator'} · ${item.entityType}`,
        at: item.createdAt,
      })),
      ...recentBookings.map((item) => ({
        id: `booking-${item.id}`,
        type: 'BOOKING',
        title: `Booking ${item.status.toLowerCase()}`,
        detail: `${item.user.name} · ${item.event.title}`,
        at: item.createdAt,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10);

    res.json({
      success: true,
      data: {
        range: { from: range.start.toISOString().slice(0, 10), to: range.end.toISOString().slice(0, 10) },
        totals: {
          totalUsers,
          organizers: roleCounts.ORGANIZER || 0,
          attendees: roleCounts.ATTENDEE || 0,
          admins: roleCounts.ADMIN || 0,
          totalEvents,
          publishedEvents: eventCounts.PUBLISHED || 0,
          totalBookings: bookings._count.id,
          confirmedBookings: bookingCounts.CONFIRMED || 0,
          confirmedSeats: confirmedBookingGroup?._sum.seats || 0,
          pendingBookings: bookingCounts.PENDING || 0,
          pendingApprovals: proposalsPending,
          activeWaitlists: activeWaitlist,
          totalAttendance: attendance,
          grossRevenue,
          refunds,
          netRevenue: grossRevenue - refunds,
          fees: null,
          feeStatus: 'UNAVAILABLE_NOT_TRACKED',
          verifiedCapturedPayments: confirmedPayments._count.id,
          verifiedRefunds: refundedPayments._count.id,
          failedPayments: failedPayments,
        },
        registrations: registrationsSeries.map((item) => ({
          date: item.date.toISOString().slice(0, 10),
          count: Number(item.count),
          seats: Number(item.seats),
        })),
        revenue: revenueSeries.map((item) => ({
          date: item.date.toISOString().slice(0, 10),
          gross: Number(item.gross),
          refunds: Number(item.refunds),
          net: Number(item.gross) - Number(item.refunds),
        })),
        eventActivity: eventActivity.map((item) => ({ status: item.status, count: item._count._all })),
        categories: categories.map((item) => ({
          id: item.id,
          name: item.name,
          events: item._count.events,
          confirmedBookings: item.events.reduce((sum, event) => sum + event._count.bookings, 0),
        })),
        recentActivity: activities,
        alerts: [
          ...(proposalsPending ? [{ type: 'APPROVALS', count: proposalsPending, label: 'Proposals need review' }] : []),
          ...(activeWaitlist ? [{ type: 'WAITLIST', count: activeWaitlist, label: 'Active waitlist entries' }] : []),
          ...(failedPayments ? [{ type: 'PAYMENTS', count: failedPayments, label: 'Failed payment records' }] : []),
        ],
        revenueNote: 'Revenue includes only webhook-verified captured and refunded payment records. Platform fees are not tracked by the current payment model.',
      },
    });
  } catch (err) { next(err); }
});

adminRouter.get('/users', async (req, res: Response, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100_000);
    const limit = parsePage(req.query.limit, 20, 100);
    const role = enumValue(req.query.role, ['ATTENDEE', 'ORGANIZER', 'ADMIN'] as const, 'role');
    const status = enumValue(req.query.status, ['ACTIVE', 'SUSPENDED'] as const, 'status');
    const sortBy = enumValue(req.query.sortBy, ['createdAt', 'name'] as const, 'sort');
    const sortOrder = enumValue(req.query.sortOrder, ['asc', 'desc'] as const, 'sort order') || 'desc';
    const q = queryString(req.query.q);
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(status === 'ACTIVE' ? { suspendedAt: null } : status === 'SUSPENDED' ? { suspendedAt: { not: null } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
    };
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy || 'createdAt']: sortOrder },
        select: {
          id: true, name: true, email: true, role: true, avatar: true, bio: true, phone: true, interests: true,
          isVerified: true, suspendedAt: true, suspensionReason: true, createdAt: true,
          _count: { select: { bookings: true, organizedEvents: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ success: true, data: { users, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

adminRouter.get('/users/:id', async (req, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, avatar: true, bio: true, phone: true,
        interests: true, isVerified: true, suspendedAt: true, suspensionReason: true, createdAt: true,
        bookings: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, reference: true, status: true, seats: true, totalAmount: true, currency: true, createdAt: true,
            event: { select: { id: true, title: true, startDate: true } },
            payment: { select: { status: true, amount: true, currency: true } },
            tickets: { select: { code: true, isCheckedIn: true } },
          },
        },
        organizedEvents: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, slug: true, status: true, startDate: true, bookedSeats: true, totalCapacity: true, _count: { select: { bookings: true } } },
        },
      },
    });
    if (!user) throw new AppError(404, 'User not found.');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

adminRouter.put('/users/:id/role', async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'A valid role and reason are required.');
    if (req.params.id === req.user!.userId) throw new AppError(400, 'Administrators cannot change their own role.');
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'ADMIN' FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: req.params.id } });
      if (!current) throw new AppError(404, 'User not found.');
      if (current.role === 'ADMIN' && parsed.data.role !== 'ADMIN') {
        const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', suspendedAt: null } });
        if (activeAdmins <= 1) throw new AppError(409, 'The last active administrator cannot be demoted.');
      }
      const updatedUser = await tx.user.update({ where: { id: current.id }, data: { role: parsed.data.role } });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: current.id,
        reason: parsed.data.reason,
        beforeData: { role: current.role },
        afterData: { role: updatedUser.role },
      });
      return updatedUser;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.json({ success: true, data: { id: updated.id, name: updated.name, email: updated.email, role: updated.role }, message: 'User role updated.' });
  } catch (err) { next(err); }
});

adminRouter.patch('/users/:id/suspension', async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = suspensionSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'A suspension action and reason are required.');
    if (req.params.id === req.user!.userId) throw new AppError(400, 'Administrators cannot suspend or reactivate their own account.');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'ADMIN' FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: req.params.id } });
      if (!current) throw new AppError(404, 'User not found.');
      if (Boolean(current.suspendedAt) === parsed.data.suspended) {
        throw new AppError(409, parsed.data.suspended ? 'Account is already suspended.' : 'Account is already active.');
      }
      if (parsed.data.suspended && current.role === 'ADMIN') {
        const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', suspendedAt: null } });
        if (activeAdmins <= 1) throw new AppError(409, 'The last active administrator cannot be suspended.');
      }
      const updatedUser = await tx.user.update({
        where: { id: current.id },
        data: parsed.data.suspended
          ? { suspendedAt: new Date(), suspensionReason: parsed.data.reason }
          : { suspendedAt: null, suspensionReason: null },
      });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: parsed.data.suspended ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        entityType: 'User',
        entityId: current.id,
        reason: parsed.data.reason,
        beforeData: { suspended: Boolean(current.suspendedAt) },
        afterData: { suspended: Boolean(updatedUser.suspendedAt) },
      });
      return updatedUser;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.json({ success: true, data: { id: result.id, suspendedAt: result.suspendedAt }, message: parsed.data.suspended ? 'Account suspended.' : 'Account reactivated.' });
  } catch (err) { next(err); }
});

adminRouter.get('/events', async (req, res: Response, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100_000);
    const limit = parsePage(req.query.limit, 20, 100);
    const status = enumValue(req.query.status, ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const, 'event status');
    const format = enumValue(req.query.format, ['IN_PERSON', 'ONLINE', 'HYBRID'] as const, 'event format');
    const q = queryString(req.query.q);
    const organizerId = queryString(req.query.organizerId, 100);
    const categoryId = queryString(req.query.categoryId, 100);
    const city = queryString(req.query.city);
    const from = queryString(req.query.from, 10);
    const to = queryString(req.query.to, 10);
    const sortBy = enumValue(req.query.sortBy, ['createdAt', 'startDate', 'title', 'bookedSeats'] as const, 'sort');
    const sortOrder = enumValue(req.query.sortOrder, ['asc', 'desc'] as const, 'sort order') || 'desc';
    const range = from || to ? parseAdminDateRange({ ...(from ? { from } : {}), ...(to ? { to } : {}) }) : undefined;
    const where: Prisma.EventWhereInput = {
      ...(status ? { status } : {}),
      ...(format ? { format } : {}),
      ...(organizerId ? { organizerId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      ...(range ? { startDate: { gte: range.start, lte: range.end } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy || 'createdAt']: sortOrder },
        include: {
          organizer: { select: { id: true, name: true, email: true, suspendedAt: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { bookings: true, reviews: { where: { moderationStatus: 'PUBLISHED' } } } },
        },
      }),
      prisma.event.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

adminRouter.patch('/events/:id/status', async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'A valid event status and reason are required.');
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.event.findUnique({ where: { id: req.params.id } });
      if (!current) throw new AppError(404, 'Event not found.');
      if (current.status === 'COMPLETED' || current.status === 'CANCELLED') {
        throw new AppError(409, 'Completed or cancelled events cannot be republished or changed.');
      }
      if (parsed.data.status === 'PUBLISHED') {
        if (current.endDate <= new Date()) throw new AppError(400, 'A past event cannot be published.');
        if (current.bookedSeats > current.totalCapacity) throw new AppError(409, 'Event capacity is inconsistent; resolve bookings before publishing.');
      }
      const updatedEvent = await tx.event.update({ where: { id: current.id }, data: { status: parsed.data.status } });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'EVENT_STATUS_CHANGED',
        entityType: 'Event',
        entityId: current.id,
        reason: parsed.data.reason,
        beforeData: { status: current.status },
        afterData: { status: updatedEvent.status },
      });
      return updatedEvent;
    });
    res.json({ success: true, data: result, message: `Event status changed to ${result.status}.` });
  } catch (err) { next(err); }
});

adminRouter.get('/categories', async (_req, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { events: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

adminRouter.post('/categories', async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'Category details are invalid.');
    const reason = typeof req.body.reason === 'string' ? reasonSchema.safeParse(req.body.reason) : null;
    if (!reason?.success) throw new AppError(400, 'A reason is required to create a category.');
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({ data: parsed.data });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'CATEGORY_CREATED',
        entityType: 'Category',
        entityId: created.id,
        reason: reason.data,
        afterData: { name: created.name, slug: created.slug },
      });
      return created;
    });
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
});

adminRouter.patch('/categories/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = categoryUpdateSchema.safeParse(req.body);
    const reason = typeof req.body.reason === 'string' ? reasonSchema.safeParse(req.body.reason) : null;
    if (!parsed.success || !reason?.success) throw new AppError(400, 'Valid category changes and a reason are required.');
    const category = await prisma.$transaction(async (tx) => {
      const current = await tx.category.findUnique({ where: { id: req.params.id } });
      if (!current) throw new AppError(404, 'Category not found.');
      const updated = await tx.category.update({ where: { id: current.id }, data: parsed.data });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'CATEGORY_UPDATED',
        entityType: 'Category',
        entityId: current.id,
        reason: reason.data,
        beforeData: { name: current.name, slug: current.slug },
        afterData: { name: updated.name, slug: updated.slug },
      });
      return updated;
    });
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
});

adminRouter.delete('/categories/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const reason = reasonSchema.safeParse(req.body?.reason);
    if (!reason.success) throw new AppError(400, 'A reason is required to remove a category.');
    await prisma.$transaction(async (tx) => {
      const current = await tx.category.findUnique({ where: { id: req.params.id }, include: { _count: { select: { events: true } } } });
      if (!current) throw new AppError(404, 'Category not found.');
      if (current._count.events) throw new AppError(409, 'A category with events cannot be removed.');
      await tx.category.delete({ where: { id: current.id } });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'CATEGORY_REMOVED',
        entityType: 'Category',
        entityId: current.id,
        reason: reason.data,
        beforeData: { name: current.name, slug: current.slug },
      });
    });
    res.json({ success: true, message: 'Category removed.' });
  } catch (err) { next(err); }
});

adminRouter.get('/bookings', async (req, res: Response, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100_000);
    const limit = parsePage(req.query.limit, 20, 100);
    const status = enumValue(req.query.status, ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'] as const, 'booking status');
    const q = queryString(req.query.q);
    const where: Prisma.BookingWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? {
        OR: [
          { reference: { contains: q, mode: 'insensitive' } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { event: { title: { contains: q, mode: 'insensitive' } } },
        ],
      } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true, startDate: true, organizer: { select: { name: true } } } },
          payment: { select: { status: true, amount: true, currency: true, webhookVerified: true, razorpayOrderId: true, razorpayPaymentId: true } },
          tickets: { select: { code: true, seatNumber: true, isCheckedIn: true, checkIn: { select: { checkedInAt: true, method: true } } } },
        },
      }),
      prisma.booking.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

adminRouter.get('/waitlists', async (req, res: Response, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100_000);
    const limit = parsePage(req.query.limit, 20, 100);
    const status = enumValue(req.query.status, ['WAITING', 'OFFERED', 'CONFIRMED', 'EXPIRED', 'WITHDRAWN'] as const, 'waitlist status');
    const eventId = queryString(req.query.eventId);
    const where = { ...(status ? { status } : {}), ...(eventId ? { eventId } : {}) };
    const [items, total] = await prisma.$transaction([
      prisma.waitlistEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ eventId: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true, totalCapacity: true, bookedSeats: true, organizer: { select: { name: true } } } },
        },
      }),
      prisma.waitlistEntry.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

adminRouter.post('/waitlists/promote', async (req: AuthRequest, res: Response, next) => {
  try {
    const input = z.object({ eventId: z.string().cuid(), reason: reasonSchema }).safeParse(req.body);
    if (!input.success) throw new AppError(400, 'An event and reason are required to promote a waitlist entry.');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${input.data.eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id: input.data.eventId } });
      if (!event) throw new AppError(404, 'Event not found.');
      const now = new Date();
      const activeOffers = await tx.waitlistEntry.count({
        where: { eventId: event.id, status: 'OFFERED', OR: [{ offerExpiresAt: null }, { offerExpiresAt: { gt: now } }] },
      });
      if (waitlistAvailableSeats(event.totalCapacity, event.bookedSeats, activeOffers) < 1) {
        throw new AppError(409, 'No unreserved seat is available for a waitlist offer.');
      }
      const entry = await tx.waitlistEntry.findFirst({
        where: { eventId: event.id, status: 'WAITING' },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      if (!entry) throw new AppError(404, 'No waiting entries remain for this event.');
      const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const promoted = await tx.waitlistEntry.updateMany({
        where: { id: entry.id, status: 'WAITING' },
        data: { status: 'OFFERED', offeredAt: now, offerExpiresAt: expiresAt },
      });
      if (promoted.count !== 1) throw new AppError(409, 'The waitlist changed; refresh and retry.');
      const updated = { ...entry, status: 'OFFERED' as WaitlistStatus, offeredAt: now, offerExpiresAt: expiresAt };
      await tx.inAppNotification.create({
        data: {
          userId: entry.user.id,
          type: 'WAITLIST_OFFER',
          title: 'A place is available',
          message: `A place is available for ${event.title}. Claim it before your offer expires.`,
          link: '/dashboard/waitlist',
          eventId: event.id,
          key: `admin-waitlist-offer:${entry.id}:${now.getTime()}`,
        },
      });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'WAITLIST_ENTRY_PROMOTED',
        entityType: 'WaitlistEntry',
        entityId: entry.id,
        reason: input.data.reason,
        beforeData: { status: 'WAITING', position: entry.position },
        afterData: { status: 'OFFERED', offerExpiresAt: expiresAt.toISOString() },
      });
      return { entry: updated, eventTitle: event.title };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    let emailNotice: 'sent_or_previewed' | 'configuration_unavailable' = 'configuration_unavailable';
    try {
      getSmtpConfig();
      await sendWaitlistOffer(result.entry.user.email, result.entry.user.name, {
        title: result.eventTitle,
        id: result.entry.eventId,
      }, result.entry.offerExpiresAt!);
      emailNotice = 'sent_or_previewed';
    } catch {
      emailNotice = 'configuration_unavailable';
    }
    res.json({ success: true, data: { entry: result.entry, emailNotice }, message: 'Next eligible attendee received a two-hour offer.' });
  } catch (err) { next(err); }
});

adminRouter.delete('/waitlists/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const input = z.object({ reason: reasonSchema }).safeParse(req.body);
    if (!input.success) throw new AppError(400, 'A reason is required to remove a waitlist entry.');
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.waitlistEntry.findUnique({ where: { id: req.params.id } });
      if (!current) throw new AppError(404, 'Waitlist entry not found.');
      if (['CONFIRMED', 'WITHDRAWN', 'EXPIRED'].includes(current.status)) {
        throw new AppError(409, 'This waitlist entry is no longer active.');
      }
      const entry = await tx.waitlistEntry.update({ where: { id: current.id }, data: { status: 'WITHDRAWN' } });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'WAITLIST_ENTRY_REMOVED',
        entityType: 'WaitlistEntry',
        entityId: current.id,
        reason: input.data.reason,
        beforeData: { status: current.status, position: current.position },
        afterData: { status: entry.status },
      });
      return entry;
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

adminRouter.get('/reviews', async (req, res: Response, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100_000);
    const limit = parsePage(req.query.limit, 20, 100);
    const status = enumValue(req.query.status, ['PUBLISHED', 'HIDDEN', 'REMOVED'] as const, 'review moderation status');
    const q = queryString(req.query.q);
    const where: Prisma.ReviewWhereInput = {
      ...(status ? { moderationStatus: status } : {}),
      ...(q ? { OR: [{ comment: { contains: q, mode: 'insensitive' } }, { event: { title: { contains: q, mode: 'insensitive' } } }, { user: { email: { contains: q, mode: 'insensitive' } } }] } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true, slug: true } },
          moderatedBy: { select: { name: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

adminRouter.patch('/reviews/:id/moderation', async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'A moderation state and reason are required.');
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.review.findUnique({ where: { id: req.params.id } });
      if (!current) throw new AppError(404, 'Review not found.');
      const updated = await tx.review.update({
        where: { id: current.id },
        data: {
          moderationStatus: parsed.data.status as ReviewModerationStatus,
          moderationReason: parsed.data.reason,
          moderatedAt: new Date(),
          moderatedById: req.user!.userId,
        },
      });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'REVIEW_MODERATED',
        entityType: 'Review',
        entityId: current.id,
        reason: parsed.data.reason,
        beforeData: { status: current.moderationStatus },
        afterData: { status: updated.moderationStatus },
      });
      return updated;
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

adminRouter.get('/audit', async (req, res: Response, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100_000);
    const limit = parsePage(req.query.limit, 30, 100);
    const q = queryString(req.query.q);
    const entityType = queryString(req.query.entityType);
    const where: Prisma.AuditLogWhereInput = {
      ...(entityType ? { entityType } : {}),
      ...(q ? { OR: [{ action: { contains: q, mode: 'insensitive' } }, { entityType: { contains: q, mode: 'insensitive' } }, { entityId: { contains: q, mode: 'insensitive' } }, { reason: { contains: q, mode: 'insensitive' } }, { actor: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

adminRouter.get('/system-status', async (_req, res: Response) => {
  let database: 'available' | 'unavailable' = 'unavailable';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'available';
  } catch {
    database = 'unavailable';
  }
  let email: 'configured' | 'preview_mode' | 'invalid' = 'preview_mode';
  try {
    email = getSmtpConfig() ? 'configured' : 'preview_mode';
  } catch {
    email = 'invalid';
  }
  res.json({
    success: true,
    data: {
      api: 'available',
      database,
      payments: isRazorpayTestConfigured() ? 'test-configured' : 'incomplete',
      email,
      recentOperationalErrors: 'not_available',
      checkedAt: new Date().toISOString(),
    },
  });
});

adminRouter.get('/export/users', async (req, res: Response, next) => {
  try {
    const role = enumValue(req.query.role, ['ATTENDEE', 'ORGANIZER', 'ADMIN'] as const, 'role');
    const status = enumValue(req.query.status, ['ACTIVE', 'SUSPENDED'] as const, 'status');
    const q = queryString(req.query.q);
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(status === 'ACTIVE' ? { suspendedAt: null } : status === 'SUSPENDED' ? { suspendedAt: { not: null } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
    };
    const users = await prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' },
      select: { name: true, email: true, role: true, isVerified: true, suspendedAt: true, createdAt: true },
      take: 10_000,
    });
    setCsvHeaders(res, 'eventora-users.csv');
    res.send(createCsv(
      ['Name', 'Email', 'Role', 'Verified', 'Suspended At', 'Created At'],
      users.map((user) => [user.name, user.email, user.role, user.isVerified, user.suspendedAt?.toISOString(), user.createdAt.toISOString()]),
    ));
  } catch (err) { next(err); }
});

adminRouter.get('/export/events', async (req, res: Response, next) => {
  try {
    const status = enumValue(req.query.status, ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const, 'event status');
    const format = enumValue(req.query.format, ['IN_PERSON', 'ONLINE', 'HYBRID'] as const, 'event format');
    const q = queryString(req.query.q);
    const city = queryString(req.query.city);
    const categoryId = queryString(req.query.categoryId);
    const organizerId = queryString(req.query.organizerId, 100);
    const from = queryString(req.query.from, 10);
    const to = queryString(req.query.to, 10);
    const range = from || to ? parseAdminDateRange({ ...(from ? { from } : {}), ...(to ? { to } : {}) }) : undefined;
    const where: Prisma.EventWhereInput = {
      ...(status ? { status } : {}),
      ...(format ? { format } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(organizerId ? { organizerId } : {}),
      ...(range ? { startDate: { gte: range.start, lte: range.end } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {}),
    };
    const events = await prisma.event.findMany({
      where, take: 10_000, orderBy: { createdAt: 'desc' },
      include: { organizer: { select: { name: true } }, category: { select: { name: true } } },
    });
    setCsvHeaders(res, 'eventora-events.csv');
    res.send(createCsv(
      ['Title', 'Status', 'Organizer', 'Category', 'Start Date', 'Format', 'City', 'Capacity', 'Booked Seats', 'Price'],
      events.map((event) => [event.title, event.status, event.organizer.name, event.category.name, event.startDate.toISOString(), event.format, event.city, event.totalCapacity, event.bookedSeats, event.price]),
    ));
  } catch (err) { next(err); }
});

adminRouter.get('/export/bookings', async (req, res: Response, next) => {
  try {
    const status = enumValue(req.query.status, ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'] as const, 'booking status');
    const q = queryString(req.query.q);
    const where: Prisma.BookingWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ reference: { contains: q, mode: 'insensitive' } }, { user: { email: { contains: q, mode: 'insensitive' } } }, { event: { title: { contains: q, mode: 'insensitive' } } }] } : {}),
    };
    const bookings = await prisma.booking.findMany({
      where, take: 10_000, orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, event: { select: { title: true } }, payment: { select: { status: true, webhookVerified: true } } },
    });
    setCsvHeaders(res, 'eventora-bookings.csv');
    res.send(createCsv(
      ['Reference', 'User Name', 'User Email', 'Event', 'Seats', 'Amount', 'Status', 'Payment Status', 'Payment Verified', 'Created'],
      bookings.map((booking) => [booking.reference, booking.user.name, booking.user.email, booking.event.title, booking.seats, booking.totalAmount, booking.status, booking.payment?.status, booking.payment?.webhookVerified, booking.createdAt.toISOString()]),
    ));
  } catch (err) { next(err); }
});

adminRouter.get('/export/waitlists', async (req, res: Response, next) => {
  try {
    const status = enumValue(req.query.status, ['WAITING', 'OFFERED', 'CONFIRMED', 'EXPIRED', 'WITHDRAWN'] as const, 'waitlist status');
    const entries = await prisma.waitlistEntry.findMany({
      where: status ? { status } : {},
      take: 10_000, orderBy: [{ eventId: 'asc' }, { position: 'asc' }],
      include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } },
    });
    setCsvHeaders(res, 'eventora-waitlists.csv');
    res.send(createCsv(
      ['Event', 'Position', 'Attendee', 'Email', 'Status', 'Offer Expires'],
      entries.map((entry) => [entry.event.title, entry.position, entry.user.name, entry.user.email, entry.status, entry.offerExpiresAt?.toISOString()]),
    ));
  } catch (err) { next(err); }
});

adminRouter.get('/export/reviews', async (req, res: Response, next) => {
  try {
    const status = enumValue(req.query.status, ['PUBLISHED', 'HIDDEN', 'REMOVED'] as const, 'review moderation status');
    const q = queryString(req.query.q);
    const where: Prisma.ReviewWhereInput = {
      ...(status ? { moderationStatus: status } : {}),
      ...(q ? { OR: [{ comment: { contains: q, mode: 'insensitive' } }, { event: { title: { contains: q, mode: 'insensitive' } } }, { user: { email: { contains: q, mode: 'insensitive' } } }] } : {}),
    };
    const reviews = await prisma.review.findMany({
      where,
      take: 10_000, orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } },
    });
    setCsvHeaders(res, 'eventora-reviews.csv');
    res.send(createCsv(
      ['Event', 'Attendee', 'Email', 'Rating', 'Moderation Status', 'Reason', 'Created'],
      reviews.map((review) => [review.event.title, review.user.name, review.user.email, review.rating, review.moderationStatus, review.moderationReason, review.createdAt.toISOString()]),
    ));
  } catch (err) { next(err); }
});

adminRouter.get('/export/financials', async (req, res: Response, next) => {
  try {
    const from = queryString(req.query.from, 10);
    const to = queryString(req.query.to, 10);
    const range = from || to ? parseAdminDateRange({ ...(from ? { from } : {}), ...(to ? { to } : {}) }) : undefined;
    const payments = await prisma.payment.findMany({
      where: {
        webhookVerified: true,
        status: { in: ['CAPTURED', 'REFUNDED'] },
        ...(range ? {
          OR: [
            { status: 'CAPTURED', createdAt: { gte: range.start, lte: range.end } },
            { status: 'REFUNDED', updatedAt: { gte: range.start, lte: range.end } },
          ],
        } : {}),
      },
      take: 10_000, orderBy: { createdAt: 'desc' },
      include: { booking: { select: { reference: true, event: { select: { title: true } } } } },
    });
    setCsvHeaders(res, 'eventora-verified-financials.csv');
    res.send(createCsv(
      ['Booking Reference', 'Event', 'Amount', 'Currency', 'Verified Status', 'Recorded At'],
      payments.map((payment) => [payment.booking.reference, payment.booking.event.title, payment.amount, payment.currency, payment.status, payment.updatedAt.toISOString()]),
    ));
  } catch (err) { next(err); }
});

adminRouter.get('/checkins', async (req, res: Response, next) => {
  try {
    const eventId = queryString(req.query.eventId, 100);
    const checkins = await prisma.checkIn.findMany({
      where: eventId ? { eventId } : {},
      orderBy: { checkedInAt: 'desc' },
      take: 100,
      include: {
        ticket: { include: { booking: { include: { user: { select: { name: true, email: true } } } } } },
        staff: { select: { name: true } },
        event: { select: { title: true } },
      },
    });

    adminRouter.post('/scanner/tickets/:code/checkin', async (req: AuthRequest, res: Response, next) => {
      try {
        const input = z.object({ method: z.enum(['QR', 'Manual']).default('QR') }).safeParse(req.body || {});
        if (!input.success) throw new AppError(400, 'Check-in method must be QR or Manual.');
        const result = await checkInTicket(req.params.code, {
          id: req.user!.userId,
          role: req.user!.role,
        }, input.data.method, true);
        res.json({
          success: true,
          data: result,
          message: result.status === 'checked_in' ? 'Check-in successful!' : 'Ticket could not be checked in.',
        });
      } catch (err) { next(err); }
    });
    res.json({ success: true, data: checkins });
  } catch (err) { next(err); }
});
