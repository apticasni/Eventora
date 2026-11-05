import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import type { NextFunction, Response } from 'express';
import { prisma } from '../src/lib/prisma';
import { optionalAuth, requireAuth, requireRole, AuthRequest } from '../src/middleware/auth';
import { signToken } from '../src/lib/jwt';

describe('authentication middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the current database role instead of a stale token role', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ATTENDEE',
      name: 'User',
    } as never);

    const req = {
      cookies: {},
      headers: {
        authorization: `Bearer ${signToken({
          userId: 'user-1',
          email: 'user@example.com',
          role: 'ADMIN',
        })}`,
      },
    } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(req.user?.role).toBe('ATTENDEE');
    expect(next).toHaveBeenCalledOnce();
  });

  it('blocks suspended accounts from authenticated requests', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ATTENDEE',
      name: 'User',
      suspendedAt: new Date(),
    } as never);
    const req = {
      cookies: {
        token: signToken({ userId: 'user-1', email: 'user@example.com', role: 'ATTENDEE' }),
      },
      headers: {},
    } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('enforces privileged roles in middleware', () => {
    const req = { user: { userId: 'user-1', email: 'user@example.com', role: 'ATTENDEE' } } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireRole('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('uses the current database role for optional authentication', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ATTENDEE',
      name: 'User',
      suspendedAt: null,
    } as never);
    const req = {
      cookies: {
        token: signToken({ userId: 'user-1', email: 'user@example.com', role: 'ADMIN' }),
      },
      headers: {},
    } as AuthRequest;
    const next = vi.fn() as NextFunction;

    await optionalAuth(req, {} as Response, next);

    expect(req.user?.role).toBe('ATTENDEE');
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not attach suspended users to optional requests', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
      name: 'User',
      suspendedAt: new Date(),
    } as never);
    const req = {
      cookies: {
        token: signToken({ userId: 'user-1', email: 'user@example.com', role: 'ADMIN' }),
      },
      headers: {},
    } as AuthRequest;
    const next = vi.fn() as NextFunction;

    await optionalAuth(req, {} as Response, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('requires a strong JWT secret in production', () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    try {
      expect(() => signToken({
        userId: 'user-1',
        email: 'user@example.com',
        role: 'ATTENDEE',
      })).toThrow('JWT_SECRET must be configured in production.');
    } finally {
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});
