import { randomBytes } from 'node:crypto';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { demoAccounts, seedDemoUsers } from '../src/prisma/seed-demo-users-core';

function createStore(initialUsers: Array<{
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  isVerified: boolean;
}> = []) {
  const users = new Map(initialUsers.map((user) => [user.email, user]));
  const store = {
    findUnique: vi.fn(async ({ where }: { where: { email: string } }) => {
      const user = users.get(where.email);
      return user ? { id: user.id, role: user.role } : null;
    }),
    create: vi.fn(async ({ data }: {
      data: {
        email: string;
        name: string;
        role: Role;
        passwordHash: string;
        isVerified: boolean;
      };
    }) => {
      const user = { ...data, id: `id-${users.size}` };
      users.set(data.email, user);
      return { id: user.id };
    }),
  };
  return { store, users };
}

describe('demo user seeding', () => {
  it('creates one admin, five organizers, and five attendees with login-compatible password hashes', async () => {
    const { store, users } = createStore();
    let passwordIndex = 0;
    const { created, existing } = await seedDemoUsers(store, {
      generatePassword: () => `generated-password-${++passwordIndex}`,
      hashPassword: (password) => bcrypt.hash(password, 4),
    });

    expect(created).toHaveLength(11);
    expect(existing).toHaveLength(0);
    expect(created.filter((user) => user.role === Role.ADMIN)).toHaveLength(1);
    expect(created.filter((user) => user.role === Role.ORGANIZER)).toHaveLength(5);
    expect(created.filter((user) => user.role === Role.ATTENDEE)).toHaveLength(5);
    expect(new Set(created.map((user) => user.email)).size).toBe(11);
    expect(created.every((user) => user.email.endsWith('@eventora.demo'))).toBe(true);
    expect(new Set(created.map((user) => user.password)).size).toBe(11);

    for (const account of created) {
      const storedUser = users.get(account.email);
      expect(storedUser?.role).toBe(account.role);
      expect(storedUser?.isVerified).toBe(true);
      expect(await bcrypt.compare(account.password, storedUser!.passwordHash)).toBe(true);
    }
  });

  it('is idempotent and never changes an existing account or password', async () => {
    const productionAdmin = {
      id: 'existing-admin',
      email: demoAccounts[0].email,
      name: 'Existing Admin',
      role: Role.ADMIN,
      passwordHash: 'existing-hash',
      isVerified: false,
    };
    const { store, users } = createStore([productionAdmin]);
    let passwordIndex = 0;
    const dependencies = {
      generatePassword: () => `unique-password-${++passwordIndex}`,
      hashPassword: async (password: string) => `hashed:${password}`,
    };

    const firstRun = await seedDemoUsers(store, dependencies);
    const existingAfterFirstRun = users.get(productionAdmin.email);
    const createsAfterFirstRun = store.create.mock.calls.length;
    const secondRun = await seedDemoUsers(store, dependencies);

    expect(firstRun.existing).toEqual([expect.objectContaining({
      email: productionAdmin.email,
      existingRole: Role.ADMIN,
    })]);
    expect(firstRun.created).toHaveLength(10);
    expect(secondRun.created).toHaveLength(0);
    expect(secondRun.existing).toHaveLength(11);
    expect(store.create).toHaveBeenCalledTimes(createsAfterFirstRun);
    expect(users.get(productionAdmin.email)).toEqual(existingAfterFirstRun);
    expect(passwordIndex).toBe(10);
  });

  it('keeps existing users unchanged even if their role differs from the demo role', async () => {
    const existingUser = {
      id: 'existing-user',
      email: demoAccounts[0].email,
      name: 'Existing Account',
      role: Role.ATTENDEE,
      passwordHash: 'unchanged-hash',
      isVerified: true,
    };
    const { store, users } = createStore([existingUser]);

    const result = await seedDemoUsers(store, {
      generatePassword: () => randomBytes(24).toString('base64url'),
      hashPassword: (password) => bcrypt.hash(password, 4),
    });

    expect(result.existing[0]).toMatchObject({
      email: existingUser.email,
      expectedRole: Role.ADMIN,
      existingRole: Role.ATTENDEE,
    });
    expect(users.get(existingUser.email)).toEqual(existingUser);
    expect(store.create).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: existingUser.email }),
    }));
  });

  it('preserves an account created concurrently instead of failing or replacing it', async () => {
    const otherExistingUsers = demoAccounts.slice(1).map((account, index) => ({
      ...account,
      id: `existing-${index}`,
      passwordHash: 'unchanged-hash',
      isVerified: true,
    }));
    const { store, users } = createStore(otherExistingUsers);
    store.create = vi.fn(async ({ data }) => {
      users.set(data.email, { ...data, id: 'concurrent-account' });
      throw new Error('unique email constraint');
    });

    const result = await seedDemoUsers(store, {
      generatePassword: () => randomBytes(24).toString('base64url'),
      hashPassword: (password) => bcrypt.hash(password, 4),
    });

    expect(result.created).toHaveLength(0);
    expect(result.existing).toHaveLength(11);
    expect(users.get(demoAccounts[0].email)).toMatchObject({
      id: 'concurrent-account',
      role: Role.ADMIN,
    });
  });
});
