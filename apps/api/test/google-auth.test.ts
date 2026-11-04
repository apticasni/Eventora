import { Role } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  findOrCreateGoogleUser,
  GoogleAccountError,
  GoogleUser,
  GoogleUserStore,
} from '../src/lib/googleAuth';

function makeUser(overrides: Partial<GoogleUser> = {}): GoogleUser {
  return {
    id: 'user-1',
    email: 'person@example.com',
    name: 'Existing Person',
    role: Role.ADMIN,
    googleId: null,
    avatar: null,
    ...overrides,
  };
}

function makeStore(overrides: Partial<GoogleUserStore> = {}): GoogleUserStore {
  return {
    findByGoogleId: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    linkGoogleIdentity: vi.fn(async (id, googleId, avatar) => makeUser({
      id,
      googleId,
      avatar,
    })),
    createGoogleUser: vi.fn(async (input) => makeUser(input)),
    ...overrides,
  };
}

const verifiedIdentity = {
  subject: 'google-subject-1',
  email: 'PERSON@example.com',
  emailVerified: true,
  name: 'Google Person',
  picture: 'https://example.com/avatar.jpg',
};

describe('Google account sign-in', () => {
  it('creates new users as verified attendees and never grants admin role', async () => {
    const store = makeStore();
    const user = await findOrCreateGoogleUser(store, verifiedIdentity);

    expect(store.createGoogleUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com',
      role: Role.ATTENDEE,
      googleId: verifiedIdentity.subject,
      isVerified: true,
    }));
    expect(user.role).toBe(Role.ATTENDEE);
  });

  it('links an existing verified-email user without changing the existing role', async () => {
    const existing = makeUser({ email: 'person@example.com', role: Role.ADMIN });
    const store = makeStore({ findByEmail: vi.fn().mockResolvedValue(existing) });

    const user = await findOrCreateGoogleUser(store, verifiedIdentity);

    expect(store.linkGoogleIdentity).toHaveBeenCalledWith(
      existing.id,
      verifiedIdentity.subject,
      verifiedIdentity.picture,
    );
    expect(user.role).toBe(Role.ADMIN);
    expect(store.createGoogleUser).not.toHaveBeenCalled();
  });

  it('rejects unverified Google emails', async () => {
    const store = makeStore();

    await expect(findOrCreateGoogleUser(store, {
      ...verifiedIdentity,
      emailVerified: false,
    })).rejects.toBeInstanceOf(GoogleAccountError);
    expect(store.createGoogleUser).not.toHaveBeenCalled();
    expect(store.linkGoogleIdentity).not.toHaveBeenCalled();
  });

  it('rejects an email already linked to a different Google identity', async () => {
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(makeUser({ googleId: 'another-subject' })),
    });

    await expect(findOrCreateGoogleUser(store, verifiedIdentity))
      .rejects.toBeInstanceOf(GoogleAccountError);
    expect(store.linkGoogleIdentity).not.toHaveBeenCalled();
  });

  it('returns an already-linked user without changing their role or profile', async () => {
    const existing = makeUser({
      email: 'person@example.com',
      role: Role.ORGANIZER,
      googleId: verifiedIdentity.subject,
    });
    const store = makeStore({
      findByGoogleId: vi.fn().mockResolvedValue(existing),
    });

    const user = await findOrCreateGoogleUser(store, verifiedIdentity);

    expect(user).toEqual(existing);
    expect(store.linkGoogleIdentity).not.toHaveBeenCalled();
    expect(store.createGoogleUser).not.toHaveBeenCalled();
  });
});
