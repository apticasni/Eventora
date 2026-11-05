import cookieParser from 'cookie-parser';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authRouter } from '../src/routes/auth';
import { errorHandler } from '../src/middleware/errorHandler';

let server: Server | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => error ? reject(error) : resolve());
    });
    server = undefined;
  }
});

async function startAuthServer(): Promise<string> {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe('authentication routes', () => {
  it('mounts password-recovery endpoints and validates their requests', async () => {
    const origin = await startAuthServer();
    const cases = [
      ['/api/auth/forgot-password', { email: 'not-an-email' }],
      ['/api/auth/reset-password', { token: 'short', newPassword: 'password' }],
    ];

    for (const [path, body] of cases) {
      const response = await fetch(`${origin}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }

    const removedLegacyOtpRoute = await fetch(`${origin}/api/auth/verify-reset-otp`, { method: 'POST' });
    expect(removedLegacyOtpRoute.status).toBe(404);
  });

  it('keeps regular login and registration routes active', async () => {
    const origin = await startAuthServer();

    const login = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const registration = await fetch(`${origin}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(login.status).toBe(400);
    expect(registration.status).toBe(400);
  });

  it('keeps the Google OAuth entry route mounted', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.stubEnv('GOOGLE_CALLBACK_URL', '');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const origin = await startAuthServer();

    const response = await fetch(`${origin}/api/auth/google`, { redirect: 'manual' });

    expect(response.status).toBe(503);
  });
});
