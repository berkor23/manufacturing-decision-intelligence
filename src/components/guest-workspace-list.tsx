"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  deleteGuestWorkspace,
  exportGuestWorkspace,
  listGuestWorkspaces,
  type GuestWorkspaceRecord,
} from "@/lib/guest-storage";
import { stepIsComplete } from "@/domain/playbook";
import { LocalStorageNotice } from "@/components/local-storage-notice";

export function GuestWorkspaceList() {
  const [records, setRecords] = useState<GuestWorkspaceRecord[] | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try { setRecords(await listGuestWorkspaces()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Yerel çalışmalar okunamadı."); }
  }, []);

  useEffect(() => {
    let active = true;
    listGuestWorkspaces().then((rows) => { if (active) setRecords(rows); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Yerel çalışmalar okunamadı."); });
    return () => { active = false; };
  }, []);

  async function remove(record: GuestWorkspaceRecord) {
    if (!window.confirm(`“${record.workspace.problemDescription.slice(0, 80)}” çalışması yalnızca bu tarayıcıdan kaldırılacak. Devam edilsin mi?`)) return;
    await deleteGuestWorkspace(record.id);
    await refresh();
  }

  async function download(record: GuestWorkspaceRecord) {
    const blob = await exportGuestWorkspace(record.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mdi-yerel-${record.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <LocalStorageNotice />
    {error && <p className="alert alert-error mt-4">{error}</p>}
    {records === null && <div className="card mt-5 p-6 text-sm text-[var(--muted)]">Yerel çalışmalar aranıyor…</div>}
    {records?.length === 0 && <section className="empty-state mt-5"><div><h2 className="text-lg font-semibold text-[var(--ink)]">Henüz yerel çalışmanız yok</h2><p className="mt-2 max-w-md text-sm">Bir üretim veya kalite problemini anlatın; teşhisten oluşturduğunuz çalışma burada görünecek.</p><Link href="/diagnoz" className="btn btn-primary mt-5">Üye olmadan teşhise başla</Link></div></section>}
    {records && records.length > 0 && <div className="mt-5 grid gap-3">
      {records.map((record) => {
        const ws = record.workspace;
        const done = ws.steps.filter((step) => stepIsComplete(step.status)).length;
        return <article key={record.id} className="card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="tag state-ink">Tarayıcıda</span>{record.migrationStatus === "MIGRATED" && <span className="tag state-ok">Buluta aktarıldı</span>}<span className="text-xs text-[var(--muted-2)]">{ws.methodologyName}</span></div><h2 className="mt-2 font-semibold leading-6">{ws.problemDescription}</h2><p className="mt-2 text-xs text-[var(--muted)]">{done}/{ws.steps.length} adım tamamlandı · Son kayıt {new Date(record.updatedAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}</p></div>
            <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void download(record)} className="btn btn-secondary">Yedek al</button><button type="button" onClick={() => void remove(record)} className="btn btn-secondary text-[var(--st-risk)]">Kaydı kaldır</button><Link href={`/workspace/${record.id}`} className="btn btn-primary">Devam et</Link></div>
          </div>
        </article>;
      })}
    </div>}
    {records && records.length > 0 && <section className="card mt-6 p-5"><h2 className="font-semibold">Bu çalışmaları başka cihazda da görmek ister misiniz?</h2><p className="mt-1 text-sm text-[var(--muted)]">Üyelik açtıktan sonra hangi yerel çalışmaların hesabınıza taşınacağını siz seçersiniz.</p><div className="mt-4 flex gap-2"><Link href="/kayit" className="btn btn-primary">Üye ol ve taşı</Link><Link href="/giris" className="btn btn-secondary">Hesabım var</Link></div></section>}
  </>;
}
