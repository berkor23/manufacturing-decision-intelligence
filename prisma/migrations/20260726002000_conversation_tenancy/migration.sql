ALTER TABLE "ConversationRecord"
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "organizationId" TEXT;

CREATE INDEX "ConversationRecord_ownerUserId_idx" ON "ConversationRecord"("ownerUserId");
CREATE INDEX "ConversationRecord_organizationId_idx" ON "ConversationRecord"("organizationId");
