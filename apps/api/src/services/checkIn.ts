import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

type CheckInActor = { id: string; role: string };
type CheckInTicket = Prisma.TicketGetPayload<{ include: typeof ticketDetails }>;
type CheckInStatus =
  | 'checked_in'
  | 'already_checked_in'
  | 'booking_cancelled'
  | 'booking_refunded'
  | 'booking_not_confirmed'
  | 'event_cancelled'
  | 'event_expired';

const ticketDetails = {
  booking: {
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
      event: {
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          venueName: true,
          city: true,
          format: true,
          organizerId: true,
        },
      },
      payment: {
        select: {
          status: true,
          amount: true,
          currency: true,
          razorpayPaymentId: true,
          webhookVerified: true,
        },
      },
    },
  },
  checkIn: { include: { staff: { select: { id: true, name: true } } } },
} satisfies Prisma.TicketInclude;

export function getCheckInStatus(ticket: Pick<CheckInTicket, 'isCheckedIn' | 'booking'>, now = new Date()): CheckInStatus {
  if (ticket.isCheckedIn) return 'already_checked_in';
  if (ticket.booking.status === 'CANCELLED') return 'booking_cancelled';
  if (ticket.booking.status === 'REFUNDED') return 'booking_refunded';
  if (ticket.booking.status !== 'CONFIRMED') return 'booking_not_confirmed';
  if (ticket.booking.event.status === 'CANCELLED') return 'event_cancelled';
  if (ticket.booking.event.status === 'COMPLETED' || ticket.booking.event.endDate <= now) return 'event_expired';
  return 'checked_in';
}

export function isAuthorizedForCheckIn(
  ticket: Pick<CheckInTicket, 'booking'>,
  actor: CheckInActor,
  adminOnly = false,
): boolean {
  if (adminOnly) return actor.role === 'ADMIN';
  return actor.role === 'ADMIN' || (
    actor.role === 'ORGANIZER' && ticket.booking.event.organizerId === actor.id
  );
}

export async function checkInTicket(
  code: string,
  actor: CheckInActor,
  method: 'QR' | 'Manual',
  adminOnly = false,
) {
  const ticket = await prisma.ticket.findUnique({ where: { code }, include: ticketDetails });
  if (!ticket) throw new AppError(404, 'Ticket not found.');
  if (!isAuthorizedForCheckIn(ticket, actor, adminOnly)) {
    throw new AppError(403, 'You are not authorized to check in this ticket.');
  }

  const status = getCheckInStatus(ticket);
  if (status !== 'checked_in') return { status, ticket };

  const checkedIn = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticket.id} FOR UPDATE`;
    const current = await tx.ticket.findUnique({ where: { id: ticket.id }, include: ticketDetails });
    if (!current) throw new AppError(404, 'Ticket not found.');
    const currentStatus = getCheckInStatus(current);
    if (currentStatus !== 'checked_in') return { status: currentStatus, ticket: current };

    await tx.ticket.update({ where: { id: current.id }, data: { isCheckedIn: true } });
    await tx.checkIn.create({
      data: {
        ticketId: current.id,
        eventId: current.booking.event.id,
        staffId: actor.id,
        method,
      },
    });

    const updatedTicket = await tx.ticket.findUnique({ where: { id: current.id }, include: ticketDetails });
    if (!updatedTicket) throw new AppError(404, 'Ticket not found.');
    return { status: 'checked_in' as const, ticket: updatedTicket };
  });

  return checkedIn;
}
