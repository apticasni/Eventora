import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcoming = await prisma.booking.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        event: { startDate: { gt: now, lte: reminderWindow } },
      },
      select: { id: true, eventId: true, event: { select: { title: true, slug: true } } },
      take: 100,
    });
    if (upcoming.length) {
      await prisma.inAppNotification.createMany({
        data: upcoming.map((booking) => ({
          userId,
          type: 'EVENT_REMINDER',
          title: 'Upcoming event reminder',
          message: `${booking.event.title} starts within the next 24 hours.`,
          link: `/events/${booking.event.slug}`,
          eventId: booking.eventId,
          key: `event-reminder:${booking.id}`,
        })),
        skipDuplicates: true,
      });
    }

    const where = { userId };
    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inAppNotification.count({ where }),
      prisma.inAppNotification.count({ where: { userId, readAt: null } }),
    ]);
    res.json({
      success: true,
      data: { notifications, total, unreadCount, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res: Response, next) => {
  try {
    const result = await prisma.inAppNotification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const exists = await prisma.inAppNotification.count({ where: { id: req.params.id, userId: req.user!.userId } });
      if (!exists) throw new AppError(404, 'Notification not found.');
    }
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) { next(err); }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.inAppNotification.updateMany({
      where: { userId: req.user!.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (err) { next(err); }
});
