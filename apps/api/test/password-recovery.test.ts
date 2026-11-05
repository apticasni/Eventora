import cookieParser from 'cookie-parser';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findFirst: vi.fn(), update: vi.fn() },
    passwordResetToken: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
  sendPasswordResetEmail: vi.fn(),
  canSendPasswordResetEmail: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('../src/lib/email', () => ({
  canSendPasswordResetEmail: mocks.canSendPasswordResetEmail,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  sendWelcomeEmail: vi.fn(),
}));

import { authRouter } from '../src/routes/auth';
import { errorHandler } from '../src/middleware/errorHandler';

let server: Server | undefined;

async function startServer(): Promise<string> {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function post(origin: string, path: string, body: unknown) {
  return fetch(`${origin}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => error ? reject(error) : resolve());
    });
    server = undefined;
  }
});

beforeEach(() => {
  mocks.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
    passwordResetToken: {
      create: mocks.prisma.passwordResetToken.create,
      updateMany: mocks.prisma.passwordResetToken.updateMany,
    },
    user: { update: mocks.prisma.user.update },
  }));
  mocks.sendPasswordResetEmail.mockResolvedValue(true);
  mocks.canSendPasswordResetEmail.mockReturnValue(true);
});

describe('password recovery', () => {
  it('returns the same generic response for existing and unknown addresses', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    mocks.prisma.user.findFirst
      .mockResolvedValueOnce({ id: 'user-1', email: 'person@example.com', name: 'Person' })
      .mockResolvedValueOnce(null);
    mocks.prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.passwordResetToken.create.mockResolvedValue({});
    const origin = await startServer();

    const existing = await post(origin, 'forgot-password', { email: 'person@example.com' });
    const unknown = await post(origin, 'forgot-password', { email: 'unknown@example.com' });

    expect(existing.status).toBe(200);
    expect(unknown.status).toBe(200);
    const existingBody = await existing.json();
    const unknownBody = await unknown.json();
    expect(existingBody).toEqual(unknownBody);
    expect(existingBody.message).not.toContain('person@example.com');
  });

  it('stores only a hash of a random token with a 15-minute expiry and mocks delivery', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'person@example.com', name: 'Person' });
    mocks.prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.passwordResetToken.create.mockResolvedValue({});
    const origin = await startServer();
    const before = Date.now();

    const response = await post(origin, 'forgot-password', { email: 'person@example.com' });

    expect(response.status).toBe(200);
    const [[{ data }]] = mocks.prisma.passwordResetToken.create.mock.calls;
    const [[, , token]] = mocks.sendPasswordResetEmail.mock.calls;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).not.toBe(token);
    expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(data.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000);
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('consumes a valid token atomically, updates the password, and invalidates other tokens', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const rawToken = 'a'.repeat(64);
    mocks.prisma.passwordResetToken.findFirst.mockResolvedValue({ id: 'token-1', userId: 'user-1' });
    mocks.prisma.passwordResetToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });
    mocks.prisma.user.update.mockResolvedValue({});
    const origin = await startServer();

    const response = await post(origin, 'reset-password', { token: rawToken, newPassword: 'new-password-123' });

    expect(response.status).toBe(200);
    const query = mocks.prisma.passwordResetToken.findFirst.mock.calls[0][0];
    expect(query.where.tokenHash).not.toBe(rawToken);
    expect(query.where.used).toBe(false);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { passwordHash: expect.stringMatching(/^\$2/) },
    }));
    expect(mocks.prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(2);
  });

  it('rejects reuse when an atomic consume finds the token already used', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    mocks.prisma.passwordResetToken.findFirst.mockResolvedValue({ id: 'token-1', userId: 'user-1' });
    mocks.prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    const origin = await startServer();

    const response = await post(origin, 'reset-password', { token: 'b'.repeat(64), newPassword: 'new-password-123' });

    expect(response.status).toBe(400);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it('rate limits password recovery requests by client address', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.prisma.user.findFirst.mockResolvedValue(null);
    const origin = await startServer();
    const responses = await Promise.all(Array.from({ length: 6 }, () =>
      post(origin, 'forgot-password', { email: 'person@example.com' }),
    ));

    expect(responses.slice(0, 5).every((response) => response.status === 200)).toBe(true);
    expect(responses[5].status).toBe(429);
  });
});
