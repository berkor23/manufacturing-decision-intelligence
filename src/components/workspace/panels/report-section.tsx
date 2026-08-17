"use client";

// Profesyonel kapanış raporu bölümü.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useState } from "react";
import Link from "next/link";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { Markdown } from "@/components/markdown";
import { officialReportBlockers, type WorkspaceReportKind } from "@/domain/workspace-report";

export function ReportSection({
  workspace,
  workspaceId,
  report,
  doneCount,
  total,
  dirty,
  ensureSaved,
  onReport,
}: {
  workspace: WsData;
  workspaceId: string;
  report: string | null;
  doneCount: number;
  total: number;
  dirty: boolean;
  ensureSaved: () => Promise<boolean>;
  onReport: (ws: WsData) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const officialBlockers = officialReportBlockers(workspace);

  async function generate(kind: WorkspaceReportKind) {
    setBusy(true);
    setErr(null);
    try {
      if (dirty && !(await ensureSaved()))
        throw new Error("Rapor öncesi kaydetme başarısız.");
      const res = await fetch(`/api/workspace/${workspaceId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rapor üretilemedi.");
      onReport(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rapor üretilemedi. Yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-accent-indigo p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Uygulama Raporu</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-2)]">
            Ara rapor çalışma sürerken açıkları görünür tutar. Resmî rapor yalnız kapanış, kalite ve onay kapıları tamamlandığında üretilir
            {doneCount < total
              ? ` (şu an ${doneCount}/${total} adım tamam — ara durum raporu da alabilirsin)`
              : ""}
            .
          </p>
        </div>
        <div className="flex gap-2">
          {report && (
            <Link
              href={`/workspace/${workspaceId}/rapor`}
              className="btn btn-secondary"
            >
              Yazdır / PDF
            </Link>
          )}
          <button
            onClick={() => generate("INTERIM")}
            disabled={busy}
            className="btn btn-secondary"
          >
            {busy
              ? "Rapor üretiliyor…"
              : report
                ? "Ara raporu yenile"
                : "Ara rapor oluştur"}
          </button>
          <button onClick={() => generate("OFFICIAL")} disabled={busy || officialBlockers.length > 0} className="btn btn-primary" title={officialBlockers.join(" ") || "Resmî kapanış raporu üret"}>Resmî rapor oluştur</button>
        </div>
      </div>
      {officialBlockers.length > 0 && <div className="alert alert-warn mt-4 text-[11px]"><strong>Resmî rapor için açık kapılar</strong><ul className="mt-1 list-disc pl-4">{officialBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
      {err && <p className="mt-2 text-xs text-[var(--st-risk)]">{err}</p>}
      {report && (
        <div className="subtle-panel mt-4">
          <Markdown>{report}</Markdown>
        </div>
      )}
    </section>
  );
}
