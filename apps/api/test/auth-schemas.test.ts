import { describe, expect, it } from 'vitest';
import {
  CreateBookingSchema,
  RegisterSchema,
  SaveEventSchema,
  SearchEventsSchema,
  UpdateProfileSchema,
  VerifyPaymentSchema,
} from '@eventora/shared';

describe('shared validation schemas', () => {
  it('rejects admin self-registration', () => {
    const result = RegisterSchema.safeParse({
      name: 'Hacker',
      email: 'hacker@example.com',
      password: 'Password1',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('caps seats per booking', () => {
    expect(CreateBookingSchema.safeParse({ eventId: 'clxxxxxxxxxxxxxxxxxxxx', seats: 6 }).success).toBe(false);
    expect(CreateBookingSchema.safeParse({ eventId: 'clxxxxxxxxxxxxxxxxxxxx', seats: 2 }).success).toBe(true);
  });

  it('requires payment verification fields', () => {
    expect(VerifyPaymentSchema.safeParse({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'sig',
      bookingId: 'clxxxxxxxxxxxxxxxxxxxx',
    }).success).toBe(true);
  });

  it('accepts supported, size-limited uploaded profile photos', () => {
    expect(UpdateProfileSchema.safeParse({
      avatar: `data:image/jpeg;base64,${'A'.repeat(100)}`,
    }).success).toBe(true);
    expect(UpdateProfileSchema.safeParse({
      avatar: `data:image/svg+xml;base64,${'A'.repeat(100)}`,
    }).success).toBe(false);
    expect(UpdateProfileSchema.safeParse({
      avatar: `data:image/jpeg;base64,${'A'.repeat(300_000)}`,
    }).success).toBe(false);
  });

  it('validates phone numbers in profile updates', () => {
    expect(UpdateProfileSchema.safeParse({ phone: '+1 (415) 555-0132' }).success).toBe(true);
    expect(UpdateProfileSchema.safeParse({ phone: '555-EXT-123' }).success).toBe(false);
  });

  it('accepts combined event discovery filters and rejects invalid ranges', () => {
    expect(SearchEventsSchema.safeParse({
      city: 'Toronto',
      minPrice: '10',
      maxPrice: '50',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      available: 'true',
      isFree: 'false',
      page: '2',
      limit: '9',
    }).success).toBe(true);
    expect(SearchEventsSchema.safeParse({ startDate: 'not-a-date' }).success).toBe(false);
    expect(SearchEventsSchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(SearchEventsSchema.safeParse({ minPrice: '50', maxPrice: '10' }).success).toBe(false);
    expect(SearchEventsSchema.safeParse({ startDate: '2026-08-01', endDate: '2026-07-01' }).success).toBe(false);
  });

  it('requires a valid event identifier when saving an event', () => {
    expect(SaveEventSchema.safeParse({ eventId: 'clxxxxxxxxxxxxxxxxxxxx' }).success).toBe(true);
    expect(SaveEventSchema.safeParse({ eventId: '' }).success).toBe(false);
  });
});
