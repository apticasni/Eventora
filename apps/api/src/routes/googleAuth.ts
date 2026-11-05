import { randomBytes, timingSafeEqual } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCookieOptions, signToken } from '../lib/jwt';
import { AppError } from '../middleware/errorHandler';
import { findOrCreateGoogleUser, GoogleAccountError } from '../lib/googleAuth';
import { getGoogleOAuthConfig, GoogleOAuthConfig } from '../lib/googleOAuthConfig';
import { DEFAULT_AUTH_REDIRECT, getSafeRedirectPath } from '@eventora/shared';

export const googleAuthRouter = Router();

const STATE_COOKIE = 'eventora_google_oauth';
const STATE_COOKIE_MAX_AGE = 10 * 60 * 1000;

function getOAuthConfig(): GoogleOAuthConfig {
  try {
    return getGoogleOAuthConfig();
  } catch {
    throw new AppError(503, 'Google sign-in is not configured correctly.');
  }
}

function getOAuthClient(config = getOAuthConfig()): OAuth2Client {
  return new OAuth2Client(config.clientId, config.clientSecret, config.callbackUrl);
}

function getFrontendLoginUrl(
  status: 'success' | 'cancelled' | 'failed',
  redirect = DEFAULT_AUTH_REDIRECT,
): string {
  const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')[0]
    .trim();
  const loginUrl = new URL('/login', frontendOrigin);
  loginUrl.searchParams.set('google', status);
  loginUrl.searchParams.set('redirect', getSafeRedirectPath(redirect));
  return loginUrl.toString();
}

function getRedirectFromStateCookie(storedState: unknown): string {
  if (typeof storedState !== 'string') return DEFAULT_AUTH_REDIRECT;
  const [, , encodedRedirect, ...extra] = storedState.split('.');
  if (!encodedRedirect || extra.length) return DEFAULT_AUTH_REDIRECT;
  try {
    return getSafeRedirectPath(Buffer.from(encodedRedirect, 'base64url').toString('utf8'));
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

function clearStateCookie(res: Response): void {
  res.clearCookie(STATE_COOKIE, {
    ...getCookieOptions(),
    maxAge: undefined,
    sameSite: 'lax',
    path: '/api/auth/google',
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

googleAuthRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = getOAuthConfig();
    const client = getOAuthClient(config);
    const state = randomBytes(32).toString('base64url');
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    const cookieOptions = getCookieOptions();
    const requestedRedirect = getSafeRedirectPath(
      typeof req.query.redirect === 'string' ? req.query.redirect : null,
    );
    const encodedRedirect = Buffer.from(requestedRedirect).toString('base64url');

    res.cookie(STATE_COOKIE, `${state}.${codeVerifier}.${encodedRedirect}`, {
      ...cookieOptions,
      maxAge: STATE_COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/api/auth/google',
    });

    res.redirect(client.generateAuthUrl({
      access_type: 'online',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    }));
  } catch (error) {
    next(error);
  }
});

googleAuthRouter.get('/callback', async (req: Request, res: Response) => {
  const storedState = req.cookies?.[STATE_COOKIE];
  const redirect = getRedirectFromStateCookie(storedState);
  const queryError = typeof req.query.error === 'string' ? req.query.error : null;
  if (queryError === 'access_denied') {
    clearStateCookie(res);
    res.redirect(getFrontendLoginUrl('cancelled', redirect));
    return;
  }

  const returnedState = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const [expectedState, codeVerifier, encodedRedirect, ...extra] = typeof storedState === 'string'
    ? storedState.split('.')
    : [];
  clearStateCookie(res);

  if (
    !expectedState
    || !codeVerifier
    || !encodedRedirect
    || extra.length > 0
    || !safeEqual(expectedState, returnedState)
    || !code
  ) {
    res.redirect(getFrontendLoginUrl('failed', redirect));
    return;
  }

  try {
    const config = getOAuthConfig();
    const client = getOAuthClient(config);
    const { tokens } = await client.getToken({ code, codeVerifier });
    if (!tokens.id_token) throw new Error('Missing Google ID token.');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      res.redirect(getFrontendLoginUrl('failed', redirect));
      return;
    }

    const user = await findOrCreateGoogleUser({
      findByGoogleId: (googleId) => prisma.user.findUnique({
        where: { googleId },
        select: { id: true, email: true, name: true, role: true, googleId: true, avatar: true },
      }),
      findByEmail: (email) => prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, name: true, role: true, googleId: true, avatar: true },
      }),
      linkGoogleIdentity: (id, googleId, avatar) => prisma.user.update({
        where: { id },
        data: { googleId, isVerified: true, ...(avatar ? { avatar } : {}) },
        select: { id: true, email: true, name: true, role: true, googleId: true, avatar: true },
      }),
      createGoogleUser: (data) => prisma.user.create({
        data: { ...data, role: Role.ATTENDEE },
        select: { id: true, email: true, name: true, role: true, googleId: true, avatar: true },
      }),
    }, {
      subject: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
    });

    res.cookie('token', signToken({ userId: user.id, email: user.email, role: user.role }), getCookieOptions());
    res.redirect(getFrontendLoginUrl('success', redirect));
  } catch (error) {
    if (error instanceof GoogleAccountError) {
      res.redirect(getFrontendLoginUrl('failed', redirect));
      return;
    }
    console.error('Google sign-in callback failed.');
    res.redirect(getFrontendLoginUrl('failed', redirect));
  }
});
