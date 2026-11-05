import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: JwtPayload & { dbUser?: { id: string; role: string; name: string; email: string } };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
        select: { id: true, email: true, role: true, name: true, suspendedAt: true },
    });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
      if (user.suspendedAt) {
        res.status(403).json({ success: false, message: 'This account has been suspended. Contact support for assistance.' });
        return;
      }

    req.user = { ...payload, email: user.email, role: user.role, dbUser: user };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) {
    next();
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    next();
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, suspendedAt: true },
    });
    if (user && !user.suspendedAt) {
      req.user = { ...payload, email: user.email, role: user.role, dbUser: user };
    }
    next();
  } catch (err) {
    next(err);
  }
}
