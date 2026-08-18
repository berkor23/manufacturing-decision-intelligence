// Yerel disk ek deposu — tek makineli kurulumun varsayılanı.
//
// Dosyalar `storage/evidence/{workspaceId}/{attachmentId}{ext}` altında tutulur.
// Yol geçişi (`../`) `safeAttachmentPath` ile engellenir: storageKey kayıttan
// gelir ve güvenilmez girdi gibi ele alınır.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { IAttachmentStorage } from "@/application/ports/attachment-storage";
import { safeAttachmentPath } from "@/infrastructure/persistence/attachment-policy";

export class LocalDiskAttachmentStorage implements IAttachmentStorage {
  readonly name = "disk";

  private root() {
    return path.resolve(process.cwd(), "storage", "evidence");
  }

  async put(input: { storageKey: string; workspaceId: string; data: Uint8Array; mimeType: string }): Promise<void> {
    const root = this.root();
    const filePath = safeAttachmentPath(root, input.storageKey);
    const directory = path.resolve(root, input.workspaceId);
    if (!filePath || !directory.startsWith(root + path.sep)) {
      throw new Error("Geçersiz depolama yolu.");
    }
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, input.data);
  }

  async get(storageKey: string): Promise<Uint8Array | null> {
    const filePath = safeAttachmentPath(this.root(), storageKey);
    if (!filePath) return null;
    try {
      return await readFile(filePath);
    } catch {
      return null;
    }
  }
}
