ALTER TABLE "RcaRecord"
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "organizationId" TEXT;

CREATE INDEX "RcaRecord_ownerUserId_idx" ON "RcaRecord"("ownerUserId");
CREATE INDEX "RcaRecord_organizationId_idx" ON "RcaRecord"("organizationId");
