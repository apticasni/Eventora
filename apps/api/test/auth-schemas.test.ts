import { describe, expect, it } from 'vitest';
import {
  CreateBookingSchema,
  RegisterSchema,
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
});
