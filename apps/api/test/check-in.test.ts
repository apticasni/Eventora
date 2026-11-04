import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/middleware/errorHandler';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../src/lib/prisma';
import { checkInTicket, getCheckInStatus, isAuthorizedForCheckIn } from '../src/services/checkIn';

const now = new Date('2026-11-04T10:00:00.000Z');

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    code: 'ticket-code',
    isCheckedIn: false,
    booking: {
      status: 'CONFIRMED',
      event: {
        status: 'PUBLISHED',
        endDate: new Date('2026-11-05T10:00:00.000Z'),
        organizerId: 'organizer-1',
      },
    },
    ...overrides,
  } as never;
}

describe('ticket check-in', () => {
  beforeEach(() => vi.clearAllMocks());

  it('distinguishes confirmed, cancelled, refunded, unconfirmed, cancelled-event, expired and duplicate tickets', () => {
    expect(getCheckInStatus(makeTicket(), now)).toBe('checked_in');
    expect(getCheckInStatus(makeTicket({ isCheckedIn: true }), now)).toBe('already_checked_in');
    expect(getCheckInStatus(makeTicket({ booking: { status: 'CANCELLED', event: { status: 'PUBLISHED', endDate: now, organizerId: 'organizer-1' } } }), now)).toBe('booking_cancelled');
    expect(getCheckInStatus(makeTicket({ booking: { status: 'REFUNDED', event: { status: 'PUBLISHED', endDate: now, organizerId: 'organizer-1' } } }), now)).toBe('booking_refunded');
    expect(getCheckInStatus(makeTicket({ booking: { status: 'PENDING', event: { status: 'PUBLISHED', endDate: now, organizerId: 'organizer-1' } } }), now)).toBe('booking_not_confirmed');
    expect(getCheckInStatus(makeTicket({ booking: { status: 'CONFIRMED', event: { status: 'CANCELLED', endDate: new Date('2026-11-05'), organizerId: 'organizer-1' } } }), now)).toBe('event_cancelled');
    expect(getCheckInStatus(makeTicket({ booking: { status: 'CONFIRMED', event: { status: 'PUBLISHED', endDate: now, organizerId: 'organizer-1' } } }), now)).toBe('event_expired');
    expect(getCheckInStatus(makeTicket({ booking: { status: 'CONFIRMED', event: { status: 'COMPLETED', endDate: new Date('2026-11-05'), organizerId: 'organizer-1' } } }), now)).toBe('event_expired');
  });

  it('restricts admin scanner check-ins to admins and organizers to their own events', () => {
    const ticket = makeTicket();
    expect(isAuthorizedForCheckIn(ticket, { id: 'admin-1', role: 'ADMIN' }, true)).toBe(true);
    expect(isAuthorizedForCheckIn(ticket, { id: 'organizer-1', role: 'ORGANIZER' }, true)).toBe(false);
    expect(isAuthorizedForCheckIn(ticket, { id: 'organizer-1', role: 'ORGANIZER' })).toBe(true);
    expect(isAuthorizedForCheckIn(ticket, { id: 'organizer-2', role: 'ORGANIZER' })).toBe(false);
    expect(isAuthorizedForCheckIn(ticket, { id: 'attendee-1', role: 'ATTENDEE' })).toBe(false);
  });

  it('returns verified attendee and existing check-in details for a duplicate without writing again', async () => {
    const existing = makeTicket({
      isCheckedIn: true,
      booking: {
        status: 'CONFIRMED',
        event: { status: 'PUBLISHED', endDate: new Date('2026-11-05'), organizerId: 'organizer-1' },
      },
      checkIn: { checkedInAt: now, staff: { id: 'admin-1', name: 'Admin' } },
    });
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(existing);

    const result = await checkInTicket('ticket-code', { id: 'admin-1', role: 'ADMIN' }, 'QR', true);

    expect(result.status).toBe('already_checked_in');
    expect(result.ticket).toBe(existing);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not disclose or process tickets that do not exist', async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

    await expect(checkInTicket('unknown', { id: 'admin-1', role: 'ADMIN' }, 'Manual', true))
      .rejects.toMatchObject({ statusCode: 404, message: 'Ticket not found.' } satisfies Partial<AppError>);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
