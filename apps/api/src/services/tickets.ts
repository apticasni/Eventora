import { Prisma, PrismaClient } from '@prisma/client';
import { generateQRCode } from '../lib/qrcode';

type Db = PrismaClient | Prisma.TransactionClient;

export async function issueTicketsIfMissing(
  db: Db,
  booking: { id: string; seats: number; reference: string; eventId: string }
) {
  const existing = await db.ticket.findMany({
    where: { bookingId: booking.id },
    orderBy: { seatNumber: 'asc' },
  });
  if (existing.length >= booking.seats) return existing;

  const tickets = [...existing];
  for (let i = existing.length; i < booking.seats; i++) {
    const ticket = await db.ticket.create({
      data: { bookingId: booking.id, seatNumber: i + 1 },
    });
    const qrCode = await generateQRCode(JSON.stringify({
      ticketCode: ticket.code,
      bookingRef: booking.reference,
      eventId: booking.eventId,
      seatNumber: i + 1,
    }));
    tickets.push(await db.ticket.update({ where: { id: ticket.id }, data: { qrCode } }));
  }
  return tickets;
}
