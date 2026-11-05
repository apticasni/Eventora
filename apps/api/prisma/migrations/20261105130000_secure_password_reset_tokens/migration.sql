UPDATE "PasswordResetOTP" SET "otp" = '', "used" = true;

ALTER TABLE "PasswordResetOTP" RENAME COLUMN "otp" TO "tokenHash";

CREATE INDEX "PasswordResetOTP_tokenHash_idx" ON "PasswordResetOTP"("tokenHash");
