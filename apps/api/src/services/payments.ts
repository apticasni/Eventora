import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { issueTicketsIfMissing } from './tickets';
import { sendBookingConfirmation, sendPaymentReceipt, sendTicketDetails } from '../lib/email';

export async function confirmPaidBooking(opts: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  amountPaise?: number;
  currency?: string;
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
    if (
      (opts.amountPaise !== undefined && opts.amountPaise !== Math.round(booking.totalAmount * 100)) ||
      (opts.currency !== undefined && opts.currency !== booking.currency)
    ) {
      throw new AppError(409, 'Razorpay payment amount or currency does not match this booking.');
    }
    if (booking.status === 'CANCELLED') {
      throw new AppError(400, 'Cannot confirm a cancelled booking.');
    }

    await tx.$queryRaw`
      SELECT id FROM "Event" WHERE id = ${booking.eventId} FOR UPDATE
    `;

    // Re-read after the shared event lock so duplicate or concurrent callbacks see the
    // winning transaction before creating tickets or sending another confirmation.
    const currentBooking = await tx.booking.findUnique({
      where: { id: opts.bookingId },
      include: { event: true, payment: true, tickets: true, user: { select: { id: true, email: true, name: true } } },
    });
    if (!currentBooking) throw new AppError(404, 'Booking not found.');
    if (opts.userId && currentBooking.userId !== opts.userId) throw new AppError(403, 'Not authorized.');
    if (!currentBooking.payment || currentBooking.payment.razorpayOrderId !== opts.razorpayOrderId) {
      throw new AppError(400, 'Payment order does not match this booking.');
    }
    if (currentBooking.status === 'CANCELLED') {
      throw new AppError(400, 'Cannot confirm a cancelled booking.');
    }
    if (currentBooking.status === 'CONFIRMED' && currentBooking.payment.status === 'CAPTURED') {
      if (currentBooking.payment.razorpayPaymentId !== opts.razorpayPaymentId) {
        throw new AppError(409, 'A different payment is already attached to this booking.');
      }
      const tickets = await issueTicketsIfMissing(tx, currentBooking);
      return { booking: currentBooking, tickets, alreadyConfirmed: true };
    }

    await tx.payment.update({
      where: { bookingId: currentBooking.id },
      data: {
        razorpayPaymentId: opts.razorpayPaymentId,
        razorpaySignature: opts.razorpaySignature ?? currentBooking.payment.razorpaySignature,
        status: 'CAPTURED',
        webhookVerified: opts.webhookVerified ? true : currentBooking.payment.webhookVerified,
      },
    });

    const confirmed = await tx.booking.update({
      where: { id: currentBooking.id },
      data: { status: 'CONFIRMED' },
    });

    const tickets = await issueTicketsIfMissing(tx, {
      id: currentBooking.id,
      seats: currentBooking.seats,
      reference: currentBooking.reference,
      eventId: currentBooking.eventId,
    });
    await tx.inAppNotification.create({
      data: {
        userId: currentBooking.userId,
        type: 'REGISTRATION_CONFIRMED',
        title: 'Registration confirmed',
        message: `Your registration for ${currentBooking.event.title} is confirmed. Your ticket is ready.`,
        link: '/dashboard/bookings',
        eventId: currentBooking.eventId,
        key: `booking-confirmed:${currentBooking.id}:${confirmed.updatedAt.toISOString()}`,
      },
    });
    return { booking: { ...currentBooking, ...confirmed, status: 'CONFIRMED' as const }, tickets, alreadyConfirmed: false };
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
