import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import {
  availableSeats,
  canAllocateSeats,
  isRazorpayLiveConfigured,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../src/lib/razorpay';

describe('seat allocation', () => {
  it('prevents overbooking', () => {
    expect(availableSeats(10, 8)).toBe(2);
    expect(canAllocateSeats(10, 8, 2)).toBe(true);
    expect(canAllocateSeats(10, 8, 3)).toBe(false);
    expect(canAllocateSeats(10, 10, 1)).toBe(false);
    expect(availableSeats(5, 9)).toBe(0);
  });
});

describe('Razorpay signature verification', () => {
  const secret = 'test_webhook_secret_value';

  it('accepts a valid HMAC-SHA256 payment signature', () => {
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
  });

  it('rejects tampered signatures', () => {
    expect(verifyRazorpaySignature('order_1', 'pay_1', 'deadbeef', secret)).toBe(false);
    expect(verifyRazorpaySignature('order_1', 'pay_1', '', secret)).toBe(false);
  });

  it('verifies webhook bodies with timing-safe comparison', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(body, 'nope', secret)).toBe(false);
  });

  it('does not treat sample keys as live Razorpay configuration', () => {
    const prevId = process.env.RAZORPAY_KEY_ID;
    const prevSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_sample123456';
    process.env.RAZORPAY_KEY_SECRET = 'sample_razorpay_secret_test';
    expect(isRazorpayLiveConfigured()).toBe(false);
    process.env.RAZORPAY_KEY_ID = prevId;
    process.env.RAZORPAY_KEY_SECRET = prevSecret;
  });

  it('does not enable live Razorpay credentials when the app is configured for Test Mode', () => {
    const prevId = process.env.RAZORPAY_KEY_ID;
    const prevSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_live_example';
    process.env.RAZORPAY_KEY_SECRET = 'configured_secret';
    try {
      expect(isRazorpayLiveConfigured()).toBe(false);
    } finally {
      if (prevId === undefined) delete process.env.RAZORPAY_KEY_ID;
      else process.env.RAZORPAY_KEY_ID = prevId;
      if (prevSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = prevSecret;
    }
  });
});
