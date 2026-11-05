import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { signToken, getCookieOptions } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { canSendPasswordResetEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../lib/email';
import { PASSWORD_RECOVERY_RATE_LIMIT_MAX } from '../lib/rateLimits';
import { googleAuthRouter } from './googleAuth';
import {
  ForgotPasswordSchema, RegisterSchema, LoginSchema, ResetPasswordSchema, UpdateProfileSchema,
} from '@eventora/shared';

export const authRouter = Router();
authRouter.use('/google', googleAuthRouter);

const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: PASSWORD_RECOVERY_RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many password recovery attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

// POST /api/auth/register
authRouter.post('/register', validateBody(RegisterSchema), async (req, res: Response, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'An account with this email already exists.');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role || 'ATTENDEE' },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie('token', token, getCookieOptions());

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      },
    });
  } catch (err) { next(err); }
});

// POST /api/auth/login
authRouter.post('/login', validateBody(LoginSchema), async (req, res: Response, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new AppError(401, 'Invalid email or password.');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password.');

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie('token', token, getCookieOptions());

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      },
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res: Response) => {
  res.clearCookie('token', getCookieOptions());
  res.json({ success: true, message: 'Logged out successfully' });
});

const PASSWORD_RESET_LIFETIME_MS = 15 * 60 * 1000;
const PASSWORD_RECOVERY_MESSAGE = 'If an account exists for that address, password-reset instructions will be sent.';

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', passwordRecoveryLimiter, validateBody(ForgotPasswordSchema), async (req, res: Response, next) => {
  try {
    if (canSendPasswordResetEmail()) {
      const email = req.body.email.trim();
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, name: true },
      });

      if (user) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_LIFETIME_MS);

        await prisma.$transaction(async (tx) => {
          await tx.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
          });
          await tx.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
          });
        });

        void sendPasswordResetEmail(user.email, user.name, token).catch(() => {
          // Never log reset tokens, message bodies, or recipient details.
          console.error('Password reset email delivery failed.');
        });
      }
    }

    res.json({ success: true, message: PASSWORD_RECOVERY_MESSAGE });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', passwordRecoveryLimiter, validateBody(ResetPasswordSchema), async (req, res: Response, next) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    });
    if (!resetRecord) throw new AppError(400, 'Invalid or expired reset link.');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const resetSucceeded = await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetRecord.id,
          tokenHash,
          used: false,
          expiresAt: { gt: now },
        },
        data: { used: true },
      });
      if (consumed.count !== 1) return false;

      await tx.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({
        where: { userId: resetRecord.userId, used: false },
        data: { used: true },
      });
      return true;
    });

    if (!resetSucceeded) throw new AppError(400, 'Invalid or expired reset link.');
    res.json({ success: true, message: 'Password reset successfully. Please sign in with your new password.' });
  } catch (err) { next(err); }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, bio: true, phone: true, interests: true, isVerified: true, createdAt: true,
      },
    });
    if (!user) throw new AppError(404, 'User not found.');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PUT /api/auth/profile
authRouter.put('/profile', requireAuth, validateBody(UpdateProfileSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, bio, phone, avatar, interests } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name, bio, phone, avatar, interests },
      select: { id: true, name: true, email: true, role: true, avatar: true, bio: true, phone: true, interests: true },
    });
    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (err) { next(err); }
});
