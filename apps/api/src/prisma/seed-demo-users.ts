import { randomBytes } from 'node:crypto';
import { appendFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { seedDemoUsers } from './seed-demo-users-core';

config({ path: path.resolve(__dirname, '../../.env') });

const credentialsPath = path.resolve(__dirname, '../../../../demo-credentials.txt');

class SafeSeedError extends Error {}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--apply-production') {
    throw new SafeSeedError(
      'Refusing to run. Use `npm run db:seed-demo-users --workspace=apps/api -- --apply-production` to explicitly target production.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new SafeSeedError('DATABASE_URL is required; no database changes were made.');
  }

  let databaseHost: string;
  try {
    const parsedUrl = new URL(databaseUrl);
    if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
      throw new Error();
    }
    databaseHost = parsedUrl.hostname;
  } catch {
    throw new SafeSeedError('DATABASE_URL must be a valid PostgreSQL URL; no database changes were made.');
  }

  console.log(`Production database host: ${databaseHost}`);
  const prisma = new PrismaClient();
  let resultHeaderWritten = false;

  try {
    const existingAdmins = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (existingAdmins > 0) {
      console.log(`Preserved existing admin account(s): ${existingAdmins}.`);
    }

    const result = await seedDemoUsers(
      {
        findUnique: ({ where }) => prisma.user.findUnique({
          where,
          select: { id: true, role: true },
        }),
        create: ({ data }) => prisma.user.create({
          data,
          select: { id: true },
        }),
      },
      {
        hashPassword: (password) => bcrypt.hash(password, 12),
        generatePassword: () => randomBytes(24).toString('base64url'),
        onCreated: async (account) => {
          const record = resultHeaderWritten
            ? ''
            : `Eventora demo credentials generated ${new Date().toISOString()}\n`;
          const line = `${account.role}\t${account.name}\t${account.email}\t${account.password}\n`;
          await appendFile(credentialsPath, `${record}${line}`, { encoding: 'utf8', mode: 0o600 });
          resultHeaderWritten = true;
        },
      },
    );

    for (const account of result.existing) {
      const roleNote = account.expectedRole === account.existingRole
        ? `role ${account.existingRole}`
        : `existing role ${account.existingRole} (expected ${account.expectedRole}; left unchanged)`;
      console.log(`Already existed and preserved: ${account.email} (${roleNote}).`);
    }

    if (result.created.length === 0) {
      console.log('No accounts were created; existing accounts and their passwords were left unchanged.');
      return;
    }

    if (process.platform !== 'win32') {
      await chmod(credentialsPath, 0o600);
    }

    console.log(`Created ${result.created.length} demo account(s). Credentials saved to ${credentialsPath}.`);
    console.log('Generated login credentials (shown once):');
    for (const account of result.created) {
      console.log(`${account.role}\t${account.name}\t${account.email}\t${account.password}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (error instanceof SafeSeedError) {
      console.error(`Demo-user seeding failed: ${error.message}`);
    } else {
      console.error('Demo-user seeding failed. Database error details are withheld to protect connection credentials.');
    }
    process.exitCode = 1;
  });
}
