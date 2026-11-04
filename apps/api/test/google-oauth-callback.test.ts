import cookieParser from 'cookie-parser';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleAuthRouter } from '../src/routes/googleAuth';

let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;

afterEach(async () => {
  vi.unstubAllEnvs();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => error ? reject(error) : resolve());
    });
    server = undefined;
  }
});

async function startCallbackServer(): Promise<string> {
  const app = express();
  app.use(cookieParser());
  app.use('/api/auth/google', googleAuthRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe('Google OAuth callback routing', () => {
  it('handles the registered callback path and redirects a cancelled sign-in', async () => {
    vi.stubEnv('FRONTEND_URL', 'http://localhost:3000');
    const origin = await startCallbackServer();

    const response = await fetch(
      `${origin}/api/auth/google/callback?error=access_denied`,
      { redirect: 'manual' },
    );

    expect(response.status).toBe(302);
    const redirect = new URL(response.headers.get('location')!);
    expect(redirect.pathname).toBe('/login');
    expect(redirect.searchParams.get('google')).toBe('cancelled');
  });

  it('rejects callbacks without a matching state cookie', async () => {
    vi.stubEnv('FRONTEND_URL', 'http://localhost:3000');
    const origin = await startCallbackServer();

    const response = await fetch(
      `${origin}/api/auth/google/callback?state=unexpected&code=sample`,
      { redirect: 'manual' },
    );

    expect(response.status).toBe(302);
    expect(new URL(response.headers.get('location')!).searchParams.get('google')).toBe('failed');
  });
});
