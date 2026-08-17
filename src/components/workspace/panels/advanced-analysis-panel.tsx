"use client";

// İleri analiz araçları (MSA, DOE, regresyon vb.) çalışma kayıtları.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { type AdvancedAnalysis, type AdvancedTool, ADVANCED_TOOLS, ADVANCED_TOOL_DEFINITIONS, evaluateAdvancedAnalysis } from "@/domain/advanced-analysis";

export function AdvancedAnalysisPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const add = (tool: AdvancedTool = "MSA") => {
    const def = ADVANCED_TOOL_DEFINITIONS[tool];
    onChange({
      advancedAnalyses: [
        ...workspace.advancedAnalyses,
        {
          id: crypto.randomUUID(),
          tool,
          title: def.name,
          status: "DRAFT",
          decisionPoint: "",
          hypothesis: "",
          fields: Object.fromEntries(def.fields.map((f) => [f.key, ""])),
          rows: [],
          conclusion: "",
          evidenceIds: [],
        },
      ],
    });
  };
  const update = (id: string, patch: Partial<AdvancedAnalysis>) =>
    onChange({
      advancedAnalyses: workspace.advancedAnalyses.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  const changeTool = (item: AdvancedAnalysis, tool: AdvancedTool) => {
    const def = ADVANCED_TOOL_DEFINITIONS[tool];
    update(item.id, {
      tool,
      title: def.name,
      fields: Object.fromEntries(def.fields.map((f) => [f.key, ""])),
      rows: [],
      conclusion: "",
      status: "DRAFT",
    });
  };
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Faz 5 · Destekleyici yöntemler</p>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
              Karar noktasında çağrılan ileri analiz tezgâhı
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-2)]">
              Bu araçlar ana metodolojinin yerine geçmez; ölçüm, deney, risk,
              bakım, yaratıcılık veya öğrenme kararını destekler.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => add()}>
            Analiz ekle
          </button>
        </div>
      </section>
      {workspace.advancedAnalyses.map((item) => {
        const def = ADVANCED_TOOL_DEFINITIONS[item.tool];
        const result = evaluateAdvancedAnalysis(item);
        return (
          <section key={item.id} className="card p-6">
            <div className="grid gap-2 md:grid-cols-4">
              <select
                className="field"
                value={item.tool}
                onChange={(e) =>
                  changeTool(item, e.target.value as AdvancedTool)
                }
              >
                {ADVANCED_TOOLS.map((tool) => (
                  <option key={tool} value={tool}>
                    {ADVANCED_TOOL_DEFINITIONS[tool].name}
                  </option>
                ))}
              </select>
              <input
                className="field md:col-span-2"
                value={item.title}
                onChange={(e) => update(item.id, { title: e.target.value })}
                placeholder="Çalışma başlığı"
              />
              <select
                className="field"
                value={item.status}
                onChange={(e) =>
                  update(item.id, {
                    status: e.target.value as AdvancedAnalysis["status"],
                  })
                }
              >
                <option value="DRAFT">Taslak</option>
                <option value="IN_PROGRESS">Devam ediyor</option>
                <option value="REVIEW">İncelemede</option>
                <option value="COMPLETED" disabled={!result.ready}>
                  Tamamlandı
                </option>
              </select>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{def.purpose}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <textarea
                className="field min-h-20"
                value={item.decisionPoint}
                onChange={(e) =>
                  update(item.id, { decisionPoint: e.target.value })
                }
                placeholder="Bu araç hangi somut karar noktasında çağrıldı?"
              />
              <textarea
                className="field min-h-20"
                value={item.hypothesis}
                onChange={(e) =>
                  update(item.id, { hypothesis: e.target.value })
                }
                placeholder="Sınanacak hipotez / soru"
              />
              {def.fields.map((field) => (
                <input
                  key={field.key}
                  className="field"
                  value={item.fields[field.key] ?? ""}
                  onChange={(e) =>
                    update(item.id, {
                      fields: { ...item.fields, [field.key]: e.target.value },
                    })
                  }
                  placeholder={field.label}
                />
              ))}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr>
                    {def.columns.map((c) => (
                      <th key={c.key} className="p-2 text-left">
                        {c.label}
                      </th>
                    ))}
                    <th>
                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          update(item.id, {
                            rows: [
                              ...item.rows,
                              Object.fromEntries(
                                def.columns.map((c) => [c.key, ""]),
                              ),
                            ],
                          })
                        }
                      >
                        Satır ekle
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, i) => (
                    <tr key={i}>
                      {def.columns.map((c) => (
                        <td key={c.key} className="p-1">
                          <input
                            className="field"
                            value={row[c.key] ?? ""}
                            onChange={(e) =>
                              update(item.id, {
                                rows: item.rows.map((r, j) =>
                                  j === i
                                    ? { ...r, [c.key]: e.target.value }
                                    : r,
                                ),
                              })
                            }
                          />
                        </td>
                      ))}
                      <td className="p-1">
                        <button
                          className="text-[var(--st-risk)]"
                          onClick={() =>
                            update(item.id, {
                              rows: item.rows.filter((_, j) => j !== i),
                            })
                          }
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <textarea
              className="field mt-3 min-h-24"
              value={item.conclusion}
              onChange={(e) => update(item.id, { conclusion: e.target.value })}
              placeholder="Karar sonucu, sınırlar ve sonraki adım"
            />
            <select
              multiple
              className="field mt-2 h-20 text-xs"
              value={item.evidenceIds}
              onChange={(e) =>
                update(item.id, {
                  evidenceIds: [...e.target.selectedOptions].map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {workspace.evidence.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
            <div
              className={`mt-3 rounded-xl p-3 text-xs ${result.warning ? "bg-[var(--st-warn-bg)] text-[var(--st-warn)]" : result.ready ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)]" : "bg-[var(--surface-sunk)] text-[var(--ink-soft)]"}`}
            >
              <strong>
                {result.metric || "Hesap için veri satırı bekleniyor."}
              </strong>
              {result.warning && (
                <span className="tag state-warn ml-2">{result.warning}</span>
              )}
              {result.missing.length > 0 && (
                <p className="mt-1">Eksik: {result.missing.join(", ")}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
