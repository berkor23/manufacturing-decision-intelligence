-- B2C/B2B hesapları, üyelikler, oturumlar ve çalışma sahipliği.
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

ALTER TABLE "WorkspaceRecord"
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "accountType" "AccountType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_accountType_idx" ON "User"("accountType");

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "seatLimit" INTEGER NOT NULL DEFAULT 5,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "jobTitle" TEXT,
  "department" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
CREATE INDEX "Membership_organizationId_status_idx" ON "Membership"("organizationId", "status");

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

CREATE TABLE "ActivityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "workspaceId" TEXT,
  "type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ActivityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE INDEX "ActivityEvent_userId_occurredAt_idx" ON "ActivityEvent"("userId", "occurredAt");
CREATE INDEX "ActivityEvent_organizationId_occurredAt_idx" ON "ActivityEvent"("organizationId", "occurredAt");
CREATE INDEX "ActivityEvent_workspaceId_idx" ON "ActivityEvent"("workspaceId");
CREATE INDEX "WorkspaceRecord_ownerUserId_idx" ON "WorkspaceRecord"("ownerUserId");
CREATE INDEX "WorkspaceRecord_organizationId_idx" ON "WorkspaceRecord"("organizationId");
CREATE INDEX "WorkspaceRecord_archivedAt_idx" ON "WorkspaceRecord"("archivedAt");
