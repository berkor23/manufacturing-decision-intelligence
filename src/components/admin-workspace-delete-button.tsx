"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminWorkspaceDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const confirmed = window.confirm(
      `“${name}” çalışmasını kalıcı olarak kaldırmak istediğinizden emin misiniz?\n\nBu işlem çalışma verilerini ve yüklenmiş kanıt dosyalarını siler; geri alınamaz.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/workspaces/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Çalışma kaldırılamadı.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Çalışma kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return <span className="inline-flex flex-col items-end gap-1">
    <button type="button" onClick={remove} disabled={busy} className="text-xs font-semibold text-red-600 hover:underline disabled:cursor-wait disabled:opacity-50">
      {busy ? "Kaldırılıyor…" : "Kaydı kaldır"}
    </button>
    {error && <small role="alert" className="max-w-52 text-right text-[10px] text-red-600">{error}</small>}
  </span>;
}
