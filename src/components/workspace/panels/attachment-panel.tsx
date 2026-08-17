"use client";

// Kanıt dosyaları: yükleme, hedefe bağlama ve indirme.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useState } from "react";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { deleteGuestAttachment, getGuestAttachment, saveGuestAttachment, saveGuestWorkspace } from "@/lib/guest-storage";

export function AttachmentPanel({
  workspace,
  onFresh,
  localMode = false,
}: {
  workspace: WsData;
  onFresh: (ws: WsData) => void;
  localMode?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<
    "WORKSPACE" | "EVIDENCE" | "CLAIM" | "ACTION" | "STEP"
  >("WORKSPACE");
  const [targetId, setTargetId] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targets =
    targetType === "EVIDENCE"
      ? workspace.evidence.map((x) => [x.id, x.title])
      : targetType === "CLAIM"
        ? workspace.claims.map((x) => [x.id, x.statement])
        : targetType === "ACTION"
          ? workspace.actions.map((x) => [x.id ?? "", x.action])
          : targetType === "STEP"
            ? workspace.steps.map((x) => [x.key, x.key])
            : [];
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (localMode) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Dosya 10 MB sınırını aşıyor.");
        const allowed = ["image/jpeg","image/png","image/webp","application/pdf","text/csv","text/plain","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
        if (!allowed.includes(file.type) && !/\.(xls|xlsx|csv|txt)$/i.test(file.name)) throw new Error("Bu dosya türü desteklenmiyor.");
        const id = `attachment_${crypto.randomUUID()}`;
        const storageKey = await saveGuestAttachment(workspace.id, id, file);
        const fresh: WsData = { ...workspace, attachments: [...workspace.attachments, { id, originalName:file.name, storageKey, mimeType:file.type||"application/octet-stream", size:file.size, targetType, targetId:targetId||null, description, uploadedAt:new Date().toISOString() }] };
        await saveGuestWorkspace(fresh);
        onFresh(fresh);
        setFile(null); setDescription("");
        return;
      }
      const form = new FormData();
      form.set("file", file);
      form.set("targetType", targetType);
      form.set("targetId", targetId);
      form.set("description", description);
      const res = await fetch(`/api/workspace/${workspace.id}/attachments`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yüklenemedi.");
      onFresh(data);
      setFile(null);
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }
  async function openLocal(storageKey: string, name: string) {
    const blob = await getGuestAttachment(storageKey);
    if (!blob) { setError("Yerel dosya bu tarayıcıda bulunamadı."); return; }
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href=url; anchor.download=name; anchor.click(); URL.revokeObjectURL(url);
  }
  async function removeLocal(storageKey: string, attachmentId: string) {
    if (!window.confirm("Bu dosya kanıtı yalnızca bu tarayıcıdan kaldırılacak. Devam edilsin mi?")) return;
    await deleteGuestAttachment(storageKey);
    const fresh={...workspace,attachments:workspace.attachments.filter((item)=>item.id!==attachmentId)};
    await saveGuestWorkspace(fresh); onFresh(fresh);
  }
  return (
    <section className="card p-6">
      <p className="eyebrow">Dosya kanıtları</p>
      <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
        Fotoğraf, rapor ve ölçüm dosyaları
      </h2>
      <p className="mt-1 text-xs text-[var(--muted-2)]">
        JPEG/PNG/WebP, PDF, CSV, TXT ve Excel · en fazla 10 MB. Dosyayı doğrudan
        ilgili iddia, kanıt, aksiyon veya adıma bağla.
      </p>
      <div className="mt-4 grid gap-2 lg:grid-cols-5">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,text/csv,text/plain,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field lg:col-span-2"
        />
        <select
          className="field"
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value as typeof targetType);
            setTargetId("");
          }}
        >
          <option value="WORKSPACE">Genel çalışma</option>
          <option value="EVIDENCE">Kanıta bağla</option>
          <option value="CLAIM">İddiaya bağla</option>
          <option value="ACTION">Aksiyona bağla</option>
          <option value="STEP">Adıma bağla</option>
        </select>
        <select
          className="field"
          disabled={targetType === "WORKSPACE"}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Hedef seç</option>
          {targets.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!file || busy || (targetType !== "WORKSPACE" && !targetId)}
          onClick={upload}
        >
          {busy ? "Yükleniyor…" : "Dosyayı yükle"}
        </button>
      </div>
      <input
        className="field mt-2"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Dosyanın neyi kanıtladığını açıklayın"
      />
      {error && <p className="mt-2 text-xs text-[var(--st-risk)]">{error}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {workspace.attachments.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-[var(--rule)] p-3 text-sm hover:border-[var(--rule-strong)]"
          >
            <div className="flex justify-between gap-2">
              <strong className="truncate">{a.originalName}</strong>
              <span className="shrink-0 text-xs text-[var(--muted-2)]">
                {Math.ceil(a.size / 1024)} KB
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {a.targetType}
              {a.targetId ? ` · ${a.targetId}` : ""}
              {a.description ? ` · ${a.description}` : ""}
            </p>
            <div className="mt-2 flex gap-2">{localMode ? <><button type="button" className="text-xs font-semibold text-[var(--ink)]" onClick={()=>void openLocal(a.storageKey,a.originalName)}>Dosyayı indir</button><button type="button" className="text-xs font-semibold text-[var(--st-risk)]" onClick={()=>void removeLocal(a.storageKey,a.id)}>Kaydı kaldır</button></> : <a className="text-xs font-semibold text-[var(--ink)]" href={`/api/workspace/${workspace.id}/attachments/${a.id}`}>Dosyayı indir</a>}</div>
          </div>
        ))}
        {workspace.attachments.length === 0 && (
          <p className="text-sm text-[var(--muted-2)]">
            Henüz dosya kanıtı yüklenmedi.
          </p>
        )}
      </div>
    </section>
  );
}
