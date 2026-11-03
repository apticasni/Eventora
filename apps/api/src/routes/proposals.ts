import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { CreateProposalSchema, UpdateProposalSchema } from '@eventora/shared';

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
    const proposal = await prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: { organizer: true },
    });
    if (!proposal) throw new AppError(404, 'Proposal not found.');
    if (proposal.status !== 'PENDING') throw new AppError(400, 'Proposal is not pending.');

    // Find category
    let category = await prisma.category.findFirst({ where: { name: { equals: proposal.category, mode: 'insensitive' } } });
    if (!category) {
      const slug = proposal.category.toLowerCase().replace(/\s+/g, '-');
      category = await prisma.category.create({ data: { name: proposal.category, slug } });
    }

    const slug = proposal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);

    const event = await prisma.event.create({
      data: {
        title: proposal.title,
        slug,
        description: proposal.description,
        categoryId: category.id,
        organizerId: proposal.organizerId,
        format: proposal.format,
        startDate: proposal.proposedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: proposal.proposedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalCapacity: proposal.estimatedCapacity || 50,
        price: proposal.price || 0,
        isFree: !proposal.price || proposal.price === 0,
        status: 'DRAFT',
        proposalId: proposal.id,
      },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'APPROVED', adminNotes: req.body.adminNotes },
    });

    res.json({ success: true, data: { proposal, event }, message: 'Proposal approved. Draft event created.' });
  } catch (err) { next(err); }
});

// POST /api/proposals/:id/reject (admin)
proposalsRouter.post('/:id/reject', requireAuth, requireRole('ADMIN'), async (req, res: Response, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) throw new AppError(400, 'Rejection reason is required.');
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new AppError(404, 'Proposal not found.');
    const updated = await prisma.proposal.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectionReason },
    });
    res.json({ success: true, data: updated, message: 'Proposal rejected.' });
  } catch (err) { next(err); }
});
