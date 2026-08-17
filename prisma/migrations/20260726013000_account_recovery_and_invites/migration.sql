CREATE TYPE "CredentialTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'INVITATION');

ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "CredentialToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "type" "CredentialTokenType" NOT NULL,
  "userId" TEXT NOT NULL,
  "membershipId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CredentialToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CredentialToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "CredentialToken_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "CredentialToken_tokenHash_key" ON "CredentialToken"("tokenHash");
CREATE INDEX "CredentialToken_userId_type_idx" ON "CredentialToken"("userId", "type");
CREATE INDEX "CredentialToken_membershipId_idx" ON "CredentialToken"("membershipId");
CREATE INDEX "CredentialToken_expiresAt_idx" ON "CredentialToken"("expiresAt");

-- Mevcut kullanıcılar hesap dönüşümünden önce sisteme girebildikleri için doğrulanmış kabul edilir.
UPDATE "User" SET "emailVerifiedAt" = COALESCE("lastLoginAt", "createdAt") WHERE "emailVerifiedAt" IS NULL;
