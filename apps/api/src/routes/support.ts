import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parsePage } from '../lib/adminTools';
import { writeAuditLog } from '../services/auditLog';

export const supportRouter = Router();

const createRequestSchema = z.object({
  subject: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(5000),
  category: z.enum(['BOOKING', 'PAYMENT', 'EVENT', 'ACCOUNT', 'OTHER']).default('OTHER'),
  eventId: z.string().cuid().optional(),
  bookingId: z.string().cuid().optional(),
});

const updateRequestSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED']).optional(),
  assignedAdminId: z.string().cuid().nullable().optional(),
  reason: z.string().trim().min(8).max(500),
  internalNote: z.string().trim().min(1).max(5000).optional(),
}).refine((value) => value.status !== undefined || value.assignedAdminId !== undefined || value.internalNote !== undefined, {
  message: 'Provide a status, assignment, or internal note.',
});

supportRouter.post('/', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'Support request details are invalid.');
    const input = parsed.data;

    let eventId = input.eventId;
    if (input.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
        select: { id: true, userId: true, eventId: true },
      });
      if (!booking || booking.userId !== req.user!.userId) {
        throw new AppError(404, 'The related booking was not found.');
      }
      if (eventId && eventId !== booking.eventId) {
        throw new AppError(400, 'The event and booking references do not match.');
      }
      eventId = booking.eventId;
    } else if (eventId) {
      const eventExists = await prisma.event.count({ where: { id: eventId } });
      if (!eventExists) throw new AppError(404, 'The related event was not found.');
    }

    const request = await prisma.supportRequest.create({
      data: {
        requesterId: req.user!.userId,
        subject: input.subject,
        description: input.description,
        category: input.category,
        eventId,
        bookingId: input.bookingId,
      },
      select: { id: true, reference: true, subject: true, category: true, status: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: request, message: 'Support request submitted.' });
  } catch (err) { next(err); }
});

supportRouter.get('/mine', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const requests = await prisma.supportRequest.findMany({
      where: { requesterId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        reference: true,
        subject: true,
        description: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        event: { select: { id: true, title: true } },
        booking: { select: { id: true, reference: true, status: true } },
        notes: {
          where: { internal: false },
          select: { id: true, body: true, createdAt: true, author: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

supportRouter.get('/admin', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100_000);
    const limit = parsePage(req.query.limit, 20, 100);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status && !['NEW', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED'].includes(status)) {
      throw new AppError(400, 'Invalid support status.');
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const where = {
      ...(status ? { status: status as 'NEW' | 'IN_PROGRESS' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED' } : {}),
      ...(q ? {
        OR: [
          { reference: { contains: q, mode: 'insensitive' as const } },
          { subject: { contains: q, mode: 'insensitive' as const } },
          { requester: { email: { contains: q, mode: 'insensitive' as const } } },
          { requester: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.supportRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true } },
          booking: { select: { id: true, reference: true, status: true } },
          assignedAdmin: { select: { id: true, name: true, email: true } },
          notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } } } },
        },
      }),
      prisma.supportRequest.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

supportRouter.patch('/admin/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = updateRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'Support update details are invalid.');
    const input = parsed.data;
    const existing = await prisma.supportRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Support request not found.');
    if (input.assignedAdminId) {
      const assignee = await prisma.user.findUnique({
        where: { id: input.assignedAdminId },
        select: { id: true, role: true, suspendedAt: true },
      });
      if (!assignee || assignee.role !== 'ADMIN' || assignee.suspendedAt) {
        throw new AppError(400, 'Support requests may only be assigned to active administrators.');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.supportRequest.update({
        where: { id: existing.id },
        data: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.assignedAdminId !== undefined ? { assignedAdminId: input.assignedAdminId } : {}),
          ...(input.status === 'RESOLVED' || input.status === 'CLOSED'
            ? { resolvedAt: new Date() }
            : input.status && existing.resolvedAt
              ? { resolvedAt: null }
              : {}),
        },
      });
      if (input.internalNote) {
        await tx.supportNote.create({
          data: {
            requestId: existing.id,
            authorId: req.user!.userId,
            body: input.internalNote,
            internal: true,
          },
        });
      }
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'SUPPORT_REQUEST_UPDATED',
        entityType: 'SupportRequest',
        entityId: existing.id,
        reason: input.reason,
        beforeData: { status: existing.status, assignedAdminId: existing.assignedAdminId },
        afterData: { status: record.status, assignedAdminId: record.assignedAdminId },
      });
      return record;
    });
    res.json({ success: true, data: updated, message: 'Support request updated.' });
  } catch (err) { next(err); }
});
