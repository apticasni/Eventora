import { prisma } from '../lib/prisma';
import { sendWaitlistOffer } from '../lib/email';

export async function processWaitlist(eventId: string, releasedSeats: number) {
  const waiting = await prisma.waitlistEntry.findMany({
    where: { eventId, status: 'WAITING' },
    orderBy: { position: 'asc' },
    take: releasedSeats,
    include: { user: { select: { email: true, name: true } } },
  });

  for (const entry of waiting) {
    const offerExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'OFFERED', offeredAt: new Date(), offerExpiresAt },
    });
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, slug: true } });
    sendWaitlistOffer(
      entry.user.email,
      entry.user.name,
      { title: event?.title || 'an Eventora event', id: event?.slug || eventId },
      offerExpiresAt,
    ).catch(console.error);
  }
}

export async function expireOldOffers() {
  const expired = await prisma.waitlistEntry.findMany({
    where: { status: 'OFFERED', offerExpiresAt: { lt: new Date() } },
  });

  for (const entry of expired) {
    await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'EXPIRED' } });
    // Process next in waitlist
    await processWaitlist(entry.eventId, 1);
  }
}
