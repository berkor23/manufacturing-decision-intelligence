"use client";

// Aksiyon takibi: sorumlu, termin, uygulama ve etkinlik doğrulama döngüsü.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useState } from "react";
import type { ActionItem, ActionStatus } from "@/application/ports/rca-repository";
import { ActionStatusPill, STATUS_LABEL } from "@/components/workspace/panel-kit";

export function Actions({
  actions,
  onChange,
}: {
  actions: ActionItem[];
  onChange: (a: ActionItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const add = () => {
    if (!draft.trim()) return;
    const id = crypto.randomUUID();
    onChange([
      ...actions,
      {
        id,
        action: draft.trim(),
        owner: null,
        status: "OPEN",
        successMetric: "",
        baseline: "",
        target: "",
        actual: "",
        verificationDueDate: null,
        evidenceIds: [],
      },
    ]);
    setExpanded((items) => [...items, id]);
    setDraft("");
  };
  const effectiveCount = actions.filter((a) =>
    ["EFFECTIVE", "DONE"].includes(a.status),
  ).length;
  const openCount = actions.length - effectiveCount;
  const patch = (index: number, values: Partial<ActionItem>) =>
    onChange(
      actions.map((item, current) =>
        current === index ? { ...item, ...values } : item,
      ),
    );
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[var(--rule-strong)] pb-2">
        <div>
          <p className="eyebrow">Uygulama ve etkinlik</p>
          <h2 className="mt-1 section-heading">Aksiyon takibi</h2>
        </div>
        {/* Sayaçlar renkli hap değil, mono künye: açık/etkili tek bakışta. */}
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted)]">
          {String(openCount).padStart(2, "0")} açık
          <span className="mx-1.5 text-[var(--muted-2)]">/</span>
          {String(effectiveCount).padStart(2, "0")} etkili
        </span>
      </div>
      <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-[var(--muted)]">
        Önce işi uygula, ardından sonuç metriğiyle gerçekten etkili olduğunu doğrula.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Yeni aksiyon…"
          className="field"
        />
        <button onClick={add} className="btn btn-primary shrink-0">
          Aksiyon ekle
        </button>
      </div>

      {actions.length === 0 ? (
        <p className="empty-state mt-4">
          Henüz aksiyon yok. İlk karşı önlemi yukarıdan ekleyin.
        </p>
      ) : (
        /* Kutu yığını yerine hizalı satırlar. Durum sağdaki etiketten okunur;
           dikkat isteyen satır ayrıca sol çubukla işaretlenir. */
        <ul className="mt-5 border-t border-[var(--rule-strong)]">
          {actions.map((action, index) => {
            const id = action.id ?? String(index);
            const isOpen = expanded.includes(id);
            const needsVerification =
              action.status === "IMPLEMENTED" ||
              action.status === "EFFECTIVENESS_DUE";
            const ineffective = action.status === "INEFFECTIVE";
            const toggle = () =>
              setExpanded((items) =>
                isOpen ? items.filter((item) => item !== id) : [...items, id],
              );
            return (
              <li
                key={id}
                className="border-b border-[var(--rule)]"
                style={
                  ineffective
                    ? { borderLeft: "3px solid var(--st-risk)" }
                    : needsVerification
                      ? { borderLeft: "3px solid var(--st-warn)" }
                      : undefined
                }
              >
                <div
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 ${ineffective || needsVerification ? "pl-3" : ""}`}
                >
                  <span className="shrink-0 font-mono text-[11px] text-[var(--muted-2)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <button type="button" onClick={toggle} className="min-w-0 flex-1 text-left">
                    <strong className="block truncate text-[13px] font-medium">
                      {action.action || "İsimsiz aksiyon"}
                    </strong>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted-2)]">
                      {action.owner || "Sorumlu atanmamış"}
                      {action.verificationDueDate
                        ? ` · doğrulama ${new Date(action.verificationDueDate).toLocaleDateString("tr-TR")}`
                        : " · doğrulama tarihi yok"}
                    </span>
                  </button>
                  {action.successMetric && (
                    <span className="hidden max-w-52 shrink-0 truncate font-mono text-[11px] text-[var(--muted)] lg:block">
                      {action.successMetric}: {action.baseline || "—"} →{" "}
                      {action.actual || action.target || "—"}
                    </span>
                  )}
                  <ActionStatusPill status={action.status} />
                  <button type="button" onClick={toggle} className="btn btn-secondary shrink-0">
                    {isOpen ? "Kapat" : "Detaylar"}
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-[var(--rule)] bg-[var(--surface-sunk)] p-4">
                  <div className="grid gap-3 lg:grid-cols-12">
                    <label className="lg:col-span-6">
                      <span className="field-label">Aksiyon</span>
                      <input
                        value={action.action}
                        onChange={(e) =>
                          patch(index, { action: e.target.value })
                        }
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-3">
                      <span className="field-label">Sorumlu</span>
                      <input
                        value={action.owner ?? ""}
                        onChange={(e) =>
                          patch(index, { owner: e.target.value || null })
                        }
                        placeholder="Ad soyad"
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-3">
                      <span className="field-label">Durum</span>
                      <select
                        value={action.status}
                        onChange={(e) =>
                          patch(index, {
                            status: e.target.value as ActionStatus,
                          })
                        }
                        className="field"
                      >
                        {(
                          [
                            "OPEN",
                            "IN_PROGRESS",
                            "IMPLEMENTED",
                            "EFFECTIVENESS_DUE",
                            "EFFECTIVE",
                            "INEFFECTIVE",
                            "DONE",
                          ] as ActionStatus[]
                        ).map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABEL[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="lg:col-span-4">
                      <span className="field-label">Başarı metriği</span>
                      <input
                        value={action.successMetric ?? ""}
                        onChange={(e) =>
                          patch(index, { successMetric: e.target.value })
                        }
                        placeholder="Örn. kaçak oranı"
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Başlangıç</span>
                      <input
                        value={action.baseline ?? ""}
                        onChange={(e) =>
                          patch(index, { baseline: e.target.value })
                        }
                        placeholder="Önce"
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Hedef</span>
                      <input
                        value={action.target ?? ""}
                        onChange={(e) =>
                          patch(index, { target: e.target.value })
                        }
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Gerçekleşen</span>
                      <input
                        value={action.actual ?? ""}
                        onChange={(e) =>
                          patch(index, { actual: e.target.value })
                        }
                        className="field"
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Doğrulama tarihi</span>
                      <input
                        type="date"
                        value={action.verificationDueDate ?? ""}
                        onChange={(e) =>
                          patch(index, {
                            verificationDueDate: e.target.value || null,
                          })
                        }
                        className="field"
                      />
                    </label>
                  </div>
                  {needsVerification && (
                    <p className="alert alert-warn mt-3 text-[11px]">
                      Aksiyon uygulandı; gerçekleşen sonuç ölçülene kadar etkili
                      kabul edilmez.
                    </p>
                  )}
                  {ineffective && (
                    <p className="alert alert-risk mt-3 text-[11px]">
                      Aksiyon etkisiz bulundu. Yeni karşı önlem veya kök neden
                      değerlendirmesi gerekiyor.
                    </p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          actions.filter((_, current) => current !== index),
                        )
                      }
                      className="btn btn-ghost text-[var(--st-risk)]"
                    >
                      Aksiyonu sil
                    </button>
                  </div>
                </div>
              )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}


// ── Profesyonel rapor ────────────────────────────────────────────

