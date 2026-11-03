import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken, getCookieOptions } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { sendWelcomeEmail, sendPasswordResetOTP } from '../lib/email';
import {
  RegisterSchema, LoginSchema, ForgotPasswordSchema,
  ResetPasswordSchema, UpdateProfileSchema,
} from '@eventora/shared';

export const authRouter = Router();

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

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, bio: true, interests: true, isVerified: true, createdAt: true,
      },
    });
    if (!user) throw new AppError(404, 'User not found.');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PUT /api/auth/profile
authRouter.put('/profile', requireAuth, validateBody(UpdateProfileSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, bio, avatar, interests } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name, bio, avatar, interests },
      select: { id: true, name: true, email: true, role: true, avatar: true, bio: true, interests: true },
    });
    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', validateBody(ForgotPasswordSchema), async (req, res: Response, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await prisma.passwordResetOTP.create({
        data: { userId: user.id, otp, expiresAt },
      });

      sendPasswordResetOTP(user.email, user.name, otp).catch(console.error);
    }

    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If an account with that email exists, a reset OTP has been sent.' });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', validateBody(ResetPasswordSchema), async (req, res: Response, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(400, 'Invalid OTP or email.');

    const record = await prisma.passwordResetOTP.findFirst({
      where: { userId: user.id, otp, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new AppError(400, 'Invalid or expired OTP.');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetOTP.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) { next(err); }
});
