import cookieParser from 'cookie-parser';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Role } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const oauthMocks = vi.hoisted(() => ({
  clientArgs: [] as unknown[][],
  generateCodeVerifierAsync: vi.fn(),
  generateAuthUrl: vi.fn(),
  getToken: vi.fn(),
  verifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  CodeChallengeMethod: { S256: 'S256' },
  OAuth2Client: class FakeOAuth2Client {
    constructor(...args: unknown[]) {
      oauthMocks.clientArgs.push(args);
    }

    generateCodeVerifierAsync(...args: unknown[]) {
      return oauthMocks.generateCodeVerifierAsync(...args);
    }

    generateAuthUrl(options: Record<string, unknown>) {
      return oauthMocks.generateAuthUrl(options);
    }

    getToken(options: Record<string, unknown>) {
      return oauthMocks.getToken(options);
    }

    verifyIdToken(options: Record<string, unknown>) {
      return oauthMocks.verifyIdToken(options);
    }
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma';
import { errorHandler } from '../src/middleware/errorHandler';
import { googleAuthRouter } from '../src/routes/googleAuth';

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

beforeEach(() => {
  vi.clearAllMocks();
  oauthMocks.clientArgs.length = 0;
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
  vi.stubEnv('GOOGLE_CALLBACK_URL', 'http://localhost:4000/api/auth/google/callback');
  vi.stubEnv('FRONTEND_URL', 'http://localhost:3000');
  oauthMocks.generateCodeVerifierAsync.mockResolvedValue({
    codeVerifier: 'test-code-verifier',
    codeChallenge: 'test-code-challenge',
  });
  oauthMocks.generateAuthUrl.mockImplementation((options: Record<string, unknown>) => {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    for (const [key, value] of Object.entries(options)) {
      url.searchParams.set(key, Array.isArray(value) ? value.join(' ') : String(value));
    }
    const clientOptions = oauthMocks.clientArgs.at(-1);
    url.searchParams.set('redirect_uri', String(clientOptions?.[2]));
    return url.toString();
  });
  oauthMocks.getToken.mockResolvedValue({ tokens: { id_token: 'test-id-token' } });
  oauthMocks.verifyIdToken.mockResolvedValue({
    getPayload: () => ({
      sub: 'google-subject-1',
      email: 'new.person@example.com',
      email_verified: true,
      name: 'New Person',
    }),
  });
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
});

async function startOAuthServer(): Promise<string> {
  const app = express();
  app.use(cookieParser());
  app.use('/api/auth/google', googleAuthRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function beginSignIn(origin: string, redirect?: string) {
  const url = new URL('/api/auth/google', origin);
  if (redirect) url.searchParams.set('redirect', redirect);
  const response = await fetch(url, { redirect: 'manual' });
  const location = new URL(response.headers.get('location')!);
  const cookie = response.headers.get('set-cookie')!.split(';', 1)[0];
  return { response, location, cookie };
}

async function finishSignIn(origin: string, state: string, cookie: string) {
  const callback = new URL('/api/auth/google/callback', origin);
  callback.searchParams.set('state', state);
  callback.searchParams.set('code', 'test-authorization-code');
  return fetch(callback, {
    redirect: 'manual',
    headers: { Cookie: cookie },
  });
}

describe('Google OAuth end-to-end routing', () => {
  it('completes sign-in from the plain login page with no requested redirect', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'attendee-1',
      email: 'new.person@example.com',
      name: 'New Person',
      role: Role.ATTENDEE,
      googleId: 'google-subject-1',
      avatar: null,
    } as never);
    const origin = await startOAuthServer();

    const started = await beginSignIn(origin);
    const stateCookie = started.cookie.slice(started.cookie.indexOf('=') + 1);
    const state = stateCookie.split('.')[0];
    const response = await finishSignIn(origin, state, started.cookie);
    const frontendRedirect = new URL(response.headers.get('location')!);

    expect(started.response.status).toBe(302);
    expect(started.location.hostname).toBe('accounts.google.com');
    expect(started.location.searchParams.get('redirect_uri'))
      .toBe('http://localhost:4000/api/auth/google/callback');
    expect(started.location.searchParams.get('state')).toBe(state);
    expect(started.location.searchParams.get('code_challenge')).toBe('test-code-challenge');
    expect(stateCookie.split('.')[2]).toBe('-');
    expect(oauthMocks.getToken).toHaveBeenCalledWith({
      code: 'test-authorization-code',
      codeVerifier: 'test-code-verifier',
    });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: Role.ATTENDEE, googleId: 'google-subject-1' }),
    }));
    expect(response.status).toBe(302);
    expect(frontendRedirect.origin).toBe('http://localhost:3000');
    expect(frontendRedirect.pathname).toBe('/login');
    expect(frontendRedirect.searchParams.get('google')).toBe('success');
    expect(frontendRedirect.searchParams.get('redirect')).toBe('/dashboard/bookings');
    expect(response.headers.get('set-cookie')).toContain('token=');
  });

  it('preserves an existing admin role and returns an admin to the admin page', async () => {
    const existingAdmin = {
      id: 'admin-1',
      email: 'new.person@example.com',
      name: 'Existing Admin',
      role: Role.ADMIN,
      googleId: null,
      avatar: null,
    };
    vi.mocked(prisma.user.findFirst).mockResolvedValue(existingAdmin as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...existingAdmin,
      googleId: 'google-subject-1',
    } as never);
    const origin = await startOAuthServer();

    const started = await beginSignIn(origin);
    const state = started.cookie.slice(started.cookie.indexOf('=') + 1).split('.')[0];
    const response = await finishSignIn(origin, state, started.cookie);
    const frontendRedirect = new URL(response.headers.get('location')!);

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'admin-1' },
      data: expect.objectContaining({ googleId: 'google-subject-1' }),
    }));
    expect(frontendRedirect.searchParams.get('google')).toBe('success');
    expect(frontendRedirect.searchParams.get('redirect')).toBe('/admin');
  });

  it('rejects a mismatched state before exchanging the authorization code', async () => {
    const origin = await startOAuthServer();
    const started = await beginSignIn(origin);
    const response = await finishSignIn(origin, 'wrong-state', started.cookie);

    expect(new URL(response.headers.get('location')!).searchParams.get('google')).toBe('failed');
    expect(oauthMocks.getToken).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns a clear failed sign-in status when Google rejects token exchange', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    oauthMocks.getToken.mockRejectedValue(new Error('provider failure'));
    const origin = await startOAuthServer();
    const started = await beginSignIn(origin);
    const state = started.cookie.slice(started.cookie.indexOf('=') + 1).split('.')[0];
    const response = await finishSignIn(origin, state, started.cookie);

    expect(new URL(response.headers.get('location')!).searchParams.get('google')).toBe('failed');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
