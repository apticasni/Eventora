import crypto from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  availableSeats,
  canAllocateSeats,
  isCapturedRazorpayPayment,
  isRazorpayOrderId,
  isRazorpayTestConfigured,
  isRazorpayWebhookConfigured,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../src/lib/razorpay';

afterEach(() => vi.unstubAllEnvs());

describe('seat allocation', () => {
  it('prevents overbooking', () => {
    expect(availableSeats(10, 8)).toBe(2);
    expect(canAllocateSeats(10, 8, 2)).toBe(true);
    expect(canAllocateSeats(10, 8, 3)).toBe(false);
    expect(canAllocateSeats(10, 10, 1)).toBe(false);
    expect(availableSeats(5, 9)).toBe(0);
  });
});

describe('Razorpay Test Mode configuration', () => {
  it('accepts only complete non-placeholder Test Mode credentials', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_abc123def456');
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'test_mode_secret_value');
    expect(isRazorpayTestConfigured()).toBe(true);

    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_abc123def456');
    expect(isRazorpayTestConfigured()).toBe(false);
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_<your-key-id>');
    expect(isRazorpayTestConfigured()).toBe(false);
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_abc123def456');
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    expect(isRazorpayTestConfigured()).toBe(false);
  });

  it('requires a separate configured webhook secret alongside Test Mode keys', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_abc123def456');
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'test_mode_secret_value');
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', '');
    expect(isRazorpayWebhookConfigured()).toBe(false);
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'test_webhook_secret_value');
    expect(isRazorpayWebhookConfigured()).toBe(true);
  });

  it('recognizes Razorpay order IDs and rejects local demo placeholders', () => {
    expect(isRazorpayOrderId('order_1A2b3C')).toBe(true);
    expect(isRazorpayOrderId('demo_order_event')).toBe(false);
    expect(isRazorpayOrderId('order_dev_123')).toBe(false);
  });
});

describe('Razorpay payment and webhook signature verification', () => {
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

  it('accepts only captured payments matching the stored order, amount, and currency', () => {
    const payment = { status: 'captured', order_id: 'order_test123', amount: 299900, currency: 'INR' };
    const expected = { orderId: 'order_test123', amount: 299900, currency: 'INR' };
    expect(isCapturedRazorpayPayment(payment, expected)).toBe(true);
    expect(isCapturedRazorpayPayment({ ...payment, status: 'authorized' }, expected)).toBe(false);
    expect(isCapturedRazorpayPayment({ ...payment, amount: 1 }, expected)).toBe(false);
    expect(isCapturedRazorpayPayment({ ...payment, order_id: 'order_other' }, expected)).toBe(false);
    expect(isCapturedRazorpayPayment({ ...payment, currency: 'USD' }, expected)).toBe(false);
  });
});
