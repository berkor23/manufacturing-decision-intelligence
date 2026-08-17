import "client-only";

import type { DiagnosisView } from "@/application/diagnosis-service";
import type { Conversation } from "@/application/ports/conversation-repository";
import type { MethodologyWorkspace } from "@/application/ports/methodology-workspace-repository";

const DATABASE_NAME = "mdi-guest-workspace";
const DATABASE_VERSION = 2;
const DIAGNOSES = "diagnoses";
const WORKSPACES = "workspaces";
const ATTACHMENTS = "attachments";

export interface GuestDiagnosisRecord {
  id: string;
  title: string;
  view: DiagnosisView;
  state: Conversation;
  createdAt: string;
  updatedAt: string;
}

export interface GuestWorkspaceRecord {
  id: string;
  workspace: MethodologyWorkspace;
  migrationStatus: "LOCAL" | "MIGRATED";
  cloudWorkspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Bu tarayıcı yerel çalışma deposunu desteklemiyor."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DIAGNOSES)) {
        const store = db.createObjectStore(DIAGNOSES, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains(WORKSPACES)) {
        const store = db.createObjectStore(WORKSPACES, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains(ATTACHMENTS)) {
        const store = db.createObjectStore(ATTACHMENTS, { keyPath: "key" });
        store.createIndex("workspaceId", "workspaceId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Yerel depo açılamadı."));
    request.onblocked = () => reject(new Error("Yerel depo başka bir sekme tarafından engelleniyor."));
  });
}

async function run<T>(
  storeName: typeof DIAGNOSES | typeof WORKSPACES | typeof ATTACHMENTS,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Yerel kayıt işlemi başarısız."));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error("Yerel kayıt işlemi tamamlanamadı."));
  });
}

export const isGuestWorkspaceId = (id: string) => id.startsWith("local_ws_");

export async function saveGuestDiagnosis(record: GuestDiagnosisRecord): Promise<void> {
  await run(DIAGNOSES, "readwrite", (store) => store.put(record));
}

export async function getGuestDiagnosis(id: string): Promise<GuestDiagnosisRecord | null> {
  return (await run<GuestDiagnosisRecord | undefined>(DIAGNOSES, "readonly", (store) => store.get(id))) ?? null;
}

export async function listGuestDiagnoses(): Promise<GuestDiagnosisRecord[]> {
  const rows = await run<GuestDiagnosisRecord[]>(DIAGNOSES, "readonly", (store) => store.getAll());
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveGuestWorkspace(workspace: MethodologyWorkspace): Promise<void> {
  const previous = await getGuestWorkspaceRecord(workspace.id);
  const now = new Date().toISOString();
  const record: GuestWorkspaceRecord = {
    id: workspace.id,
    workspace: { ...workspace, updatedAt: now },
    migrationStatus: previous?.migrationStatus ?? "LOCAL",
    cloudWorkspaceId: previous?.cloudWorkspaceId ?? null,
    createdAt: previous?.createdAt ?? workspace.createdAt ?? now,
    updatedAt: now,
  };
  await run(WORKSPACES, "readwrite", (store) => store.put(record));
}

export async function getGuestWorkspaceRecord(id: string): Promise<GuestWorkspaceRecord | null> {
  return (await run<GuestWorkspaceRecord | undefined>(WORKSPACES, "readonly", (store) => store.get(id))) ?? null;
}

export async function getGuestWorkspace(id: string): Promise<MethodologyWorkspace | null> {
  return (await getGuestWorkspaceRecord(id))?.workspace ?? null;
}

export async function listGuestWorkspaces(): Promise<GuestWorkspaceRecord[]> {
  const rows = await run<GuestWorkspaceRecord[]>(WORKSPACES, "readonly", (store) => store.getAll());
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteGuestWorkspace(id: string): Promise<void> {
  await run(WORKSPACES, "readwrite", (store) => store.delete(id));
}

export async function markGuestWorkspaceMigrated(id: string, cloudWorkspaceId: string): Promise<void> {
  const record = await getGuestWorkspaceRecord(id);
  if (!record) return;
  await run(WORKSPACES, "readwrite", (store) => store.put({
    ...record,
    migrationStatus: "MIGRATED",
    cloudWorkspaceId,
    updatedAt: new Date().toISOString(),
  }));
}

export async function requestDurableGuestStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

export async function guestStorageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  return navigator.storage.estimate();
}

export async function exportGuestWorkspace(id: string): Promise<Blob> {
  const record = await getGuestWorkspaceRecord(id);
  if (!record) throw new Error("Yerel çalışma bulunamadı.");
  return new Blob([JSON.stringify({ schemaVersion: 1, kind: "MDI_GUEST_WORKSPACE", ...record }, null, 2)], {
    type: "application/json",
  });
}

export async function saveGuestAttachment(workspaceId: string, attachmentId: string, blob: Blob): Promise<string> {
  const key = `${workspaceId}:${attachmentId}`;
  await run(ATTACHMENTS, "readwrite", (store) => store.put({ key, workspaceId, attachmentId, blob }));
  return key;
}

export async function getGuestAttachment(key: string): Promise<Blob | null> {
  const row = await run<{ blob: Blob } | undefined>(ATTACHMENTS, "readonly", (store) => store.get(key));
  return row?.blob ?? null;
}

export async function deleteGuestAttachment(key: string): Promise<void> {
  await run(ATTACHMENTS, "readwrite", (store) => store.delete(key));
}
