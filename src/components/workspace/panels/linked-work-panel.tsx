"use client";

// Bağlı çalışmalar ve yatay yayılım: türetilen metodoloji çalışmaları.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import type { HorizontalDeploymentTarget, RedTeamReview } from "@/domain/workspace-intelligence";
import { METHODOLOGY_META, nextMethodologies, type Methodology } from "@/domain/diagnosis";

export function HorizontalDeploymentPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const update = (id: string, patch: Partial<HorizontalDeploymentTarget>) =>
    onChange({
      horizontalTargets: workspace.horizontalTargets.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
  const add = () => {
    if (!name.trim()) return;
    onChange({
      horizontalTargets: [
        ...workspace.horizontalTargets,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          kind: "PROCESS",
          status: "PENDING",
          riskLevel: null,
          owner: null,
          dueDate: null,
          finding: "",
          evidenceIds: [],
          childWorkspaceId: null,
        },
      ],
    });
    setName("");
  };
  async function createCase(target: HorizontalDeploymentTarget) {
    setBusy(target.id);
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceWorkspaceId: workspace.id,
        methodology: workspace.methodology,
        problemDescription: workspace.problemDescription,
        reason: `Yatay yayılım riski: ${target.name}`,
        relation: "HORIZONTAL_DEPLOYMENT",
        targetDescription: `${workspace.problemDescription} — Yatay yayılım: ${target.name}`,
        horizontalTargetId: target.id,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      update(target.id, { childWorkspaceId: data.id });
      window.location.href = `/workspace/${data.id}`;
    } else setBusy(null);
  }
  return (
    <section className="card p-6">
      <p className="eyebrow">Yatay yayılım sihirbazı</p>
      <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
        Aynı risk başka nerede yaşayabilir?
      </h2>
      <p className="mt-1 text-xs text-[var(--muted-2)]">
        Makine, hat, proses, lokasyon veya tedarikçi bazında kontrol et. Bulunan
        risk alt vakaya dönüşmeden kapanış tamamlanmaz.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Örn. Hat 4 kaynak istasyonu"
        />
        <button className="btn btn-secondary" onClick={add}>
          Hedef ekle
        </button>
      </div>
      <div className="record-list mt-3">
        {workspace.horizontalTargets.map((t) => (
          <div
            key={t.id}
            className="record-row"
          >
            <div className="grid gap-2 sm:grid-cols-5">
              <input
                className="field sm:col-span-2"
                value={t.name}
                onChange={(e) => update(t.id, { name: e.target.value })}
              />
              <select
                className="field"
                value={t.kind}
                onChange={(e) =>
                  update(t.id, {
                    kind: e.target.value as HorizontalDeploymentTarget["kind"],
                  })
                }
              >
                <option value="PROCESS">Proses</option>
                <option value="MACHINE">Makine</option>
                <option value="LINE">Hat</option>
                <option value="LOCATION">Lokasyon</option>
                <option value="SUPPLIER">Tedarikçi</option>
              </select>
              <select
                className="field"
                value={t.status}
                onChange={(e) =>
                  update(t.id, {
                    status: e.target
                      .value as HorizontalDeploymentTarget["status"],
                    riskLevel:
                      e.target.value === "RISK_FOUND"
                        ? (t.riskLevel ?? "MEDIUM")
                        : null,
                  })
                }
              >
                <option value="PENDING">Kontrol bekliyor</option>
                <option value="CLEAR">Risk yok</option>
                <option value="RISK_FOUND">Risk bulundu</option>
              </select>
              <select
                className="field"
                disabled={t.status !== "RISK_FOUND"}
                value={t.riskLevel ?? ""}
                onChange={(e) =>
                  update(t.id, {
                    riskLevel: e.target
                      .value as HorizontalDeploymentTarget["riskLevel"],
                  })
                }
              >
                <option value="">Risk seviyesi</option>
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
              </select>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <input
                className="field"
                value={t.owner ?? ""}
                onChange={(e) =>
                  update(t.id, { owner: e.target.value || null })
                }
                placeholder="Sorumlu"
              />
              <input
                className="field"
                type="date"
                value={t.dueDate ?? ""}
                onChange={(e) =>
                  update(t.id, { dueDate: e.target.value || null })
                }
              />
              <input
                className="field sm:col-span-2"
                value={t.finding}
                onChange={(e) => update(t.id, { finding: e.target.value })}
                placeholder="Yerel bulgu / kontrol sonucu"
              />
            </div>
            <select
              multiple
              className="field mt-2 h-16 text-xs"
              value={t.evidenceIds}
              onChange={(e) =>
                update(t.id, {
                  evidenceIds: [...e.target.selectedOptions].map(
                    (o) => o.value,
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
            {t.status === "RISK_FOUND" && !t.childWorkspaceId && (
              <button
                className="btn btn-primary mt-2"
                disabled={busy === t.id}
                onClick={() => createCase(t)}
              >
                Bu risk için alt vaka aç
              </button>
            )}
            {t.childWorkspaceId && (
              <Link
                className="btn btn-secondary mt-2"
                href={`/workspace/${t.childWorkspaceId}`}
              >
                Alt vakaya git →
              </Link>
            )}
          </div>
        ))}
        {workspace.horizontalTargets.length === 0 && (
          <p className="text-sm text-[var(--muted-2)]">
            Henüz yayılım hedefi eklenmedi.
          </p>
        )}
      </div>
    </section>
  );
}


export function LinkedWorkPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const [findings, setFindings] = useState<
    {
      id: string;
      severity: string;
      title: string;
      detail: string;
      review: RedTeamReview | null;
    }[]
  >([]);
  const [previews, setPreviews] = useState<
    Record<
      string,
      {
        evidence: number;
        claims: number;
        actions: number;
        metrics: number;
        populatedSteps: string[];
      }
    >
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const options = nextMethodologies(workspace.methodology);
  useEffect(() => {
    fetch(`/api/workspace/${workspace.id}/red-team`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFindings);
    Promise.all(
      options.map(async (o) => {
        const r = await fetch(
          `/api/workspace/${workspace.id}/transfer?methodology=${o.code}`,
        );
        return [o.code, r.ok ? await r.json() : null] as const;
      }),
    ).then((items) =>
      setPreviews(Object.fromEntries(items.filter((x) => x[1]))),
    );
  // Seçeneklerin kodları çalışma metodolojisinden türetilir; kayıt içeriği
  // değiştiğinde önizlemeyi yenilemek yeterlidir.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id, workspace.updatedAt]);
  async function create(
    methodology: Methodology,
    reason: string,
    relation: "COMPLEMENTARY" | "HORIZONTAL_DEPLOYMENT" = "COMPLEMENTARY",
  ) {
    setBusy(methodology);
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceWorkspaceId: workspace.id,
        methodology,
        problemDescription: workspace.problemDescription,
        reason,
        relation,
      }),
    });
    const data = await res.json();
    if (res.ok) window.location.assign(`/workspace/${data.id}`);
    else setBusy(null);
  }
  function review(findingId: string, patch: Partial<RedTeamReview>) {
    const current = workspace.redTeamReviews.find(
      (r) => r.findingId === findingId,
    ) ?? {
      findingId,
      status: "OPEN" as const,
      comment: "",
      evidenceIds: [],
      updatedAt: new Date().toISOString(),
    };
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    onChange({
      redTeamReviews: [
        ...workspace.redTeamReviews.filter((r) => r.findingId !== findingId),
        next,
      ],
    });
    setFindings((items) =>
      items.map((f) => (f.id === findingId ? { ...f, review: next } : f)),
    );
  }
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="card p-6">
        <p className="eyebrow">Metodoloji zinciri</p>
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
          Sonraki çalışma gerçekten başlasın
        </h2>
        <p className="mt-1 text-xs text-[var(--muted-2)]">
          Bağlı çalışma problem, kanıt, doğrulanmış neden, aksiyon ve
          metriklerle hazır açılır.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {options.map((o) => {
            const p = previews[o.code];
            return (
              <button
                key={o.code}
                disabled={busy !== null}
                onClick={() => create(o.code, o.reason)}
                className="rounded-xl border border-[var(--rule)] p-3 text-left text-sm hover:border-[var(--rule-strong)]"
              >
                <strong>{METHODOLOGY_META[o.code].shortName}</strong>
                <span className="ml-2 text-xs text-[var(--muted)]">{o.reason}</span>
                {p && (
                  <span className="mt-2 block text-[11px] text-[var(--st-ok)]">
                    Aktarılacak: {p.evidence} kanıt · {p.claims} iddia ·{" "}
                    {p.actions} aksiyon · {p.populatedSteps.length} hazır adım
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {workspace.links.length > 0 && (
          <div className="mt-4 border-t border-[var(--rule)] pt-3 text-xs">
            {workspace.links.map((l) => (
              <Link
                key={l.id}
                href={`/workspace/${l.targetWorkspaceId}`}
                className="block py-1 text-[var(--ink)]"
              >
                {l.relation} → {METHODOLOGY_META[l.methodology].shortName}
              </Link>
            ))}
          </div>
        )}
        <button
          disabled={busy !== null}
          onClick={() =>
            create(
              workspace.methodology,
              "Benzer proses/ekipmanda yatay yayılım kontrolü",
              "HORIZONTAL_DEPLOYMENT",
            )
          }
          className="btn btn-secondary mt-3"
        >
          Yatay yayılım kontrolü aç
        </button>
      </div>
      <div className="card p-6">
        <p className="eyebrow">Kırmızı takım</p>
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Analize itirazlar</h2>
        <p className="mt-1 text-xs text-[var(--muted-2)]">
          Kritik itiraz kabul edilip açık bırakılırsa kapanış engellenir.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {findings.map((f) => (
            <div
              key={f.id}
              className={`rounded-xl p-3 text-sm ${f.severity ==="HIGH" ? "bg-[var(--st-risk-bg)] text-[var(--st-risk)] " : "bg-[var(--st-warn-bg)] text-[var(--st-warn)]"}`}
            >
              <strong>{f.title}</strong>
              <p className="mt-1 text-xs opacity-80">{f.detail}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select
                  className="field text-xs"
                  value={f.review?.status ?? "OPEN"}
                  onChange={(e) =>
                    review(f.id, {
                      status: e.target.value as RedTeamReview["status"],
                    })
                  }
                >
                  <option value="OPEN">Açık</option>
                  <option value="ACCEPTED">Kabul edildi · düzeltilecek</option>
                  <option value="REJECTED_WITH_EVIDENCE">
                    Kanıtla reddedildi
                  </option>
                  <option value="IRRELEVANT">İlgisiz</option>
                  <option value="RESOLVED">Çözüldü</option>
                </select>
                <input
                  className="field text-xs"
                  value={f.review?.comment ?? ""}
                  onChange={(e) => review(f.id, { comment: e.target.value })}
                  placeholder="Karar açıklaması"
                />
              </div>
              {f.review?.status === "REJECTED_WITH_EVIDENCE" && (
                <select
                  multiple
                  className="field mt-2 h-16 text-xs"
                  value={f.review.evidenceIds}
                  onChange={(e) =>
                    review(f.id, {
                      evidenceIds: [...e.target.selectedOptions].map(
                        (o) => o.value,
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
              )}
            </div>
          ))}
          {findings.length === 0 && (
            <p className="alert alert-ok">
              Açık deterministik itiraz yok.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

