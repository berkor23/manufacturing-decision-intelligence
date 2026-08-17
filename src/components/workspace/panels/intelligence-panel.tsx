"use client";

// Çalışma zekâsı: kapanış kapıları, kanıt-iddia tutarlılığı, benzer vakalar.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { StatusPill } from "@/components/workspace/panel-kit";
import { canClose, closureChecks, type Approval, type ClaimItem, type EvidenceItem, type MonitoringPlan } from "@/domain/workspace-intelligence";

export type Intelligence = {
  checks: { key: string; label: string; passed: boolean; detail: string }[];
  canClose: boolean;
  similar: {
    id: string;
    methodology: string;
    problemDescription: string;
    score: number;
  }[];
};


export function IntelligencePanel({
  workspace,
  dirty,
  ensureSaved,
  onChange,
  onFresh,
  localMode = false,
}: {
  workspace: WsData;
  dirty: boolean;
  ensureSaved: () => Promise<boolean>;
  onChange: (patch: Partial<WsData>) => void;
  onFresh: (ws: WsData) => void;
  localMode?: boolean;
}) {
  const [remoteIntel, setRemoteIntel] = useState<Intelligence | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [claimText, setClaimText] = useState("");
  const localIntel = useMemo<Intelligence>(() => ({ checks: closureChecks(workspace), canClose: canClose(workspace), similar: [] }), [workspace]);
  const intel = localMode ? localIntel : remoteIntel;
  const refresh = async () => {
    if (localMode) return;
    const res = await fetch(`/api/workspace/${workspace.id}/intelligence`);
    if (res.ok) setRemoteIntel(await res.json());
  };
  useEffect(() => {
    if (localMode) return;
    let active = true;
    fetch(`/api/workspace/${workspace.id}/intelligence`).then(async (res) => {
      if (res.ok && active) setRemoteIntel(await res.json());
    });
    return () => {
      active = false;
    };
  }, [localMode, workspace.id, workspace.updatedAt]);
  const addEvidence = () => {
    if (!evidenceTitle.trim()) return;
    const item: EvidenceItem = {
      id: crypto.randomUUID(),
      title: evidenceTitle.trim(),
      source: "",
      finding: "",
      recordedAt: new Date().toISOString(),
    };
    onChange({ evidence: [...workspace.evidence, item] });
    setEvidenceTitle("");
  };
  const addClaim = () => {
    if (!claimText.trim()) return;
    const item: ClaimItem = {
      id: crypto.randomUUID(),
      statement: claimText.trim(),
      kind: "ROOT_CAUSE",
      status: "CLAIMED",
      evidenceIds: [],
    };
    onChange({ claims: [...workspace.claims, item] });
    setClaimText("");
  };
  async function lifecycle(
    operation: "CLOSE" | "MONITOR",
    result?: "PASSED" | "FAILED",
  ) {
    setBusy(true);
    setError(null);
    try {
      if (localMode) {
        const now = new Date().toISOString();
        const fresh: WsData = operation === "CLOSE"
          ? { ...workspace, closureStatus: "MONITORING", updatedAt: now }
          : result === "PASSED"
            ? { ...workspace, closureStatus: "CLOSED", closedAt: now, monitoring: workspace.monitoring ? { ...workspace.monitoring, result: "PASSED" } : null, updatedAt: now }
            : { ...workspace, closureStatus: "REOPENED", closedAt: null, reopenCount: workspace.reopenCount + 1, monitoring: workspace.monitoring ? { ...workspace.monitoring, result: "FAILED" } : null, updatedAt: now };
        onChange(fresh);
        return;
      }
      if (dirty && !(await ensureSaved()))
        throw new Error("Önce çalışma kaydedilemedi.");
      const res = await fetch(`/api/workspace/${workspace.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "İşlem başarısız.");
      onFresh(data);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İstek tamamlanamadı. Yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }
  async function openRecurrence(similarId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWorkspaceId: similarId,
          methodology: workspace.methodology,
          problemDescription: workspace.problemDescription,
          reason: `Tekrar vaka: ${workspace.problemDescription}`,
          relation: "RECURRENCE",
          targetDescription: workspace.problemDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tekrar vakası açılamadı.");
      window.location.assign(`/workspace/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "İstek tamamlanamadı. Yeniden deneyin.");
      setBusy(false);
    }
  }
  const monitoring: MonitoringPlan = workspace.monitoring ?? {
    metric: "",
    trigger: "",
    reviewDate: null,
    owner: "",
    result: "PENDING",
  };
  return (
    <section className="card card-accent-emerald p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Doğrulama omurgası</p>
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
            Kanıt → Kök neden → Etkili aksiyon → İzleme
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-2)]">
            Formun dolması kapanış değildir; kritik iddialar ve aksiyon
            sonuçları doğrulanır.
          </p>
        </div>
        <StatusPill status={workspace.closureStatus} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Saha kanıtları</h3>
          <div className="mt-2 flex gap-2">
            <input
              className="field"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              placeholder="Örn. vardiya ölçüm raporu"
            />
            <button className="btn btn-secondary" onClick={addEvidence}>
              Ekle
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {workspace.evidence.map((e, i) => (
              <div
                key={e.id}
                className="record-row"
              >
                <input
                  className="field"
                  value={e.title}
                  onChange={(x) =>
                    onChange({
                      evidence: workspace.evidence.map((v, j) =>
                        j === i ? { ...v, title: x.target.value } : v,
                      ),
                    })
                  }
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    className="field text-xs"
                    value={e.source}
                    placeholder="Kaynak"
                    onChange={(x) =>
                      onChange({
                        evidence: workspace.evidence.map((v, j) =>
                          j === i ? { ...v, source: x.target.value } : v,
                        ),
                      })
                    }
                  />
                  <input
                    className="field text-xs"
                    value={e.finding}
                    placeholder="Bulgu"
                    onChange={(x) =>
                      onChange({
                        evidence: workspace.evidence.map((v, j) =>
                          j === i ? { ...v, finding: x.target.value } : v,
                        ),
                      })
                    }
                  />
                </div>
                <button type="button" className="mt-2 text-xs font-semibold text-[var(--st-risk)]" onClick={()=>onChange({evidence:workspace.evidence.filter((_,index)=>index!==i),claims:workspace.claims.map((claim)=>({...claim,evidenceIds:claim.evidenceIds.filter((id)=>id!==e.id)}))})}>Kaydı kaldır</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Doğrulanabilir iddialar</h3>
          <div className="mt-2 flex gap-2">
            <input
              className="field"
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="Doğrulanmış kök neden iddiası"
            />
            <button className="btn btn-secondary" onClick={addClaim}>
              Ekle
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {workspace.claims.map((c, i) => (
              <div
                key={c.id}
                className="record-row"
              >
                <input
                  className="field"
                  value={c.statement}
                  onChange={(x) =>
                    onChange({
                      claims: workspace.claims.map((v, j) =>
                        j === i ? { ...v, statement: x.target.value } : v,
                      ),
                    })
                  }
                />
                <button type="button" className="mt-2 text-xs font-semibold text-[var(--st-risk)]" onClick={()=>onChange({claims:workspace.claims.filter((_,index)=>index!==i)})}>Kaydı kaldır</button>
                <div className="mt-2 flex gap-2">
                  <select
                    className="field field-sm"
                    value={c.status}
                    onChange={(x) =>
                      onChange({
                        claims: workspace.claims.map((v, j) =>
                          j === i
                            ? {
                                ...v,
                                status: x.target.value as ClaimItem["status"],
                              }
                            : v,
                        ),
                      })
                    }
                  >
                    <option value="CLAIMED">İddia</option>
                    <option value="VERIFIED">Doğrulandı</option>
                    <option value="REJECTED">Elendi</option>
                  </select>
                  <select
                    multiple
                    className="field h-16 text-xs"
                    value={c.evidenceIds}
                    onChange={(x) =>
                      onChange({
                        claims: workspace.claims.map((v, j) =>
                          j === i
                            ? {
                                ...v,
                                evidenceIds: [...x.target.selectedOptions].map(
                                  (o) => o.value,
                                ),
                              }
                            : v,
                        ),
                      })
                    }
                  >
                    {workspace.evidence.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="field mt-2 text-xs"
                  value={c.counterfactual ?? ""}
                  placeholder="Karşı-olgu: neden kaldırıldığında ne oldu?"
                  onChange={(x) =>
                    onChange({
                      claims: workspace.claims.map((v, j) =>
                        j === i ? { ...v, counterfactual: x.target.value } : v,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold">Kapanış sonrası erken uyarı</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <input
            className="field"
            value={monitoring.metric}
            placeholder="İzlenecek metrik"
            onChange={(e) =>
              onChange({
                monitoring: { ...monitoring, metric: e.target.value },
              })
            }
          />
          <input
            className="field"
            value={monitoring.trigger}
            placeholder="Yeniden açma eşiği"
            onChange={(e) =>
              onChange({
                monitoring: { ...monitoring, trigger: e.target.value },
              })
            }
          />
          <input
            className="field"
            type="date"
            value={monitoring.reviewDate ?? ""}
            onChange={(e) =>
              onChange({
                monitoring: {
                  ...monitoring,
                  reviewDate: e.target.value || null,
                },
              })
            }
          />
          <input
            className="field"
            value={monitoring.owner}
            placeholder="Süreç sahibi"
            onChange={(e) =>
              onChange({ monitoring: { ...monitoring, owner: e.target.value } })
            }
          />
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold">Kapanış jürisi</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {workspace.approvals.map((a: Approval, i) => (
            <div key={a.role} className="flex gap-2">
              <input
                className="field"
                value={a.name}
                placeholder={
                  a.role === "QUALITY" ? "Kalite onaylayanı" : "Süreç sahibi"
                }
                onChange={(e) =>
                  onChange({
                    approvals: workspace.approvals.map((v, j) =>
                      j === i ? { ...v, name: e.target.value } : v,
                    ),
                  })
                }
              />
              <select
                className="field field-sm"
                value={a.status}
                onChange={(e) =>
                  onChange({
                    approvals: workspace.approvals.map((v, j) =>
                      j === i
                        ? {
                            ...v,
                            status: e.target.value as Approval["status"],
                            decidedAt: new Date().toISOString(),
                          }
                        : v,
                    ),
                  })
                }
              >
                <option value="PENDING">Bekliyor</option>
                <option value="APPROVED">Onay</option>
                <option value="REJECTED">Ret</option>
              </select>
            </div>
          ))}
        </div>
      </div>
      {intel && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Kapanış kapıları</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {intel.checks.map((c) => (
                <li
                  key={c.key}
                  className={`rounded-lg px-3 py-2 text-xs ${c.passed ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)] " : "bg-[var(--st-warn-bg)] text-[var(--st-warn)]"}`}
                >
                  {c.label} · {c.detail}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Benzer Problem DNA’sı</h3>
            <div className="mt-2 flex flex-col gap-1.5">
              {intel.similar.map((s) => (
                <div
                  className="rounded-lg bg-[var(--surface-sunk)] px-3 py-2 text-xs"
                  key={s.id}
                >
                  <Link
                    className="hover:text-[var(--ink)]"
                    href={`/workspace/${s.id}`}
                  >
                    %{Math.round(s.score * 100)} · {s.problemDescription}
                  </Link>
                  {!localMode && <button
                    disabled={busy}
                    onClick={() => openRecurrence(s.id)}
                    className="ml-2 font-medium text-[var(--st-risk)] hover:underline"
                  >
                    Tekrar vakası olarak aç
                  </button>}
                </div>
              ))}
              {intel.similar.length === 0 && (
                <p className="text-xs text-[var(--muted-2)]">
                  Henüz anlamlı benzer vaka yok.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          disabled={
            busy || !intel?.canClose || workspace.closureStatus === "CLOSED"
          }
          onClick={() => lifecycle("CLOSE")}
          className="btn btn-primary"
        >
          İzlemeye al ve kapanışa hazırla
        </button>
        {workspace.closureStatus === "MONITORING" && (
          <>
            <button
              disabled={busy}
              onClick={() => lifecycle("MONITOR", "PASSED")}
              className="btn btn-primary"
            >
              İzleme başarılı · Kapat
            </button>
            <button
              disabled={busy}
              onClick={() => lifecycle("MONITOR", "FAILED")}
              className="btn btn-secondary"
            >
              Problem tekrar etti · Yeniden aç
            </button>
          </>
        )}
        {error && <p className="self-center text-xs text-[var(--st-risk)]">{error}</p>}
      </div>
    </section>
  );
}
