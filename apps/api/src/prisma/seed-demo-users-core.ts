import { Role } from '@prisma/client';

export const demoAccounts = [
  { name: 'Eventora Demo Admin', email: 'admin@eventora.demo', role: Role.ADMIN },
  { name: 'Ananya Rao', email: 'ananya.rao@eventora.demo', role: Role.ORGANIZER },
  { name: 'Rohan Mehta', email: 'rohan.mehta@eventora.demo', role: Role.ORGANIZER },
  { name: 'Meera Iyer', email: 'meera.iyer@eventora.demo', role: Role.ORGANIZER },
  { name: 'Arjun Nair', email: 'arjun.nair@eventora.demo', role: Role.ORGANIZER },
  { name: 'Kavya Shah', email: 'kavya.shah@eventora.demo', role: Role.ORGANIZER },
  { name: 'Aarav Kapoor', email: 'aarav.kapoor@eventora.demo', role: Role.ATTENDEE },
  { name: 'Isha Verma', email: 'isha.verma@eventora.demo', role: Role.ATTENDEE },
  { name: 'Dev Malhotra', email: 'dev.malhotra@eventora.demo', role: Role.ATTENDEE },
  { name: 'Sana Qureshi', email: 'sana.qureshi@eventora.demo', role: Role.ATTENDEE },
  { name: 'Nikhil Desai', email: 'nikhil.desai@eventora.demo', role: Role.ATTENDEE },
] as const;

interface DemoUserStore {
  findUnique: (args: { where: { email: string } }) => Promise<{
    id: string;
    role: Role;
  } | null>;
  create: (args: {
    data: {
      email: string;
      name: string;
      role: Role;
      passwordHash: string;
      isVerified: boolean;
    };
  }) => Promise<{ id: string }>;
}

interface SeedDependencies {
  hashPassword: (password: string) => Promise<string>;
  generatePassword: () => string;
  onCreated?: (account: CreatedDemoAccount) => Promise<void>;
}

export interface CreatedDemoAccount {
  name: string;
  email: string;
  role: Role;
  password: string;
}

export interface ExistingDemoAccount {
  name: string;
  email: string;
  expectedRole: Role;
  existingRole: Role;
}

export async function seedDemoUsers(
  users: DemoUserStore,
  dependencies: SeedDependencies,
): Promise<{ created: CreatedDemoAccount[]; existing: ExistingDemoAccount[] }> {
  const created: CreatedDemoAccount[] = [];
  const existing: ExistingDemoAccount[] = [];
  const generatedPasswords = new Set<string>();

  for (const account of demoAccounts) {
    const user = await users.findUnique({ where: { email: account.email } });
    if (user) {
      existing.push({
        name: account.name,
        email: account.email,
        expectedRole: account.role,
        existingRole: user.role,
      });
      continue;
    }

    let password = dependencies.generatePassword();
    let attempts = 1;
    while (generatedPasswords.has(password) && attempts < 5) {
      password = dependencies.generatePassword();
      attempts += 1;
    }
    if (generatedPasswords.has(password)) {
      throw new Error('Password generator did not produce a unique demo password.');
    }
    generatedPasswords.add(password);

    const passwordHash = await dependencies.hashPassword(password);
    try {
      await users.create({
        data: {
          email: account.email,
          name: account.name,
          role: account.role,
          passwordHash,
          isVerified: true,
        },
      });
    } catch (error) {
      const concurrentUser = await users.findUnique({ where: { email: account.email } });
      if (!concurrentUser) {
        throw error;
      }
      existing.push({
        name: account.name,
        email: account.email,
        expectedRole: account.role,
        existingRole: concurrentUser.role,
      });
      continue;
    }

    const createdAccount = { ...account, password };
    await dependencies.onCreated?.(createdAccount);
    created.push(createdAccount);
  }

  return { created, existing };
}
