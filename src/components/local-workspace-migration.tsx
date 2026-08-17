"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { workspacePatch } from "@/components/workspace/workspace-api";
import { getGuestAttachment, listGuestWorkspaces, markGuestWorkspaceMigrated, type GuestWorkspaceRecord } from "@/lib/guest-storage";

export function LocalWorkspaceMigration({ targetLabel }: { targetLabel: string }) {
  const [records, setRecords] = useState<GuestWorkspaceRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void listGuestWorkspaces().then((rows) => {
      const local = rows.filter((row) => row.migrationStatus === "LOCAL");
      setRecords(local);
      setSelected(new Set(local.map((row) => row.id)));
    }).catch(() => undefined);
  }, []);

  const chosen = useMemo(() => records.filter((record) => selected.has(record.id)), [records, selected]);
  if (!records.length) return null;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function migrate() {
    if (!chosen.length) return;
    setBusy(true); setMessage("");
    let completed = 0;
    try {
      for (const record of chosen) {
        const patch = workspacePatch(record.workspace);
        const response = await fetch("/api/account/local-workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            localId: record.id,
            methodology: record.workspace.methodology,
            problemDescription: record.workspace.problemDescription,
            data: { ...patch, attachments: [] },
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Aktarım tamamlanamadı.");
        const cloudResponse = await fetch(`/api/workspace/${result.id}`, { cache: "no-store" });
        const cloud = cloudResponse.ok ? await cloudResponse.json() as { attachments?: { originalName:string;size:number;targetType:string;targetId:string|null }[] } : {};
        const existingFiles = new Set((cloud.attachments ?? []).map((item) => `${item.originalName}:${item.size}:${item.targetType}:${item.targetId ?? ""}`));
        for (const attachment of record.workspace.attachments) {
          const signature = `${attachment.originalName}:${attachment.size}:${attachment.targetType}:${attachment.targetId ?? ""}`;
          if (existingFiles.has(signature)) continue;
          const blob = await getGuestAttachment(attachment.storageKey);
          if (!blob) throw new Error(`${attachment.originalName} adlı yerel dosya bulunamadı; çalışma aktarıldı ancak işlem tamamlanmadı.`);
          const form = new FormData();
          form.set("file", new File([blob], attachment.originalName, { type: attachment.mimeType }));
          form.set("targetType", attachment.targetType);
          form.set("targetId", attachment.targetId ?? "");
          form.set("description", attachment.description);
          const upload = await fetch(`/api/workspace/${result.id}/attachments`, { method: "POST", body: form });
          if (!upload.ok) {
            const uploadError = await upload.json().catch(() => ({}));
            throw new Error(uploadError.error ?? `${attachment.originalName} dosyası aktarılamadı.`);
          }
        }
        await markGuestWorkspaceMigrated(record.id, result.id);
        completed += 1;
      }
      setRecords((current) => current.filter((record) => !selected.has(record.id)));
      setSelected(new Set());
      setMessage(`${completed} çalışma ${targetLabel} alanına aktarıldı. Yerel kopyalar güvenlik için silinmedi.`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (cause) {
      setMessage(`${completed} çalışma aktarıldı. ${cause instanceof Error ? cause.message : "Kalan kayıtlar aktarılamadı."}`);
    } finally { setBusy(false); }
  }

  return <section className="card card-accent-indigo mt-6 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Bu tarayıcıda yerel kayıt bulundu</p><h2 className="mt-1 text-[15px] font-semibold tracking-[-0.012em]">Çalışmalarınızı buluta taşımak ister misiniz?</h2><p className="mt-1 text-sm text-[var(--muted)]">Yalnızca seçtikleriniz {targetLabel} alanına aktarılır. Yerel kopyalar aktarım sonrasında otomatik silinmez.</p></div><Link href="/yerel-calismalar" className="btn btn-secondary">Yerel kayıtları incele</Link></div><div className="mt-4 grid gap-2">{records.map((record) => <label key={record.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--rule)] p-3 hover:border-[var(--rule-strong)]"><input type="checkbox" className="mt-1 h-4 w-4" checked={selected.has(record.id)} onChange={() => toggle(record.id)} /><span className="min-w-0"><strong className="block text-sm">{record.workspace.problemDescription}</strong><span className="text-xs text-[var(--muted-2)]">{record.workspace.methodologyName} · Son kayıt {new Date(record.updatedAt).toLocaleString("tr-TR")}</span></span></label>)}</div><div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="btn btn-primary" disabled={busy || !chosen.length} onClick={() => void migrate()}>{busy ? "Aktarılıyor…" : `${chosen.length} çalışmayı buluta taşı`}</button><span className="text-xs text-[var(--muted)]">Aktarım sırasında içerik sunucuda yeniden doğrulanır.</span></div>{message && <p role="status" className="mt-3 rounded-xl bg-[var(--surface-sunk)] p-3 text-sm text-[var(--ink-soft)]">{message}</p>}</section>;
}
