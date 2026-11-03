import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { issueTicketsIfMissing } from './tickets';
import { sendBookingConfirmation, sendPaymentReceipt, sendTicketDetails } from '../lib/email';

export async function confirmPaidBooking(opts: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  webhookVerified?: boolean;
  userId?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: opts.bookingId },
      include: { event: true, payment: true, tickets: true, user: { select: { id: true, email: true, name: true } } },
    });
    if (!booking) throw new AppError(404, 'Booking not found.');
    if (opts.userId && booking.userId !== opts.userId) throw new AppError(403, 'Not authorized.');
    if (!booking.payment) throw new AppError(400, 'No payment order found for this booking.');
    if (booking.payment.razorpayOrderId !== opts.razorpayOrderId) {
      throw new AppError(400, 'Payment order does not match this booking.');
    }
    if (booking.payment.amount !== booking.totalAmount || booking.payment.currency !== booking.currency) {
      throw new AppError(409, 'Payment amount or currency does not match this booking.');
    }
    if (booking.status === 'CANCELLED') {
      throw new AppError(400, 'Cannot confirm a cancelled booking.');
    }

    if (booking.status === 'CONFIRMED' && booking.payment.status === 'CAPTURED') {
      const tickets = await issueTicketsIfMissing(tx, booking);
      return { booking, tickets, alreadyConfirmed: true };
    }

    await tx.$queryRaw`
      SELECT id FROM "Event" WHERE id = ${booking.eventId} FOR UPDATE
    `;

    await tx.payment.update({
      where: { bookingId: booking.id },
      data: {
        razorpayPaymentId: opts.razorpayPaymentId,
        razorpaySignature: opts.razorpaySignature ?? booking.payment.razorpaySignature,
        status: 'CAPTURED',
        webhookVerified: opts.webhookVerified ? true : booking.payment.webhookVerified,
      },
    });

    const confirmed = await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED' },
    });

    const tickets = await issueTicketsIfMissing(tx, {
      id: booking.id,
      seats: booking.seats,
      reference: booking.reference,
      eventId: booking.eventId,
    });
    return { booking: { ...booking, ...confirmed, status: 'CONFIRMED' as const }, tickets, alreadyConfirmed: false };
  });

  if (!result.alreadyConfirmed && result.booking.user) {
    const user = result.booking.user;
    const event = result.booking.event;
    sendBookingConfirmation(user.email, user.name, {
      title: event.title, startDate: event.startDate,
      venueName: event.venueName, city: event.city,
      seats: result.booking.seats, reference: result.booking.reference,
    }).catch(console.error);
    sendPaymentReceipt(user.email, user.name, {
      eventTitle: event.title, amount: result.booking.totalAmount,
      currency: result.booking.currency, paymentId: opts.razorpayPaymentId, reference: result.booking.reference,
    }).catch(console.error);
    sendTicketDetails(user.email, user.name, result.tickets, {
      title: event.title, startDate: event.startDate,
      venueName: event.venueName, city: event.city,
    }).catch(console.error);
  }

  return result;
}

export async function failPendingPayment(razorpayOrderId: string) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId },
      include: { booking: true },
    });
    if (!payment) return;
    if (payment.status === 'CAPTURED') return;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', webhookVerified: true },
    });

    if (payment.booking.status === 'PENDING') {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${payment.booking.eventId} FOR UPDATE`;
      await tx.booking.update({
        where: { id: payment.booking.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Payment failed' },
      });
      await tx.$executeRaw`
        UPDATE "Event"
        SET "bookedSeats" = GREATEST(0, "bookedSeats" - ${payment.booking.seats})
        WHERE id = ${payment.booking.eventId}
      `;
    }
  });
}
