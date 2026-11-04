import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { CreateProposalSchema, UpdateProposalSchema } from '@eventora/shared';
import { z } from 'zod';
import { writeAuditLog } from '../services/auditLog';

export const proposalsRouter = Router();

// POST /api/proposals
proposalsRouter.post('/', requireAuth, requireRole('ORGANIZER', 'ADMIN'), validateBody(CreateProposalSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const proposal = await prisma.proposal.create({
      data: { ...req.body, organizerId: req.user!.userId },
    });
    res.status(201).json({ success: true, data: proposal, message: 'Proposal submitted successfully.' });
  } catch (err) { next(err); }
});

// GET /api/proposals (organizer's own)
proposalsRouter.get('/', requireAuth, requireRole('ORGANIZER', 'ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const where = req.user!.role === 'ADMIN' ? {} : { organizerId: req.user!.userId };
    const proposals = await prisma.proposal.findMany({
      where,
      include: { organizer: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: proposals });
  } catch (err) { next(err); }
});

// GET /api/proposals/admin (all, admin only)
proposalsRouter.get('/admin', requireAuth, requireRole('ADMIN'), async (_req, res: Response, next) => {
  try {
    const proposals = await prisma.proposal.findMany({
      include: { organizer: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: proposals });
  } catch (err) { next(err); }
});

// PUT /api/proposals/:id
proposalsRouter.put('/:id', requireAuth, requireRole('ORGANIZER', 'ADMIN'), validateBody(UpdateProposalSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new AppError(404, 'Proposal not found.');
    if (proposal.organizerId !== req.user!.userId && req.user!.role !== 'ADMIN') throw new AppError(403, 'Not authorized.');
    if (proposal.status !== 'PENDING') throw new AppError(400, 'Only pending proposals can be edited.');
    const updated = await prisma.proposal.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// POST /api/proposals/:id/approve (admin)
proposalsRouter.post('/:id/approve', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const input = z.object({ adminNotes: z.string().trim().min(8).max(500) }).safeParse(req.body);
    if (!input.success) throw new AppError(400, 'An approval reason of at least 8 characters is required.');

    const result = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({ where: { id: req.params.id } });
      if (!proposal) throw new AppError(404, 'Proposal not found.');
      if (proposal.status !== 'PENDING') throw new AppError(409, 'Proposal is no longer pending.');

      let category = await tx.category.findFirst({ where: { name: { equals: proposal.category, mode: 'insensitive' } } });
      if (!category) {
        const baseSlug = proposal.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        category = await tx.category.create({ data: { name: proposal.category, slug: `${baseSlug}-${Date.now().toString(36)}` } });
      }

      const slug = `${proposal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
      const startDate = proposal.proposedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const event = await tx.event.create({
        data: {
          title: proposal.title,
          slug,
          description: proposal.description,
          categoryId: category.id,
          organizerId: proposal.organizerId,
          format: proposal.format,
          startDate,
          endDate: new Date(startDate.getTime() + 3 * 60 * 60 * 1000),
          totalCapacity: proposal.estimatedCapacity || 50,
          price: proposal.price || 0,
          isFree: !proposal.price || proposal.price === 0,
          status: 'DRAFT',
          proposalId: proposal.id,
        },
      });

      const updatedProposal = await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: 'APPROVED', adminNotes: input.data.adminNotes },
      });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'PROPOSAL_APPROVED',
        entityType: 'Proposal',
        entityId: proposal.id,
        reason: input.data.adminNotes,
        beforeData: { status: proposal.status },
        afterData: { status: updatedProposal.status, eventId: event.id },
      });
      return { proposal: updatedProposal, event };
    });

    res.json({ success: true, data: result, message: 'Proposal approved. Draft event created.' });
  } catch (err) { next(err); }
});

// POST /api/proposals/:id/reject (admin)
proposalsRouter.post('/:id/reject', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const input = z.object({ rejectionReason: z.string().trim().min(8).max(500) }).safeParse(req.body);
    if (!input.success) throw new AppError(400, 'A rejection reason of at least 8 characters is required.');
    const updated = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({ where: { id: req.params.id } });
      if (!proposal) throw new AppError(404, 'Proposal not found.');
      if (proposal.status !== 'PENDING') throw new AppError(409, 'Proposal is no longer pending.');
      const result = await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: 'REJECTED', rejectionReason: input.data.rejectionReason },
      });
      await writeAuditLog(tx, {
        actorId: req.user!.userId,
        action: 'PROPOSAL_REJECTED',
        entityType: 'Proposal',
        entityId: proposal.id,
        reason: input.data.rejectionReason,
        beforeData: { status: proposal.status },
        afterData: { status: result.status },
      });
      return result;
    });
    res.json({ success: true, data: updated, message: 'Proposal rejected.' });
  } catch (err) { next(err); }
});
