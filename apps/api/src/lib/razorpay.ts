import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';

function isPlaceholder(value: string): boolean {
  return !value || /sample|placeholder|your[-_ ]|xxxx|<|>|replace/i.test(value);
}

export function isRazorpayTestConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return keyId.startsWith('rzp_test_') && !isPlaceholder(keyId) && !isPlaceholder(secret);
}

export function isRazorpayWebhookConfigured(): boolean {
  return isRazorpayTestConfigured() && !isPlaceholder(process.env.RAZORPAY_WEBHOOK_SECRET || '');
}

export function isRazorpayOrderId(value: string): boolean {
  return /^order_[A-Za-z0-9]+$/.test(value);
}

export function isCapturedRazorpayPayment(
  payment: { status: string; order_id: string | null; amount: number; currency: string },
  expected: { orderId: string; amount: number; currency: string },
): boolean {
  return payment.status === 'captured' &&
    payment.order_id === expected.orderId &&
    payment.amount === expected.amount &&
    payment.currency === expected.currency;
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = process.env.RAZORPAY_KEY_SECRET || ''
): boolean {
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string = process.env.RAZORPAY_WEBHOOK_SECRET || ''
): boolean {
  if (!secret || !signature) return false;
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function getRazorpayInstance() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Razorpay = require('razorpay');
  if (!isRazorpayTestConfigured()) {
    throw new AppError(503, 'Payment service not configured. Set valid Razorpay test keys.');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export function availableSeats(totalCapacity: number, bookedSeats: number): number {
  return Math.max(0, totalCapacity - bookedSeats);
}

export function canAllocateSeats(totalCapacity: number, bookedSeats: number, seats: number): boolean {
  return seats > 0 && availableSeats(totalCapacity, bookedSeats) >= seats;
}
