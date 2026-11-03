import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma';

const apiUrl = process.env.API_URL || 'http://localhost:4000';
const testId = randomUUID();
const password = `E2e-${randomUUID()}-Pass!`;
const primaryEmail = `eventora-e2e-${testId}@example.invalid`;
const secondEmail = `eventora-e2e-seat-${testId}@example.invalid`;
const organizerEmail = `eventora-e2e-organizer-${testId}@example.invalid`;
const avatar = `data:image/png;base64,${Buffer.from('eventora-avatar-fixture').toString('base64')}`;

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json() as Record<string, any>;
  return { status: response.status, body };
}

async function register(email: string, name: string) {
  const response = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  assert.equal(response.status, 201, `registration failed: ${response.body.message}`);
  assert.ok(response.body.data?.token, 'registration should return an authentication token');
  return response.body.data.token as string;
}

async function cleanup() {
  await prisma.$transaction(async (tx) => {
    const testEvents = await tx.event.findMany({
      where: { slug: { startsWith: 'eventora-integration-' } },
      select: { id: true },
    });
    const eventIds = testEvents.map(({ id }) => id);
    if (eventIds.length) {
      await tx.checkIn.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.certificate.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.ticket.deleteMany({ where: { booking: { eventId: { in: eventIds } } } });
      await tx.payment.deleteMany({ where: { booking: { eventId: { in: eventIds } } } });
      await tx.booking.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.waitlistEntry.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.review.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    await tx.category.deleteMany({ where: { slug: { startsWith: 'integration-' } } });
    await tx.user.deleteMany({ where: { email: { startsWith: 'eventora-e2e-' } } });
  }, { maxWait: 15_000, timeout: 60_000 });
}

async function main() {
  const health = await request('/health');
  assert.equal(health.status, 200, 'API health check should report an available database');
  assert.equal(health.body.database, 'connected');

  const organizer = await prisma.user.create({
    data: {
      email: organizerEmail,
      name: 'Eventora Integration Organizer',
      role: 'ORGANIZER',
      passwordHash: 'not-used-by-integration-test',
    },
  });
  const category = await prisma.category.create({
    data: { name: `Integration ${testId}`, slug: `integration-${testId}` },
  });

  const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const event = await prisma.event.create({
    data: {
      title: 'Eventora Database Integration Test',
      slug: `eventora-integration-${testId}`,
      description: 'Temporary integration-test event for verifying database-backed registration and seat allocation.',
      categoryId: category.id,
      organizerId: organizer.id,
      status: 'PUBLISHED',
      startDate,
      endDate: new Date(startDate.getTime() + 60 * 60 * 1000),
      totalCapacity: 1,
      price: 0,
      isFree: true,
    },
  });
  const token = await register(primaryEmail, 'Eventora Integration Attendee');
  const secondToken = await register(secondEmail, 'Eventora Seat Limit Attendee');

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: primaryEmail, password }),
  });
  assert.equal(login.status, 200, `login failed: ${login.body.message}`);
  assert.ok(login.body.data?.token, 'login should return an authentication token');

  const listing = await request('/api/events?limit=100');
  assert.equal(listing.status, 200, `event listing failed: ${listing.body.message}`);
  assert.ok(
    listing.body.data?.items?.some((item: { id: string }) => item.id === event.id),
    'published integration event should appear in event discovery',
  );

  const profileUpdate = await request('/api/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ avatar, bio: 'Database integration profile test' }),
  });
  assert.equal(profileUpdate.status, 200, `profile update failed: ${profileUpdate.body.message}`);

  const profile = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(profile.status, 200, `profile fetch failed: ${profile.body.message}`);
  assert.equal(profile.body.data.avatar, avatar, 'uploaded avatar should persist after a profile refresh');
  const storedUser = await prisma.user.findUniqueOrThrow({ where: { email: primaryEmail } });
  assert.equal(storedUser.avatar, avatar, 'uploaded avatar should persist in PostgreSQL');

  const overLimit = await request('/api/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ eventId: event.id, seats: 2 }),
  });
  assert.equal(overLimit.status, 400, 'a booking exceeding event capacity should be rejected');

  const overRequestLimit = await request('/api/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ eventId: event.id, seats: 6 }),
  });
  assert.equal(overRequestLimit.status, 400, 'a booking exceeding the per-request seat limit should be rejected');

  const booking = await request('/api/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eventId: event.id, seats: 1 }),
  });
  assert.equal(booking.status, 201, `booking failed: ${booking.body.message}`);
  assert.equal(booking.body.data?.booking?.status, 'CONFIRMED');
  assert.equal(booking.body.data?.tickets?.length, 1, 'a free booking should issue one ticket');

  const noSeats = await request('/api/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ eventId: event.id, seats: 1 }),
  });
  assert.equal(noSeats.status, 400, 'a second attendee should not book the sold-out event');

  console.log('Database integration checks passed: registration, login, event listing, profile photo persistence, booking, and seat limits.');
}

main()
  .catch((error: unknown) => {
    console.error('Database integration checks failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error('Could not clean up isolated integration-test records:', error);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  });
