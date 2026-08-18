// Ek deposu seçimi: ATTACHMENT_STORAGE=disk (varsayılan) | postgres
//
// Varsayılan `disk`, mevcut tek makineli kurulumun davranışını korur.
// Serverless/çok örnekli dağıtımda `postgres` seçilmelidir.

import type { IAttachmentStorage } from "@/application/ports/attachment-storage";
import { LocalDiskAttachmentStorage } from "./local-disk-attachment-storage";
import { PrismaAttachmentStorage } from "./prisma-attachment-storage";

export function createAttachmentStorage(): IAttachmentStorage {
  const mode = (process.env.ATTACHMENT_STORAGE ?? "disk").toLowerCase();
  if (mode === "postgres") return new PrismaAttachmentStorage();
  return new LocalDiskAttachmentStorage();
}
