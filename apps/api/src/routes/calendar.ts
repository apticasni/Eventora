import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const calendarRouter = Router();

// GET /api/calendar/ics/:eventId
calendarRouter.get('/ics/:eventId', async (req, res: Response, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: { organizer: { select: { name: true, email: true } } },
    });
    if (!event) throw new AppError(404, 'Event not found.');

    const formatDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Eventora//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@eventora.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(event.startDate)}`,
      `DTEND:${formatDate(event.endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.shortDescription || event.description.slice(0, 200)}`,
      `LOCATION:${event.venueName ? `${event.venueName}${event.city ? ', ' + event.city : ''}` : 'Online'}`,
      `URL:${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.slug}`,
      `ORGANIZER;CN="${event.organizer.name}":mailto:${event.organizer.email}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${event.slug}.ics"`);
    res.send(ics);
  } catch (err) { next(err); }
});
