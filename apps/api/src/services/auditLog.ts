import { Prisma } from '@prisma/client';

type AuditTransaction = Pick<Prisma.TransactionClient, 'auditLog'>;

export async function writeAuditLog(
  tx: AuditTransaction,
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    reason: string;
    beforeData?: Prisma.InputJsonValue;
    afterData?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      ...(input.beforeData !== undefined ? { beforeData: input.beforeData } : {}),
      ...(input.afterData !== undefined ? { afterData: input.afterData } : {}),
    },
  });
}
