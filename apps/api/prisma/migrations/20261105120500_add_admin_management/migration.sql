CREATE TYPE "ReviewModerationStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');
CREATE TYPE "SupportRequestCategory" AS ENUM ('BOOKING', 'PAYMENT', 'EVENT', 'ACCOUNT', 'OTHER');
CREATE TYPE "SupportRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED');

ALTER TABLE "User"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;

ALTER TABLE "Review"
  ADD COLUMN "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "moderationReason" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3),
  ADD COLUMN "moderatedById" TEXT;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "beforeData" JSONB,
  "afterData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportRequest" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "SupportRequestCategory" NOT NULL DEFAULT 'OTHER',
  "status" "SupportRequestStatus" NOT NULL DEFAULT 'NEW',
  "eventId" TEXT,
  "bookingId" TEXT,
  "assignedAdminId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportNote" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "internal" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportRequest_reference_key" ON "SupportRequest"("reference");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");
CREATE INDEX "SupportRequest_requesterId_createdAt_idx" ON "SupportRequest"("requesterId", "createdAt");
CREATE INDEX "SupportRequest_assignedAdminId_status_idx" ON "SupportRequest"("assignedAdminId", "status");
CREATE INDEX "SupportRequest_eventId_idx" ON "SupportRequest"("eventId");
CREATE INDEX "SupportRequest_bookingId_idx" ON "SupportRequest"("bookingId");
CREATE INDEX "SupportNote_requestId_createdAt_idx" ON "SupportNote"("requestId", "createdAt");
CREATE INDEX "Review_moderationStatus_createdAt_idx" ON "Review"("moderationStatus", "createdAt");
CREATE INDEX "Review_moderatedById_idx" ON "Review"("moderatedById");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_moderatedById_fkey"
  FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportRequest"
  ADD CONSTRAINT "SupportRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupportRequest_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SupportRequest_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SupportRequest_assignedAdminId_fkey"
  FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportNote"
  ADD CONSTRAINT "SupportNote_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SupportNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
