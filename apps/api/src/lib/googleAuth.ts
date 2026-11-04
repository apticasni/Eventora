import { Role } from '@prisma/client';

export interface GoogleIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  picture?: string | null;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  googleId: string | null;
  avatar: string | null;
}

export interface GoogleUserStore {
  findByGoogleId(googleId: string): Promise<GoogleUser | null>;
  findByEmail(email: string): Promise<GoogleUser | null>;
  linkGoogleIdentity(id: string, googleId: string, avatar: string | null): Promise<GoogleUser>;
  createGoogleUser(input: {
    email: string;
    name: string;
    role: Role;
    googleId: string;
    avatar: string | null;
    isVerified: true;
  }): Promise<GoogleUser>;
}

export class GoogleAccountError extends Error {}

function assertSameIdentity(user: GoogleUser, identity: GoogleIdentity): GoogleUser {
  if (user.googleId && user.googleId !== identity.subject) {
    throw new GoogleAccountError('This email is already linked to another Google account.');
  }
  if (user.email.toLowerCase() !== identity.email.toLowerCase()) {
    throw new GoogleAccountError('Google account email does not match the linked account.');
  }
  return user;
}

async function linkOrReturn(
  store: GoogleUserStore,
  user: GoogleUser,
  identity: GoogleIdentity,
): Promise<GoogleUser> {
  assertSameIdentity(user, identity);
  if (user.googleId === identity.subject) return user;
  return store.linkGoogleIdentity(user.id, identity.subject, user.avatar || identity.picture || null);
}

export async function findOrCreateGoogleUser(
  store: GoogleUserStore,
  identity: GoogleIdentity,
): Promise<GoogleUser> {
  if (!identity.emailVerified || !identity.email || !identity.subject) {
    throw new GoogleAccountError('Google did not provide a verified email address.');
  }

  const normalizedIdentity = { ...identity, email: identity.email.trim().toLowerCase() };
  const linkedUser = await store.findByGoogleId(normalizedIdentity.subject);
  if (linkedUser) return assertSameIdentity(linkedUser, normalizedIdentity);

  const existingUser = await store.findByEmail(normalizedIdentity.email);
  if (existingUser) return linkOrReturn(store, existingUser, normalizedIdentity);

  try {
    return await store.createGoogleUser({
      email: normalizedIdentity.email,
      name: normalizedIdentity.name?.trim() || normalizedIdentity.email,
      role: Role.ATTENDEE,
      googleId: normalizedIdentity.subject,
      avatar: normalizedIdentity.picture || null,
      isVerified: true,
    });
  } catch (error) {
    const racedUser = await store.findByGoogleId(normalizedIdentity.subject)
      || await store.findByEmail(normalizedIdentity.email);
    if (!racedUser) throw error;
    return linkOrReturn(store, racedUser, normalizedIdentity);
  }
}
