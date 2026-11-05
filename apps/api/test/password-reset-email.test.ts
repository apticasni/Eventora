import nodemailer from 'nodemailer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canSendPasswordResetEmail, sendPasswordResetEmail } from '../src/lib/email';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('password reset email delivery', () => {
  it('never sends or logs reset links during local development or tests', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SMTP_HOST', 'smtp.example.invalid');
    vi.stubEnv('SMTP_USER', 'test-user');
    vi.stubEnv('SMTP_PASS', 'test-password');
    const createTransport = vi.spyOn(nodemailer, 'createTransport');

    await expect(sendPasswordResetEmail('person@example.com', 'Person', 'sensitive-token'))
      .resolves.toBe(false);

    expect(createTransport).not.toHaveBeenCalled();
  });

  it('keeps password recovery disabled outside production even with local SMTP settings', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SMTP_HOST', 'smtp.example.invalid');
    vi.stubEnv('SMTP_USER', 'test-user');
    vi.stubEnv('SMTP_PASS', 'test-password');

    expect(canSendPasswordResetEmail()).toBe(false);
  });

  it('enables recovery only for a complete valid production SMTP configuration', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMTP_HOST', 'smtp.example.invalid');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_SECURE', 'false');
    vi.stubEnv('SMTP_USER', 'test-user');
    vi.stubEnv('SMTP_PASS', 'test-password');
    const createTransport = vi.spyOn(nodemailer, 'createTransport');

    expect(canSendPasswordResetEmail()).toBe(true);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('puts the one-time token in the URL fragment, not the request path or query', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', 'https://events.example');
    vi.stubEnv('SMTP_HOST', 'smtp.example.invalid');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_SECURE', 'false');
    vi.stubEnv('SMTP_USER', 'test-user');
    vi.stubEnv('SMTP_PASS', 'test-password');
    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never);

    await expect(sendPasswordResetEmail('person@example.com', 'Person', 'private-reset-token'))
      .resolves.toBe(true);

    const message = sendMail.mock.calls[0][0];
    expect(message.html).toContain('https://events.example/reset-password#token=private-reset-token');
    expect(message.html).not.toContain('/reset-password?token=');
  });
});
