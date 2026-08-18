// Postgres ek deposu — çok örnekli ve serverless dağıtımların (Vercel/Neon)
// çalışan seçeneği. Baytlar `AttachmentBlob.data` (bytea) içinde tutulur.
//
// Neden nesne deposu (S3/R2) değil: proje dış ücretli servis kullanmama
// ilkesini korur ve zaten bağlı olduğu Postgres dışında yeni bir altyapı
// gerektirmez. Dosya başına 10 MB, çalışma başına 200 MB kotası (attachment-policy)
// bu depolamayı makul sınırda tutar. Kota büyütülecekse nesne deposuna geçilmeli.

import { prisma } from "@/lib/prisma";
import type { IAttachmentStorage } from "@/application/ports/attachment-storage";

export class PrismaAttachmentStorage implements IAttachmentStorage {
  readonly name = "postgres";

  async put(input: { storageKey: string; workspaceId: string; data: Uint8Array; mimeType: string }): Promise<void> {
    // Prisma v6 `Bytes` alanı ArrayBuffer destekli bir Uint8Array bekler;
    // Node Buffer'ı (SharedArrayBuffer destekli olabilir) burada normalleştiririz.
    const bytes = Uint8Array.from(input.data);
    await prisma.attachmentBlob.upsert({
      where: { storageKey: input.storageKey },
      create: {
        storageKey: input.storageKey,
        workspaceId: input.workspaceId,
        mimeType: input.mimeType,
        size: bytes.byteLength,
        data: bytes,
      },
      update: { data: bytes, mimeType: input.mimeType, size: bytes.byteLength },
    });
  }

  async get(storageKey: string): Promise<Uint8Array | null> {
    const row = await prisma.attachmentBlob.findUnique({
      where: { storageKey },
      select: { data: true },
    });
    return row ? row.data : null;
  }
}
