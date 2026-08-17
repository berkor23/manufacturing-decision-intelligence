"use client";

// Adım editörü: playbook adımının yapılandırılmış formu (tablo, 5 Neden, balık kılçığı).
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.

import { useState } from "react";
import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import { friendlyStepName, terminologyFor } from "@/components/workspace/terminology";
import { FISHBONE_CATEGORIES, FieldValue, PlaybookField, PlaybookStep, StepState, TableRow, fieldFilled, fieldImportance, fieldQualityIssue, isCellMarked, normalizeFishboneCategory, stepIsComplete } from "@/domain/playbook";
import type { Methodology } from "@/domain/diagnosis";

export function StepBadge({
  index,
  status,
  active,
}: {
  index: number;
  status: string;
  active: boolean;
}) {
  if (stepIsComplete(status)) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center bg-[var(--st-ok)] text-[10px] font-bold text-[var(--on-ink)]">
        ✓
      </span>
    );
  }
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center text-[10px] font-bold ${ active ? "bg-[var(--ink)] text-[var(--on-ink)]"
          : status === "IN_PROGRESS"
            ? "bg-[var(--st-warn-bg)] text-[var(--st-warn)]  "
            : "bg-[var(--surface-mark)] text-[var(--muted)]"
      }`}
    >
      {index + 1}
    </span>
  );
}

// ── Aktif adım formu ─────────────────────────────────────────────

export function StepEditor({
  workspaceId,
  methodology,
  step,
  state,
  stepIndex,
  stepCount,
  dirty,
  onChange,
  onNavigate,
  onDrafted,
  ensureSaved,
  localMode = false,
  prerequisiteMessage,
}: {
  workspaceId: string;
  methodology: Methodology;
  step: PlaybookStep;
  state: StepState;
  stepIndex: number;
  stepCount: number;
  dirty: boolean;
  onChange: (s: StepState) => void;
  onNavigate: (i: number) => void;
  onDrafted: (ws: WsData) => void;
  ensureSaved: () => Promise<boolean>;
  localMode?: boolean;
  prerequisiteMessage?: string;
}) {
  const [drafting, setDrafting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCompletionGate, setShowCompletionGate] = useState(false);
  const [completionJustification, setCompletionJustification] = useState(
    typeof state.values.__completionJustification === "string"
      ? state.values.__completionJustification
      : "",
  );
  const displayName = friendlyStepName(step.key, step.name);

  const filledCount = step.fields.filter((f) =>
    fieldFilled(state.values[f.key]),
  ).length;
  const completionPercent = step.fields.length
    ? Math.round((filledCount / step.fields.length) * 100)
    : 100;
  const done = stepIsComplete(state.status);
  const fieldIssues = step.fields.flatMap((field) => {
    const issue = fieldQualityIssue(field, state.values[field.key]);
    return issue ? [{ field, issue }] : [];
  });
  const missingFields = fieldIssues.map(({ field }) => field);
  const expectedOutput =
    step.expectedOutput ??
    `${step.fields.map((field) => field.label).join(", ")} kayıtlarının karar verilebilir ve izlenebilir biçimde oluşturulması.`;
  const completionCriteria = step.completionCriteria ?? [
    "Yazılan sonuç gözlem, ölçüm veya doğrulanabilir bir kaynağa dayanıyor.",
    "Varsayım ile doğrulanmış gerçek birbirinden açıkça ayrılıyor.",
    "Kararın sahibi, kapsamı ve gerekiyorsa sonraki aksiyonu anlaşılabiliyor.",
  ];

  function setValue(fieldKey: string, v: FieldValue) {
    onChange({
      ...state,
      status: state.status === "PENDING" || stepIsComplete(state.status) || state.status === "READY"
        ? "IN_PROGRESS"
        : state.status,
      values: { ...state.values, [fieldKey]: v },
    });
  }

  async function draft() {
    setDrafting(true);
    setErr(null);
    try {
      // Yerel değişiklikler kaybolmasın: önce kaydet.
      if (dirty && !(await ensureSaved()))
        throw new Error("Taslak öncesi kaydetme başarısız.");
      const res = await fetch(`/api/workspace/${workspaceId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepKey: step.key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Taslak üretilemedi.");
      onDrafted(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Hata.");
    } finally {
      setDrafting(false);
    }
  }

  function requestCompletion() {
    if (done) {
      setShowCompletionGate(false);
      onChange({ ...state, status: "IN_PROGRESS" });
      return;
    }
    if (prerequisiteMessage) {
      setErr(prerequisiteMessage);
      return;
    }
    if (missingFields.length > 0) {
      setShowCompletionGate(true);
      return;
    }
    setErr(null);
    onChange({ ...state, status: state.status === "READY" ? "VERIFIED" : "READY" });
  }

  function completeWithJustification() {
    const reason = completionJustification.trim();
    if (reason.length < 20) {
      setErr("Eksik alanlarla tamamlamak için en az 20 karakterlik, denetlenebilir bir gerekçe yazın.");
      return;
    }
    setErr(null);
    setShowCompletionGate(false);
    onChange({
      ...state,
      status: "SKIPPED",
      values: { ...state.values, __completionJustification: reason },
    });
  }

  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">{displayName}</h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {step.objective}
          </p>
        </div>
        {!localMode && <button
          onClick={draft}
          disabled={drafting}
          className="rounded-lg border border-[var(--st-ok-rule)] px-3 py-1.5 text-xs font-medium text-[var(--st-ok)] transition hover:bg-[var(--st-ok-bg)] disabled:opacity-40"
          title="Boş alanlara probleme özel profesyonel taslak doldurur"
        >
          {drafting ? "Taslak üretiliyor…" : "AI ile taslak doldur"}
        </button>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border border-[var(--rule)] bg-[var(--surface-sunk)] p-4 text-sm text-[var(--ink-soft)]">
          <strong className="block text-[var(--ink)]">
            Bu adım nasıl yürütülür?
          </strong>
          <p className="mt-1.5 leading-6">{step.guidance}</p>
        </div>
        <div className="border border-[var(--rule)] border-l-[3px] border-l-[var(--ink)] bg-[var(--surface-sunk)] p-4 text-sm text-[var(--ink-soft)]">
          <strong className="block text-[var(--ink)]">
            Adımın beklenen çıktısı
          </strong>
          <p className="mt-1.5 leading-6">{expectedOutput}</p>
        </div>
      </div>

      <details className="subtle-panel text-sm">
        <summary className="cursor-pointer font-semibold text-[var(--ink-soft)]">
          Tamamlamadan önce kalite kontrolü
        </summary>
        <ul className="mt-3 space-y-2 text-[var(--ink-soft)]">
          {completionCriteria.map((criterion) => (
            <li key={criterion} className="flex gap-2">
              <span className="text-[var(--st-ok)]">✓</span>
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-[var(--rule)] pt-3 text-xs text-[var(--muted)]">
          Bu adım vakaya uygulanmıyorsa boş bırakmak yerine neden
          uygulanmadığını ve aynı güvenceyi hangi kayıt veya kontrolün
          sağladığını ilgili alanda belirtin.
        </p>
      </details>

      {err && <p className="text-xs text-[var(--st-risk)]">{err}</p>}

      <div className="flex flex-col gap-4" aria-label={`${step.name} alanları`}>
        {step.fields.map((f) => (
          <FieldEditor
            key={f.key}
            field={f}
            methodology={methodology}
            value={state.values[f.key]}
            onChange={(v) => setValue(f.key, v)}
          />
        ))}
      </div>

      {showCompletionGate && (
        <div className="alert alert-warn" role="alert">
          <strong className="text-[var(--st-warn)]">
            Bu adımda {missingFields.length} alan kalite kapısını karşılamıyor
          </strong>
          <p className="mt-1 leading-6 text-[var(--st-warn)]">
            {fieldIssues.map(({ field, issue }) => `${field.label}: ${issue}`).join(" · ")}
            Bu bilgiler gerçekten uygulanmıyorsa, nedenini ve aynı güvenceyi hangi
            kayıt ya da kontrolün sağladığını aşağıya yazın.
          </p>
          <label className="mt-3 block font-semibold text-[var(--st-warn)]" htmlFor={`completion-reason-${step.key}`}>
            Eksik alanlarla tamamlama gerekçesi
          </label>
          <textarea
            id={`completion-reason-${step.key}`}
            value={completionJustification}
            onChange={(event) => setCompletionJustification(event.target.value)}
            rows={3}
            className="field mt-1 resize-y"
            placeholder="Örn. Bu ölçüm bu ürün ailesinde uygulanmıyor; aynı güvence 18.07 tarihli müşteri kabul kaydıyla sağlandı."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={completeWithJustification}>
              Gerekçeyle tamamla
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCompletionGate(false)}>
              Alanlara dön
            </button>
          </div>
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={requestCompletion}
            className={done ? "btn btn-secondary" : "btn btn-primary"}
          >
            {done
              ? "Tamamlanma durumunu kaldır"
              : state.status === "READY"
                ? "✓ Gözden geçirdim, doğrula"
                : "✓ İncelemeye hazırla"}
          </button>
          <div
            className="min-w-36"
            aria-label={`Adım doluluk oranı yüzde ${completionPercent}`}
          >
            <div className="flex justify-between text-xs text-[var(--muted-2)]">
              <span>
                {filledCount}/{step.fields.length} alan dolu
              </span>
              <span>%{completionPercent}</span>
            </div>
            <div className="meter mt-1">
              <span className="meter-fill block" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
          {!done && state.status !== "READY" && missingFields.length === 0 && (
            <p className="max-w-xs text-[11px] leading-4 text-[var(--muted-2)]">
              İlk tık adımı incelemeye hazırlar; ikinci kontrol doğrulanmış olarak kapatır.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="btn btn-secondary"
          >
            Önceki
          </button>
          <button
            onClick={() => onNavigate(stepIndex + 1)}
            disabled={stepIndex >= stepCount - 1}
            className="btn btn-secondary"
          >
            Sonraki →
          </button>
        </div>
      </div>
    </section>
  );
}

export function FieldEditor({
  field,
  methodology,
  value,
  onChange,
}: {
  field: PlaybookField;
  methodology?: Methodology;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
}) {
  const rows = Array.isArray(value) ? value : [];
  const filled = fieldFilled(value);
  const importance = fieldImportance(field);
  const qualityIssue = fieldQualityIssue(field, value);
  const guide = getFieldGuide(field, methodology);
  const terminology = terminologyFor(`${field.label} ${field.help ?? ""} ${field.rationale ?? ""}`);
  const inputId = `playbook-field-${field.key}`;
  const helpId = `${inputId}-help`;
  return (
    <div
      className={`record-row transition ${filled ? "record-row-ok" : ""}`}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--ink-soft)]"
          >
            {field.label}
          </label>
          <p
            id={helpId}
            className="mt-1 text-xs leading-5 text-[var(--muted)]"
          >
            {guide.rationale}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={`tag ${importance ==="REQUIRED" ? "bg-[var(--st-risk-bg)] text-[var(--st-risk)]  " : importance === "CONDITIONAL" ? "bg-[var(--st-warn-bg)] text-[var(--st-warn)]  " : "bg-[var(--surface-mark)] text-[var(--muted)]"}`}>{importance === "REQUIRED" ? "Zorunlu" : importance === "CONDITIONAL" ? "Koşullu" : "İsteğe bağlı"}</span>
          <span className={`tag ${filled && !qualityIssue ? "bg-[var(--st-ok-bg)] text-[var(--st-ok)]  " : "bg-[var(--surface-mark)] text-[var(--muted)]"}`}>{filled && !qualityIssue ? "Yeterli kayıt" : qualityIssue ?? "Girdi bekliyor"}</span>
        </div>
      </div>
      {importance === "CONDITIONAL" && <p className="alert alert-warn mb-2 text-[11px]"><strong>Ne zaman gerekli?</strong> {field.condition ?? "Bu konu mevcut vakada geçerliyse doldurun; geçerli değilse neden uygulanmadığını somut biçimde yazın."}</p>}
      {field.type === "fivewhy" ? (
        <FiveWhyEditor rows={rows} onChange={onChange} />
      ) : field.type === "fishbone" ? (
        <FishboneEditor rows={rows} onChange={onChange} />
      ) : field.type === "table" ? (
        <TableEditor field={field} rows={rows} onChange={onChange} />
      ) : field.type === "textarea" ? (
        <textarea
          id={inputId}
          aria-describedby={helpId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={field.help ?? ""}
          className="field resize-y"
        />
      ) : (
        <input
          id={inputId}
          aria-describedby={helpId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.help ?? ""}
          className="field"
        />
      )}
      <div className="mt-2 grid gap-1 text-[11px] leading-5 text-[var(--muted)] sm:grid-cols-2">
        <p>
          <strong className="text-[var(--ink-soft)]">
            İyi kayıt ölçütü:
          </strong>{" "}
          {guide.acceptance}
        </p>
        <p>
          <strong className="text-[var(--ink-soft)]">Örnek:</strong>{" "}
          {guide.example}
        </p>
      </div>
      {terminology.length > 0 && (
        <div className="subtle-panel mt-3 px-3 py-2 text-[11px] leading-relaxed text-[var(--ink-soft)]">
          <strong>Bu alandaki terimler</strong>
          <ul className="mt-1 space-y-1">
            {terminology.map((entry) => (
              <li key={entry.term}><span className="font-semibold">{entry.term}:</span> {entry.meaning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function getFieldGuide(field: PlaybookField, methodology?: Methodology): {
  rationale: string;
  acceptance: string;
  example: string;
} {
  const label = field.label.toLocaleLowerCase("tr-TR");
  const rationale =
    field.rationale ??
    (field.type === "fivewhy"
      ? "Neden-sonuç zincirini görünür kılar; ilk makul açıklamada durmayı ve görüşü kök neden sanmayı önler."
      : field.type === "fishbone"
        ? "Olası nedenleri 6M başlıklarında genişletir; ekipteki farklı uzmanlıkların sistematik biçimde değerlendirilmesini sağlar."
        : field.type === "table"
          ? "Birden fazla kaydı aynı yapıda karşılaştırmayı; sahiplik, kapsam ve takip bilgisini satır bazında izlemeyi sağlar."
          : label.includes("kanıt") || label.includes("doğrula")
            ? "Kararın yalnız kanaate değil, başka bir kişinin de inceleyebileceği nesnel bir dayanağa bağlanmasını sağlar."
            : label.includes("hedef") ||
                label.includes("metrik") ||
                label.includes("sonuç")
              ? "Başarı ölçüsünü görünür kılar ve uygulama sonrasında önce-sonra karşılaştırması yapılabilmesini sağlar."
              : label.includes("neden")
                ? "Problemi belirti düzeyinde bırakmadan sınanabilir bir nedensel açıklamaya dönüştürür."
                : label.includes("kapsam") || label.includes("nerede")
                  ? "Analizin sınırını netleştirir; genellemeyi ve kapsam dışı sonuç üretmeyi önler."
                  : label.includes("sorumlu") ||
                      label.includes("lider") ||
                      label.includes("ekip")
                    ? "Kararın ve takibin sahipsiz kalmasını önler; kimin katkı veya onay vereceğini görünür yapar."
                    : "Bu adımın sonucunu izlenebilir bir çalışma kaydına dönüştürür ve sonraki adımın doğru bilgiyle başlamasını sağlar.");

  const acceptance =
    field.acceptance ??
    (field.type === "table"
      ? "Her satır tek bir kaydı anlatsın; kritik hücreler boş kalmasın ve ifadeler birbirinden ayırt edilebilir olsun."
      : field.type === "fivewhy"
        ? "Her neden bir önceki ifadeyi açıklasın, kanıtı yazılsın ve kök neden yalnız doğrulandıktan sonra işaretlensin."
        : field.type === "fishbone"
          ? "Başlık başına olası nedenler üretildikten sonra her neden veriyle elensin veya güçlendirilsin."
          : "Somut, vakaya özgü ve başka bir kişinin aynı şekilde yorumlayabileceği açıklıkta olsun; mümkünse tarih, sayı ve kaynak içersin.");

  const methodContext: Partial<Record<Methodology, string>> = {
    FMEA: "Yeni tedarikçi devreye alındığında yapışma kaybı riski",
    KEPNER_TREGOE: "yalnız gece vardiyasında görülen kaynak çatlağı",
    RCA: "Hat 2'de tekrar eden conta sızıntısı",
    EIGHT_D: "müşteriye ulaşmış kaynak çatlağı",
    PDCA_A3: "paketleme çevrim süresinin azaltılması",
    DMAIC: "dolum ağırlığındaki kronik varyasyon",
    FIVE_S: "kalıp değiştirme alanındaki düzensizlik",
    TPM: "pres hattındaki tekrar eden rulman duruşu",
    LEAN_VSM: "fırın önündeki kuyruk ve ara stok",
    DMADV: "yeni ürün için sızdırmazlık tasarımı",
    SPC: "kritik çap ölçümünün zaman içindeki değişimi",
    POKA_YOKE: "ters takılabilen konnektör",
    TOC: "sistem çıktısını sınırlayan fırın kapasitesi",
    SDCA: "vardiyalar arasında farklı uygulanan ayar standardı",
    KT_DECISION: "iki CNC tezgâhı yatırım alternatifi",
  };
  const example =
    field.example ??
    field.help ??
    (field.type === "table"
      ? "Bir satır = bir aksiyon, gözlem, kişi veya hipotez; örn. “Hat 2 sensör kontrolü · Ayşe K. · 22.07 · Devam ediyor”."
      : field.type === "fivewhy"
        ? "“Conta ezildi” → “Sıkma kuvveti üst limitteydi”; kanıt: tork kaydı ve tekrar deneyi."
        : field.type === "fishbone"
          ? "Makine: fikstür boşluğu; değerlendirme: komparatör ölçümünde 0,4 mm sapma görüldü."
          : label.includes("hedef")
            ? "“Hurda oranını 30 Eylül'e kadar %4,2'den %1,0'ın altına indirmek.”"
            : label.includes("neden")
              ? "“Besleme basıncı 5,5 bar altına düştüğünde eksik dolum oluşuyor; üç tekrar deneyiyle doğrulandı.”"
              : methodology
                ? `“${methodContext[methodology]} için kapsam, ölçüm, kaynak ve karar sahibi somut biçimde kaydedildi.”`
                : "“Hat 2'de, 18 Temmuz gece vardiyasında 480 parçanın 23'ünde (%4,8) sapma ölçüldü.”");

  return { rationale, acceptance, example };
}

export function TableEditor({
  field,
  rows,
  onChange,
}: {
  field: PlaybookField;
  rows: TableRow[];
  onChange: (rows: TableRow[]) => void;
}) {
  const cols = field.columns ?? [];
  const emptyRow = () =>
    Object.fromEntries(cols.map((c) => [c.key, ""])) as TableRow;

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--rule)]">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-[var(--rule)] bg-[var(--surface-sunk)] text-left">
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-2.5 py-2 text-xs font-semibold text-[var(--ink-soft)]"
              >
                {c.label}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[var(--rule-faint)] last:border-0"
            >
              {cols.map((c) => (
                <td key={c.key} className="p-1">
                  <input
                    aria-label={`${field.label}, ${i + 1}. satır, ${c.label}`}
                    value={row[c.key] ?? ""}
                    onChange={(e) =>
                      onChange(
                        rows.map((r, j) =>
                          j === i ? { ...r, [c.key]: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder={c.help ?? `${c.label} girin`}
                    className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none transition focus:border-[var(--rule-strong)] focus:bg-[var(--surface)]"
                  />
                </td>
              ))}
              <td className="p-1 text-center">
                <button
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  className="text-[var(--muted-2)] hover:text-[var(--st-risk)]"
                  title="Satırı sil"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={cols.length + 1}
                className="px-3 py-3 text-center text-xs text-[var(--muted-2)]"
              >
                Henüz satır yok — elle ekle ya da &quot;AI ile taslak
                doldur&quot;.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="border-t border-[var(--rule-faint)] p-1.5">
        <button
          onClick={() => onChange([...rows, emptyRow()])}
          className="chip"
        >
          + Satır ekle
        </button>
      </div>
    </div>
  );
}

// ── 5 Neden aracı (zincir + kök neden işareti) ───────────────────

export function FiveWhyEditor({
  rows,
  onChange,
}: {
  rows: TableRow[];
  onChange: (r: TableRow[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    if (!draft.trim()) return;
    onChange([
      ...rows,
      {
        level: String(rows.length + 1),
        why: draft.trim(),
        evidence: "",
        isRoot: "",
      },
    ]);
    setDraft("");
  };
  const patch = (i: number, p: TableRow) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const remove = (i: number) =>
    onChange(
      rows
        .filter((_, j) => j !== i)
        .map((r, j) => ({ ...r, level: String(j + 1) })),
    );

  return (
    <div className="record-row">
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const root = isCellMarked(r.isRoot);
          return (
            <li
              key={i}
              className={`rounded-lg border p-2.5 transition ${ root ? "border-[var(--st-ok-rule)] bg-[var(--st-ok-bg)]  "
                  : "border-[var(--rule)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center bg-[var(--surface-mark)] text-[10px] font-bold text-[var(--ink-soft)]">
                  {i + 1}
                </span>
                <input
                  value={r.why ?? ""}
                  onChange={(e) => patch(i, { why: e.target.value })}
                  placeholder="Neden?"
                  className="field"
                />
                <button
                  onClick={() => patch(i, { isRoot: root ? "" : "evet" })}
                  title="Kök neden olarak işaretle"
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${ root ? "bg-[var(--st-ok)] text-[var(--on-ink)]"
                      : "border border-[var(--rule-strong)] text-[var(--muted)] hover:border-[var(--st-ok-rule)] hover:text-[var(--st-ok)]"
                  }`}
                >
                  {root ? "✓ Kök neden" : "Kök neden"}
                </button>
                <button
                  onClick={() => remove(i)}
                  className="shrink-0 text-[var(--muted-2)] hover:text-[var(--st-risk)]"
                >
                  ✕
                </button>
              </div>
              <input
                value={r.evidence ?? ""}
                onChange={(e) => patch(i, { evidence: e.target.value })}
                placeholder="Kanıt — bu nedeni neye dayanarak söylüyorsun?"
                className="field mt-1.5 text-xs"
              />
            </li>
          );
        })}
      </ol>
      {rows.length === 0 && (
        <p className="px-1 py-2 text-center text-xs text-[var(--muted-2)]">
          Zincir boş — ilk &quot;neden?&quot; ile başla ya da &quot;AI ile
          taslak doldur&quot;.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={
            rows.length === 0 ? "Neden oldu? →" : "Peki bu neden oldu? →"
          }
          className="field"
        />
        <button onClick={add} className="btn btn-secondary shrink-0">
          Ekle
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted-2)]">
        Kök neden, &quot;kaldırınca problem tekrarlanamıyor&quot; olduğunda
        doğrulanmıştır — zinciri oraya kadar derinleştir.
      </p>
    </div>
  );
}

// ── Balık kılçığı aracı (6M sütunları) ───────────────────────────

export function FishboneEditor({
  rows,
  onChange,
}: {
  rows: TableRow[];
  onChange: (r: TableRow[]) => void;
}) {
  // Satırlar 6M kovalarına dağıtılır; tanınmayan kategori "Sınıflandırılmamış"a düşer.
  const buckets = new Map<string, { row: TableRow; index: number }[]>();
  const unmatched: { row: TableRow; index: number }[] = [];
  for (const [index, row] of rows.entries()) {
    const key = normalizeFishboneCategory(row.category);
    if (!key) unmatched.push({ row, index });
    else buckets.set(key, [...(buckets.get(key) ?? []), { row, index }]);
  }

  const patch = (i: number, p: TableRow) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FISHBONE_CATEGORIES.map((cat) => (
        <FishboneColumn
          key={cat.key}
          label={cat.label}
          entries={buckets.get(cat.key) ?? []}
          onAdd={(cause) =>
            onChange([...rows, { category: cat.label, cause, assessment: "" }])
          }
          onPatch={patch}
          onRemove={remove}
        />
      ))}
      {unmatched.length > 0 && (
        <div className="sm:col-span-2">
          <FishboneColumn
            label="Sınıflandırılmamış"
            entries={unmatched}
            onPatch={patch}
            onRemove={remove}
          />
        </div>
      )}
    </div>
  );
}

export function FishboneColumn({
  label,
  entries,
  onAdd,
  onPatch,
  onRemove,
}: {
  label: string;
  entries: { row: TableRow; index: number }[];
  onAdd?: (cause: string) => void;
  onPatch: (i: number, p: TableRow) => void;
  onRemove: (i: number) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="record-row">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--ink)]">
          {label}
        </span>
        <span className="text-[11px] text-[var(--muted-2)]">{entries.length}</span>
      </div>
      <ul className="mb-2 flex flex-col gap-1.5">
        {entries.map(({ row, index }) => (
          <li
            key={index}
            className="rounded-lg bg-[var(--surface-sunk)] p-1.5"
          >
            <div className="flex items-center gap-1.5">
              <input
                value={row.cause ?? ""}
                onChange={(e) => onPatch(index, { cause: e.target.value })}
                placeholder="Olası neden"
                className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm outline-none transition focus:border-[var(--rule-strong)] focus:bg-[var(--surface)]"
              />
              <button
                onClick={() => onRemove(index)}
                className="shrink-0 text-[var(--muted-2)] hover:text-[var(--st-risk)]"
              >
                ✕
              </button>
            </div>
            <input
              value={row.assessment ?? ""}
              onChange={(e) => onPatch(index, { assessment: e.target.value })}
              placeholder="Değerlendirme (kanıtla)…"
              className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-[var(--muted)] outline-none transition focus:border-[var(--rule-strong)] focus:bg-[var(--surface)]"
            />
          </li>
        ))}
      </ul>
      {onAdd && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
          placeholder={`${label} nedeni…`}
          className="field text-xs"
        />
      )}
    </div>
  );
}

// ── Aksiyon takibi ───────────────────────────────────────────────
