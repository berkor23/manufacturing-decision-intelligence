-- CreateTable
CREATE TABLE "ConversationRecord" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RcaRecord" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RcaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceRecord" (
    "id" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationRecord_status_idx" ON "ConversationRecord"("status");

-- CreateIndex
CREATE INDEX "WorkspaceRecord_methodology_idx" ON "WorkspaceRecord"("methodology");
