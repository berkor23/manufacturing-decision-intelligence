"use client";

// Metodolojiye özgü uzman araçlar (FMEA skorlama, SPC kartı, KT karar analizi).
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useState } from "react";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { TableRow, stepIsComplete } from "@/domain/playbook";
import { analyzeDecision, type DecisionCriterion, type DecisionOption } from "@/domain/diagnosis";
import { analyzeIndividuals, buildChangeTimeline, customerUpdate, parseMeasurementText, scoreFmea } from "@/domain/manufacturing-analytics";

export function SpcMiniChart({
  points,
  mean,
  ucl,
  lcl,
}: {
  points: { value: number }[];
  mean: number;
  ucl: number;
  lcl: number;
}) {
  const width = 520,
    height = 180,
    pad = 20;
  const min = Math.min(lcl, ...points.map((p) => p.value));
  const max = Math.max(ucl, ...points.map((p) => p.value));
  const x = (i: number) =>
    pad + i * ((width - pad * 2) / Math.max(1, points.length - 1));
  const y = (v: number) =>
    height -
    pad -
    ((v - min) / Math.max(0.0001, max - min)) * (height - pad * 2);
  const path = points
    .map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-3 w-full border border-[var(--rule)] bg-[var(--surface-sunk)]"
      role="img"
      aria-label="I kontrol kartı"
    >
      {[
        { v: ucl, c: "var(--st-risk)", n: "UCL" },
        { v: mean, c: "var(--muted)", n: "CL" },
        { v: lcl, c: "var(--st-risk)", n: "LCL" },
      ].map((l) => (
        <g key={l.n}>
          <line
            x1={pad}
            x2={width - pad}
            y1={y(l.v)}
            y2={y(l.v)}
            stroke={l.c}
            strokeDasharray="5 4"
          />
          <text
            x={width - pad - 2}
            y={y(l.v) - 3}
            textAnchor="end"
            fontSize="9"
            fill={l.c}
          >
            {l.n} {l.v}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.75" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r="3"
          fill={p.value > ucl || p.value < lcl ? "var(--st-risk)" : "var(--ink)"}
        />
      ))}
    </svg>
  );
}

export function SpecialtyPanel({
  workspace,
  onChange,
}: {
  workspace: WsData;
  onChange: (patch: Partial<WsData>) => void;
}) {
  const [renderedAt] = useState(() => Date.now());
  const specialty = workspace.specialty ?? {};
  const set = (values: Record<string, unknown>) =>
    onChange({ specialty: { ...specialty, ...values } });
  if (workspace.methodology === "SPC") {
    const raw = String(specialty.spcData ?? "");
    const lsl =
      specialty.lsl === "" || specialty.lsl == null
        ? null
        : Number(specialty.lsl);
    const usl =
      specialty.usl === "" || specialty.usl == null
        ? null
        : Number(specialty.usl);
    let points = parseMeasurementText(raw);
    let analysis: ReturnType<typeof analyzeIndividuals> | null = null;
    let parseError = "";
    try {
      points = parseMeasurementText(raw);
      if (points.length >= 2) analysis = analyzeIndividuals(points, lsl, usl);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Veri okunamadı";
    }
    return (
      <section className="card p-6">
        <p className="eyebrow">SPC çalışma tezgâhı</p>
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
          I-MR kontrol kartı ve özel neden sinyalleri
        </h2>
        <p className="mt-1 text-xs text-[var(--muted-2)]">
          CSV/Excel’den satırları yapıştır: tarih;ölçüm veya yalnız ölçüm.
          Limitler hareketli aralıkla hesaplanır.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <textarea
            className="field min-h-48 font-mono text-xs"
            value={raw}
            onChange={(e) => set({ spcData: e.target.value })}
            placeholder={"2026-01-01;10.02\n2026-01-02;10.11"}
          />
          <div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="field"
                type="number"
                value={(specialty.lsl as string) ?? ""}
                onChange={(e) => set({ lsl: e.target.value })}
                placeholder="LSL"
              />
              <input
                className="field"
                type="number"
                value={(specialty.usl as string) ?? ""}
                onChange={(e) => set({ usl: e.target.value })}
                placeholder="USL"
              />
            </div>
            {analysis && (
              <>
                <SpcMiniChart
                  points={points}
                  mean={analysis.mean}
                  ucl={analysis.ucl}
                  lcl={analysis.lcl}
                />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    ["Ortalama", analysis.mean],
                    ["LCL", analysis.lcl],
                    ["UCL", analysis.ucl],
                    ["Sigma", analysis.sigma],
                    ["Cp", analysis.cp ?? "—"],
                    ["Cpk", analysis.cpk ?? "—"],
                  ].map(([k, v]) => (
                    <div
                      key={String(k)}
                      className="rounded-lg bg-[var(--surface-sunk)] p-2"
                    >
                      <strong className="block text-base">{v}</strong>
                      {k}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {analysis.signals.map((s, i) => (
                    <p
                      key={i}
                      className="alert alert-risk text-[11px]"
                    >
                      {s.message}
                    </p>
                  ))}
                  {analysis.signals.length === 0 && (
                    <p className="alert alert-ok text-[11px]">
                      Özel neden sinyali bulunmadı.
                    </p>
                  )}
                </div>
              </>
            )}
            {parseError && (
              <p className="mt-2 text-xs text-[var(--st-risk)]">{parseError}</p>
            )}
          </div>
        </div>
      </section>
    );
  }
  if (workspace.methodology === "FMEA") {
    const analysisStep = workspace.steps.find((s) => s.key === "analysis");
    const rows = (analysisStep?.values.fmeaTable ?? []) as TableRow[];
    const scored = rows.map((row) => ({
      row,
      risk: scoreFmea(row.s, row.o, row.d),
    }));
    const recalc = () => {
      if (!analysisStep) return;
      onChange({
        steps: workspace.steps.map((s) =>
          s.key !== "analysis"
            ? s
            : {
                ...s,
                values: {
                  ...s.values,
                  fmeaTable: rows.map((r) => {
                    const risk = scoreFmea(r.s, r.o, r.d);
                    return { ...r, rpn: risk.valid ? String(risk.rpn) : "" };
                  }),
                },
              },
        ),
      });
    };
    return (
      <section className="card p-6">
        <p className="eyebrow">FMEA risk motoru</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
              S×O×D doğrulama ve öncelik
            </h2>
            <p className="text-xs text-[var(--muted-2)]">
              1–10 dışı puanlar reddedilir; S≥9 RPN düşük olsa da kritiktir.
            </p>
          </div>
          <button onClick={recalc} className="btn btn-primary">
            RPN’leri hesapla
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {scored
            .sort((a, b) => b.risk.rpn - a.risk.rpn)
            .map((r, i) => (
              <div
                key={i}
                className="record-row flex items-center justify-between text-sm"
              >
                <span>{r.row.failureMode || `Satır ${i + 1}`}</span>
                <span
                  className={`tag ${r.risk.priority === "CRITICAL" ? "state-risk" : r.risk.priority === "HIGH" ? "state-warn" : "state-idle"}`}
                >
                  {r.risk.valid
                    ? `${r.risk.priority} · RPN ${r.risk.rpn}`
                    : "Geçersiz S/O/D"}
                </span>
              </div>
            ))}
          {rows.length === 0 && (
            <p className="text-sm text-[var(--muted-2)]">
              Önce “Hata Modu Analizi” adımına satır ekleyin.
            </p>
          )}
        </div>
      </section>
    );
  }
  if (workspace.methodology === "EIGHT_D") {
    const startedAt = String(specialty.incidentStartedAt ?? "");
    const elapsed = startedAt
      ? Math.max(0, Math.floor((renderedAt - Date.parse(startedAt)) / 3600000))
      : null;
    const d3 = workspace.steps.find((s) => s.key === "d3");
    const containment = String(d3?.values.effectiveness ?? "");
    const root =
      workspace.claims.find(
        (c) => c.kind === "ROOT_CAUSE" && c.status === "VERIFIED",
      )?.statement ?? "";
    const message = customerUpdate(
      workspace.problemDescription,
      containment,
      root,
      workspace.closureStatus === "CLOSED",
    );
    return (
      <section className="card p-6">
        <p className="eyebrow">8D olay komuta merkezi</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Müşteri koruma saati</h2>
            <input
              type="datetime-local"
              className="field mt-3"
              value={startedAt}
              onChange={(e) => set({ incidentStartedAt: e.target.value })}
            />
            {elapsed != null && (
              <p
                className={`mt-3 rounded-xl p-3 text-sm ${elapsed > 24 ? "bg-[var(--st-risk-bg)] text-[var(--st-risk)]" : "bg-[var(--st-ok-bg)] text-[var(--st-ok)]"}`}
              >
                <strong>{elapsed} saat</strong> geçti · containment{" "}
                {stepIsComplete(d3?.status) ? "tamam" : "bekliyor"}
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Şüpheli stok", "suspectStock"],
                ["Müşteri stoku", "customerStock"],
                ["Transit", "transitStock"],
              ].map(([label, key]) => (
                <input
                  key={key}
                  className="field text-xs"
                  value={String(specialty[key] ?? "")}
                  onChange={(e) => set({ [key]: e.target.value })}
                  placeholder={label}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Kontrollü müşteri metni</h2>
            <textarea
              readOnly
              className="field mt-3 min-h-48 text-xs"
              value={message}
            />
            <p className="mt-2 text-xs text-[var(--muted-2)]">
              Kök neden doğrulanana kadar kesin dil otomatik engellenir.
            </p>
          </div>
        </div>
      </section>
    );
  }
  if (workspace.methodology === "KEPNER_TREGOE") {
    const date = String(specialty.deviationDate ?? "");
    const changeRows = (workspace.steps.find((s) => s.key === "changes")?.values
      .changeList ?? []) as TableRow[];
    const timeline = date
      ? buildChangeTimeline(
          date,
          changeRows
            .map((r) => ({ date: r.date, change: r.change }))
            .filter((x) => x.date),
        )
      : [];
    return (
      <section className="card p-6">
        <p className="eyebrow">KT değişiklik radarı</p>
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
          Sapma çevresindeki zaman çizgisi
        </h2>
        <input
          type="date"
          className="field field-sm mt-3"
          value={date}
          onChange={(e) => set({ deviationDate: e.target.value })}
        />
        <div className="mt-4 flex flex-col gap-2">
          {timeline.map((x, i) => (
            <div
              key={i}
              className={`rounded-xl border-l-4 p-3 text-sm ${x.kind ==="DEVIATION" ? "border-[var(--st-risk)] bg-[var(--st-risk-bg)] " : "border-[var(--rule-strong)] bg-[var(--surface-sunk)]"}`}
            >
              <strong>
                {x.date} · {x.label}
              </strong>
              {x.distanceDays != null && x.kind === "CHANGE" && (
                <span className="ml-2 text-xs text-[var(--muted)]">
                  sapmadan {Math.abs(x.distanceDays)} gün{" "}
                  {x.distanceDays <= 0 ? "önce" : "sonra"}
                </span>
              )}
            </div>
          ))}
          {!date && (
            <p className="text-sm text-[var(--muted-2)]">
              İlk sapma tarihini seçin; “Değişiklik Analizi” satırları otomatik
              dizilir.
            </p>
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            className="field"
            value={String(specialty.experiment ?? "")}
            onChange={(e) => set({ experiment: e.target.value })}
            placeholder="Geri alma / A-B deneyi"
          />
          <input
            className="field"
            value={String(specialty.expected ?? "")}
            onChange={(e) => set({ expected: e.target.value })}
            placeholder="Beklenen sonuç"
          />
          <select
            className="field"
            value={String(specialty.verdict ?? "PENDING")}
            onChange={(e) => set({ verdict: e.target.value })}
          >
            <option value="PENDING">Deney bekliyor</option>
            <option value="CONFIRMED">Neden doğrulandı</option>
            <option value="REJECTED">Neden elendi</option>
          </select>
        </div>
      </section>
    );
  }
  if (workspace.methodology === "KT_DECISION") {
    const rowsOf = (stepKey: string, field: string) =>
      (workspace.steps.find((s) => s.key === stepKey)?.values[field] ?? []) as TableRow[];
    const mustRows = rowsOf("musts", "mustTable");
    const wantRows = rowsOf("wants", "wantTable");
    const scoreRows = rowsOf("score", "scoreTable");

    const norm = (s: string | undefined) => (s ?? "").trim().toLocaleLowerCase("tr");
    const YES = new Set(["evet", "var", "geçer", "geçti", "true", "yes", "x", "✓", "olur", "uygun"]);
    const NO = new Set(["hayır", "yok", "kalır", "elendi", "false", "no", "olmaz"]);
    const asBool = (v: string | undefined): boolean | null => {
      const t = norm(v);
      if (YES.has(t)) return true;
      if (NO.has(t)) return false;
      return null;
    };
    const asNum = (v: string | undefined): number => {
      const n = Number((v ?? "").replace(",", "."));
      return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0;
    };
    const asWeight = (v: string | undefined): number => {
      const n = Number((v ?? "").replace(",", "."));
      return Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(10, n)) : 1;
    };

    const criteria: DecisionCriterion[] = [];
    for (const r of mustRows) {
      const label = (r.criterion ?? "").trim();
      if (label) criteria.push({ id: norm(label), label, kind: "MUST" });
    }
    for (const r of wantRows) {
      const label = (r.criterion ?? "").trim();
      if (label) criteria.push({ id: norm(label), label, kind: "WANT", weight: asWeight(r.weight) });
    }
    const critById = new Map(criteria.map((c) => [c.id, c]));

    const optionMap = new Map<string, DecisionOption>();
    let unmatched = 0;
    for (const r of scoreRows) {
      const opt = (r.option ?? "").trim();
      const critKey = norm(r.criterion);
      if (!opt || !critKey) continue;
      const c = critById.get(critKey);
      if (!c) { unmatched++; continue; }
      if (!optionMap.has(opt)) optionMap.set(opt, { id: opt, label: opt, scores: {} });
      optionMap.get(opt)!.scores[c.id] = c.kind === "MUST" ? asBool(r.value) : asNum(r.value);
    }
    const options = [...optionMap.values()];
    const result = options.length && criteria.length ? analyzeDecision(criteria, options) : null;

    return (
      <section className="card p-6">
        <p className="eyebrow">KT karar motoru</p>
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">Canlı karar hesabı (MUST/WANT)</h2>
        <p className="text-xs text-[var(--muted-2)]">
          Kriter ve puanları girdikçe eleme ile ağırlıklı skor anında hesaplanır; LLM değil, deterministik motor.
        </p>
        {!result ? (
          <p className="mt-4 text-sm text-[var(--muted-2)]">
            Önce “Zorunlu/İsteğe bağlı kriterler” ve “Alternatifleri Puanla” adımlarını doldurun.
          </p>
        ) : (
          <>
            {result.recommended ? (
              <div className="alert alert-ok mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--st-ok)]">Önerilen alternatif</p>
                <p className="mt-1 text-[15px] font-semibold tracking-[-0.012em]">
                  {result.recommended.option.label}
                  <span className="text-[var(--st-ok)]"> · {Math.round(result.recommended.normalized * 100)}/100</span>
                </p>
                {result.close && (
                  <p className="mt-1 text-xs text-[var(--st-warn)]">
                    Karar kırılgan: ikinci sıradakiyle fark dar; seçileni riskleriyle ayrıca tartın.
                  </p>
                )}
              </div>
            ) : (
              <p className="alert alert-risk mt-4">
                Hiçbir alternatif tüm zorunlu (MUST) kriterleri karşılamıyor; kriterleri veya alternatifleri gözden geçirin.
              </p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {result.ranked.map((e) => (
                <div
                  key={e.option.id}
                  className={`record-row flex flex-wrap items-center justify-between gap-2 text-sm ${e.eliminated ? "record-row-risk" : ""}`}
                >
                  <span className="font-medium">{e.option.label}</span>
                  {e.eliminated ? (
                    <span className="text-xs text-[var(--st-risk)]">Elendi · {e.failedMusts.join(", ")}</span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">
                      Ağırlıklı skor {Math.round(e.normalized * 100)}/100
                      {e.unverifiedMusts.length ? ` · doğrulanmamış: ${e.unverifiedMusts.join(", ")}` : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="subtle-panel mt-4">
              <p className="text-xs font-semibold text-[var(--muted)]">Gerekçe</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-[var(--ink-soft)]">
                {result.trace.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            {unmatched > 0 && (
              <p className="mt-2 text-xs text-[var(--st-warn)]">
                {unmatched} puan satırı bir kriterle eşleşmedi — “Kriter” adını MUST/WANT tablolarındaki adla birebir yazın.
              </p>
            )}
          </>
        )}
      </section>
    );
  }
  return null;
}
