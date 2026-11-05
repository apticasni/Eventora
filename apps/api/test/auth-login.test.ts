import cookieParser from 'cookie-parser';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

vi.mock('../src/routes/googleAuth', async () => {
  const { Router } = await import('express');
  return { googleAuthRouter: Router() };
});

import { prisma } from '../src/lib/prisma';
import { errorHandler } from '../src/middleware/errorHandler';
import { verifyToken } from '../src/lib/jwt';
import { authRouter } from '../src/routes/auth';

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
  vi.stubEnv('NODE_ENV', 'test');
});

async function startAuthServer(): Promise<string> {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function postLogin(origin: string, email = 'admin@eventora.com', password = 'valid-local-password') {
  return fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

describe('password login', () => {
  it('authenticates an admin with a valid password hash and issues an admin session', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@eventora.com',
      name: 'Local Admin',
      role: 'ADMIN',
      passwordHash: 'bcrypt-hash',
      avatar: null,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
    const origin = await startAuthServer();

    const response = await postLogin(origin);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(bcrypt.compare).toHaveBeenCalledWith('valid-local-password', 'bcrypt-hash');
    expect(body.data.user.role).toBe('ADMIN');
    expect(verifyToken(body.data.token)).toMatchObject({ userId: 'admin-1', role: 'ADMIN' });
    expect(response.headers.get('set-cookie')).toContain('token=');
  });

  it('rejects an incorrect password without issuing a session', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@eventora.com',
      name: 'Local Admin',
      role: 'ADMIN',
      passwordHash: 'bcrypt-hash',
      avatar: null,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const origin = await startAuthServer();

    const response = await postLogin(origin, 'admin@eventora.com', 'incorrect-password');
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe('Invalid email or password.');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('rejects an unknown account without attempting password comparison', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const origin = await startAuthServer();

    const response = await postLogin(origin);

    expect(response.status).toBe(401);
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
