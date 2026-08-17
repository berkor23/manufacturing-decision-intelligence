-- Ek dosya baytları için depolama tablosu.
-- Yerel disk yalnız tek makineli kurulumda çalışır; serverless/çok örnekli
-- dağıtımda dosyalar örnekler arasında paylaşılmaz ve dağıtımda kaybolur.
CREATE TABLE "AttachmentBlob" (
  "storageKey"  TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "mimeType"    TEXT NOT NULL,
  "size"        INTEGER NOT NULL,
  "data"        BYTEA NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AttachmentBlob_pkey" PRIMARY KEY ("storageKey")
);

CREATE INDEX "AttachmentBlob_workspaceId_idx" ON "AttachmentBlob"("workspaceId");
