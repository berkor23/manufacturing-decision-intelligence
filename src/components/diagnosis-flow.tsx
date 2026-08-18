"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DiagnosisView } from "@/application/diagnosis-service";
import type { Conversation } from "@/application/ports/conversation-repository";
import { FEATURE_META, PROBLEM_TEXT_MIN, PROBLEM_TEXT_TOO_LONG, problemTextAcceptable, type DiagnosticFeatureKey } from "@/domain/diagnosis";
import { METHODOLOGY_META, METHODOLOGY_ROLES, type Methodology } from "@/domain/diagnosis/methodologies";
import { closeAlternatives, nextMethodologies } from "@/domain/diagnosis/sequence";
import { Markdown } from "@/components/markdown";
import { LocalStorageNotice } from "@/components/local-storage-notice";
import {
  ContestedSignalsPanel,
  ContrastiveTracePanel,
  MissingEvidencePanel,
  ProblemSummaryPanel,
} from "@/components/diagnosis-result-panels";
import { listGuestDiagnoses, saveGuestDiagnosis, saveGuestWorkspace, type GuestDiagnosisRecord } from "@/lib/guest-storage";
import { createGuestWorkspace } from "@/lib/guest-workspace-factory";
import { SHOWCASE_CASES } from "@/domain/diagnosis/showcase-cases";

const pct = (c: number) => Math.round(c * 100);
const supportLabel=(value:number)=>value>=0.55?"Çok güçlü":value>=0.35?"Güçlü":value>=0.2?"Orta":value>=0.1?"Sınırlı":"Zayıf";
const evidenceLevel=(view:DiagnosisView)=>view.evidence.status==="CONFIRMED"?"İyi desteklenen öneri":view.evidence.status==="INCONCLUSIVE"?"Ek kanıt gerekli":view.evidence.supportingSignals>=3&&view.evidence.knownAnswers>=4?"Güçlenen aday":view.evidence.supportingSignals>=2?"Doğrulama bekleyen öneri":"İlk yönlendirme";
const label = (m: Methodology) => METHODOLOGY_META[m].shortName;
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Devam eden teşhisin kimliğini adres çubuğunda taşı.
 *
 * Üye kullanıcının oturumu yalnız React state'inde yaşıyordu: sekme kapanınca,
 * sayfa yenilenince veya "Yeni teşhis"e basılınca verilen cevaplar ekrandan
 * kayboluyordu — kayıt veritabanında dursa bile ona dönmenin yolu yoktu.
 * Kimlik URL'de olunca yenileme, geri tuşu ve yer imi çalışır; yetkilendirmeyi
 * proxy zaten /api/diagnosis/conv_* deseninde yapıyor.
 */
const CONVERSATION_PARAM = "c";

function readConversationParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(CONVERSATION_PARAM);
}

function writeConversationParam(id: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(CONVERSATION_PARAM, id);
  else url.searchParams.delete(CONVERSATION_PARAM);
  window.history.replaceState(null, "", url.toString());
}

/** Yerel depodaki devam eden (ASKING) misafir teşhisi — yoksa null. */
async function findResumableGuestDiagnosis(): Promise<GuestDiagnosisRecord | null> {
  try {
    const rows = await listGuestDiagnoses();
    return rows.find((row) => row.view.status === "ASKING") ?? null;
  } catch {
    return null;
  }
}

/**
 * Üç durumlu seçim. Eski hâli iOS tarzı "gri hap içinde kayan beyaz kutu"ydu;
 * yerine üç bitişik hücre geldi. Seçili hücre mürekkeple dolar — ayrım renkle
 * değil kontrastla kurulur, böylece renk yalnız duruma ayrılmış kalır.
 */
function TernaryChoice({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
}) {
  const options: { label: string; value: boolean | null }[] = [
    { label: "Evet", value: true },
    { label: "Hayır", value: false },
    { label: "Emin değilim", value: null },
  ];
  return (
    <div className="flex shrink-0 border border-[var(--rule-strong)]" role="group">
      {options.map((option, index) => {
        const selected = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${ index > 0 ? "border-l border-[var(--rule-strong)]" : ""
            } ${
              selected
                ? "bg-[var(--ink)] text-[var(--on-ink)]"
                : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Bölüm başlığı: cetvelle ayrılmış, sağda küçük künye. */
function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-strong)] pb-2">
      <h3 className="section-heading">{title}</h3>
      {note && <span className="eyebrow shrink-0">{note}</span>}
    </div>
  );
}

function responseError(response: Response, fallback: string, serverMessage?: string): Error {
  if (response.status === 429) {
    const seconds = Number(response.headers.get("Retry-After"));
    const wait = Number.isFinite(seconds) && seconds > 0
      ? ` Yaklaşık ${seconds} saniye sonra yeniden deneyebilirsiniz.`
      : " Kısa bir süre sonra yeniden deneyebilirsiniz.";
    return new Error(`${serverMessage ?? "İstek sınırına ulaşıldı."}${wait}`);
  }
  return new Error(serverMessage ?? fallback);
}

function normalizeDiagnosisView(data: DiagnosisView): DiagnosisView {
  if (data.evidence && data.methodPlan && data.stabilization) {
    return { ...data, featureSources: data.featureSources ?? {} };
  }
  const knownAnswers = data.structuredProblem
    ? Object.values(data.structuredProblem.features).filter((value) => value !== null).length
    : 0;
  const top = data.ranking?.[0]?.score ?? 0;
  const second = data.ranking?.[1]?.score ?? 0;
  const primaryMethod = data.ranking?.[0]?.methodology ?? "PDCA_A3";
  const primaryRole = METHODOLOGY_ROLES[primaryMethod];
  return {
    ...data,
    featureSources: data.featureSources ?? {},
    evidence: data.evidence ?? {
      knownAnswers,
      supportingSignals: 0,
      supportingFeatures: [],
      scoreMargin: top - second,
      conflicts: [],
      ready: false,
      status: "PROVISIONAL",
    },
    methodPlan: data.methodPlan ?? {
      primary: {
        layer: "PRIMARY",
        layerLabel: "Ana çalışma omurgası",
        methodology: primaryMethod,
        methodologyRole: primaryRole.role,
        roleLabel: primaryRole.label,
        score: top,
        confidence: data.ranking?.[0]?.confidence ?? 0,
        reason: METHODOLOGY_META[primaryMethod].description,
      },
      supporting: [],
    },
    stabilization: data.stabilization ?? {
      status: "UNKNOWN",
      blockers: [],
      unknowns: ["standardWorkEstablished", "basicConditionsStable", "measurementReliable", "processStable"],
    },
  };
}

export function DiagnosisFlow({ authenticated }: { authenticated: boolean }) {
  const router = useRouter();
  const [view, setView] = useState<DiagnosisView | null>(null);
  const [text, setText] = useState("");
  const [freeAnswer, setFreeAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestState, setGuestState] = useState<Conversation | null>(null);
  const [savedDiagnosis, setSavedDiagnosis] = useState<GuestDiagnosisRecord | null>(null);
  const [reviewPending, setReviewPending] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      void findResumableGuestDiagnosis().then(setSavedDiagnosis);
      return;
    }
    // Üye: adres çubuğundaki kimlikten oturumu geri yükle.
    const id = readConversationParam();
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/diagnosis/${id}`);
        const data = res.ok ? ((await res.json()) as DiagnosisView) : null;
        if (cancelled) return;
        // Kayıt yoksa veya erişim yoksa kimliği adres çubuğundan düşür;
        // kullanıcı ölü bir bağlantıyla baş başa kalmasın.
        if (data) setView(normalizeDiagnosisView(data));
        else writeConversationParam(null);
      } catch {
        if (!cancelled) writeConversationParam(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authenticated]);

  // Görünüm değiştikçe kimliği adres çubuğunda güncel tut.
  //
  // SONUÇLANMIŞ teşhis de kimliğini korur. Kimlik eskiden CONCLUDED olunca
  // düşürülüyordu (muhtemelen "iş bitti, adresi temizle" niyetiyle); sonucu
  // şuydu: kullanıcı en değerli ekrana — gerekçeli öneri ve karar zinciri —
  // ulaşıyor, sayfayı yenilediğinde boş forma dönüyordu. Kayıt veritabanında
  // duruyor ve /diagnoz?c=… ile açılıyor; kaybolan yalnızca ona dönmenin
  // yoluydu. Adres çubuğu, ekrandaki işin tek kalıcı tutamağı.
  //
  // Kimlik yalnız iki durumda düşer: "Yeni teşhis" ile bilinçli sıfırlama
  // (bkz. reset) ve kaydın okunamaması (bkz. yükleme etkisi).
  useEffect(() => {
    if (!authenticated) return;
    writeConversationParam(view ? view.conversationId : null);
  }, [authenticated, view]);

  async function call(url: string, body: { text: string }, operation: "START" | "ANSWER") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(authenticated ? url : "/api/guest/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authenticated ? body : {
          operation,
          text: body.text,
          ...(operation === "ANSWER" ? { state: guestState } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw responseError(res, "İstek başarısız.", data.error);
      const nextView = normalizeDiagnosisView((authenticated ? data : data.view) as DiagnosisView);
      setView(nextView);
      if (operation === "START" && nextView.status === "ASKING") setReviewPending(true);
      if (!authenticated) {
        const nextState = data.state as Conversation;
        setGuestState(nextState);
        await saveGuestDiagnosis({
          id: nextState.id,
          title: nextView.structuredProblem.problemDescription ?? body.text,
          view: nextView,
          state: nextState,
          createdAt: nextState.createdAt,
          updatedAt: nextState.updatedAt,
        });
      }
      setFreeAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata.");
    } finally {
      setLoading(false);
    }
  }

  const start = () => call("/api/diagnosis", { text: text.trim() }, "START");
  const answer = (t: string) =>
    view && call(`/api/diagnosis/${view.conversationId}/answer`, { text: t }, "ANSWER");
  async function reviewFeatures(corrections: Partial<Record<DiagnosticFeatureKey, boolean | null>>) {
    if (!view) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(authenticated ? `/api/diagnosis/${view.conversationId}` : "/api/guest/diagnosis", {
        method: authenticated ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authenticated
          ? { corrections }
          : { operation: "REVIEW", corrections, state: guestState }),
      });
      const data = await res.json();
      if (!res.ok) throw responseError(res, "Gözden geçirme tamamlanamadı.", data.error);
      const nextView = normalizeDiagnosisView((authenticated ? data : data.view) as DiagnosisView);
      setView(nextView);
      setReviewPending(false);
      if (!authenticated) {
        const nextState = data.state as Conversation;
        setGuestState(nextState);
        await saveGuestDiagnosis({
          id: nextState.id,
          title: nextView.structuredProblem.problemDescription ?? "Yerel teşhis",
          view: nextView,
          state: nextState,
          createdAt: nextState.createdAt,
          updatedAt: nextState.updatedAt,
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gözden geçirme tamamlanamadı.");
    } finally {
      setLoading(false);
    }
  }
  /**
   * Yeni teşhise dön. Devam eden bir oturum varsa önce onay ister — buton
   * eskiden sessizce sıfırlıyordu ve verilen cevaplar ekrandan siliniyordu.
   *
   * Sıfırlamadan sonra kayıtlı misafir teşhisi YENİDEN OKUNUR: kayıt yerel
   * depoda duruyor olsa bile "yarım kalan teşhisiniz var" bandı yalnız sayfa
   * açılışında hesaplanıyordu, dolayısıyla kullanıcı sayfayı elle yenilemeden
   * kendi kaydına geri dönemiyordu.
   */
  const reset = () => {
    const midFlow = view !== null && view.status !== "CONCLUDED";
    if (midFlow && !window.confirm(
      "Bu teşhis oturumu kapatılıp yeni bir teşhise dönülecek. Verdiğiniz cevaplar bu ekrandan kaldırılır. Devam edilsin mi?",
    )) return;
    setView(null);
    setText("");
    setGuestState(null);
    setReviewPending(false);
    setError(null);
    writeConversationParam(null);
    if (!authenticated) void findResumableGuestDiagnosis().then(setSavedDiagnosis);
  };

  return (
    <main className="page-shell max-w-4xl flex-1">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--rule-strong)] pb-5">
        <div>
          <p className="eyebrow">Teşhis</p>
          <h1 className="page-heading mt-1.5">Problem teşhisi</h1>
          <p className="page-lead">Problemi tarif edin; sistem belirsizliği azaltan sorularla uygun yönteme kanıt biriktirsin.</p>
        </div>
        {view && (
          <button onClick={reset} className="btn btn-secondary">
            Yeni teşhis
          </button>
        )}
      </div>

      {!authenticated && <div className="mb-5"><LocalStorageNotice /></div>}

      {!view && savedDiagnosis && (
        <section className="card card-accent-indigo mb-5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Kayıtlı oturum</p>
              <strong className="mt-1 block text-[13px]">Yarım kalan bir teşhisiniz var</strong>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {savedDiagnosis.title}
                <span className="mx-1.5 text-[var(--muted-2)]">/</span>
                <span className="tabular-nums">
                  son kayıt {new Date(savedDiagnosis.updatedAt).toLocaleString("tr-TR")}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setSavedDiagnosis(null)}>
                Yeni teşhis yaz
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const resumed = normalizeDiagnosisView(savedDiagnosis.view);
                  setView(resumed);
                  setGuestState(savedDiagnosis.state);
                  setReviewPending(Object.values(resumed.featureSources).some((source) => source === "PARSER"));
                  setSavedDiagnosis(null);
                }}
              >
                Kaldığım yerden devam et
              </button>
            </div>
          </div>
        </section>
      )}

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {!view && (
        <Intake text={text} setText={setText} onStart={start} loading={loading} />
      )}

      {view && view.status === "ASKING" && reviewPending && (
        <InferenceReview view={view} loading={loading} onConfirm={reviewFeatures} />
      )}

      {view && view.status === "ASKING" && !reviewPending && (
        <AskingView
          view={view}
          loading={loading}
          onAnswer={answer}
          onReview={reviewFeatures}
          freeAnswer={freeAnswer}
          setFreeAnswer={setFreeAnswer}
        />
      )}

      {view && view.status === "CONCLUDED" && (
        <ResultView view={view} router={router} onReset={reset} onReview={reviewFeatures} authenticated={authenticated} />
      )}
      {authenticated && view && view.informationTasks.length > 0 && (
        <InformationTasks view={view} loading={loading} onView={setView} />
      )}
    </main>
  );
}

const REVIEW_PRIORITY: DiagnosticFeatureKey[] = [
  "defectOccurred", "decisionBetweenOptions", "bottleneckThroughput",
  "flowOrWaste", "equipmentBreakdown", "supplierChanged", "processChanged",
  "isNewDesign", "customerAffected", "hasMeasurementData", "highVariation",
];

const FAMILY_REVIEW_KEYS: Partial<Record<Methodology, DiagnosticFeatureKey[]>> = {
  FMEA: ["defectOccurred", "processChanged", "supplierChanged", "isNewDesign", "failureModeKnown", "potentialEffectKnown", "controlAdequacyUncertain"],
  TOC: ["bottleneckThroughput", "constraintQueue", "constraintMeasured", "constraintLeverageExpected", "flowOrWaste"],
  KT_DECISION: ["decisionBetweenOptions", "multipleAlternativesDefined", "unresolvedCauseBeforeDecision", "mandatoryCriteriaDefined", "decisionOwnerKnown"],
  EIGHT_D: ["defectOccurred", "externalNonconformance", "customerAffected", "containmentNeeded", "safetyOrRegulatory", "rootCauseKnown"],
  DMAIC: ["previouslyOccurred", "hasMeasurementData", "highVariation", "processStable", "measurementReliable"],
  TPM: ["equipmentBreakdown", "chronicEquipmentLoss", "previouslyOccurred", "basicConditionsStable", "standardWorkEstablished", "hasMeasurementData"],
};

function InferenceReview({
  view,
  loading,
  onConfirm,
}: {
  view: DiagnosisView;
  loading: boolean;
  onConfirm: (corrections: Partial<Record<DiagnosticFeatureKey, boolean | null>>) => void;
}) {
  const leader = view.ranking[0]?.methodology;
  const parserKeys = (Object.keys(FEATURE_META) as DiagnosticFeatureKey[])
    .filter((key) => view.featureSources[key] === "PARSER");
  const familyKeys = leader ? (FAMILY_REVIEW_KEYS[leader] ?? []) : [];
  const keys = Array.from(new Set([...familyKeys, ...REVIEW_PRIORITY, ...parserKeys]))
    .filter((key) => view.featureSources[key] === "PARSER");
  const [values, setValues] = useState<Partial<Record<DiagnosticFeatureKey, boolean | null>>>(() =>
    Object.fromEntries(keys.map((key) => [key, view.structuredProblem.features[key]])),
  );
  return (
    <section className="card card-accent-indigo p-5 sm:p-6">
      <p className="eyebrow">Kısa doğrulama</p>
      <h2 className="mt-1.5 text-[1.0625rem] font-semibold tracking-[-0.012em]">Sizi doğru anladım mı?</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
        Metninizden çıkardığımız kritik bilgileri kontrol edin. Yanlış bir çıkarımı şimdi
        düzeltmeniz, sonraki soruların doğru problem ailesinde kalmasını sağlar.
      </p>
      {keys.length ? (
        <ul className="mt-5 border-t border-[var(--rule-strong)]">
          {keys.map((key, index) => (
            <li
              key={key}
              className="flex flex-col justify-between gap-3 border-b border-[var(--rule)] py-3.5 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 gap-3">
                <span className="mt-px font-mono text-[11px] text-[var(--muted-2)]">{pad2(index + 1)}</span>
                <div className="min-w-0">
                  <strong className="text-[13px] font-semibold">{FEATURE_META[key].label}</strong>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
                    Metinden çıkarıldı; henüz sizin tarafınızdan doğrulanmadı.
                  </p>
                </div>
              </div>
              <TernaryChoice
                value={values[key]}
                onChange={(next) => setValues((current) => ({ ...current, [key]: next }))}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle-panel mt-4 text-[13px] text-[var(--muted)]">
          Metinden kesin bir kritik çıkarım yapılmadı. Sorularla birlikte netleştireceğiz.
        </p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => onConfirm(values)}
        className="btn btn-primary btn-lg mt-5"
      >
        {loading ? "Kaydediliyor…" : "Onayla ve sorulara geç"}
      </button>
    </section>
  );
}

function FeatureReviewPanel({
  view,
  loading,
  onConfirm,
  includeUnknownFamily = false,
}: {
  view: DiagnosisView;
  loading: boolean;
  onConfirm: (corrections: Partial<Record<DiagnosticFeatureKey, boolean | null>>) => void;
  includeUnknownFamily?: boolean;
}) {
  const leader = view.result?.methodology ?? view.ranking[0]?.methodology;
  const knownKeys = (Object.keys(FEATURE_META) as DiagnosticFeatureKey[])
    .filter((key) => view.structuredProblem.features[key] !== null);
  const familyKeys = includeUnknownFamily && leader ? (FAMILY_REVIEW_KEYS[leader] ?? []) : [];
  const keys = Array.from(new Set([...familyKeys, ...knownKeys]));
  const [values, setValues] = useState<Partial<Record<DiagnosticFeatureKey, boolean | null>>>(() =>
    Object.fromEntries(keys.map((key) => [key, view.structuredProblem.features[key]])),
  );
  if (keys.length === 0) return null;
  return (
    <details className="card p-5">
      <summary className="text-[13px] font-semibold">Cevapları ve çıkarımları gözden geçir</summary>
      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[var(--muted)]">
        Birden fazla cevabı aynı anda düzeltebilirsiniz. “Emin değilim” seçimi yanlış kesinlik
        üretmek yerine ilgili bilgiyi yeniden doğrulamaya açar; kayıt sonrası teşhis baştan
        hesaplanır.
      </p>
      <ul className="mt-4 border-t border-[var(--rule-strong)]">
        {keys.map((key, index) => {
          const source = view.featureSources[key];
          return (
            <li
              key={key}
              className="flex flex-col justify-between gap-3 border-b border-[var(--rule)] py-3.5 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 gap-3">
                <span className="mt-px font-mono text-[11px] text-[var(--muted-2)]">{pad2(index + 1)}</span>
                <div className="min-w-0">
                  <strong className="text-[13px] font-semibold">{FEATURE_META[key].label}</strong>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted-2)]">
                    {source === "USER_CONFIRMED"
                      ? "Sizin tarafınızdan doğrulandı."
                      : source === "PARSER"
                        ? "İlk problem metninden çıkarıldı; değiştirirseniz kullanıcı doğrulaması sayılır."
                        : "Bu yöntem ailesini ayırmak için yararlı bir kontrol noktası."}
                  </p>
                </div>
              </div>
              <TernaryChoice
                value={values[key]}
                onChange={(next) => setValues((current) => ({ ...current, [key]: next }))}
              />
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={loading}
        onClick={() => onConfirm(values)}
        className="btn btn-primary mt-4"
      >
        {loading ? "Yeniden hesaplanıyor…" : "Düzeltmeleri kaydet ve yeniden değerlendir"}
      </button>
    </details>
  );
}

function InformationTasks({ view, loading, onView }: { view: DiagnosisView; loading: boolean; onView: (v: DiagnosisView) => void }) {
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function mutate(body: Record<string, unknown>) {
    setBusy(String(body.taskId)); setErr(null);
    try {
      const res = await fetch(`/api/diagnosis/${view.conversationId}/tasks`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Görev güncellenemedi."); onView(normalizeDiagnosisView(data));
    } catch(e) { setErr(e instanceof Error ? e.message : "Görev güncellenemedi. Bağlantınızı kontrol edip yeniden deneyin."); } finally { setBusy(null); }
  }
  return (
    <section className="card card-accent-indigo p-5 sm:p-6">
      <p className="eyebrow">Bilgi görevleri</p>
      <h2 className="mt-1.5 text-[1.0625rem] font-semibold tracking-[-0.012em]">
        “Bilmiyorum” burada kaybolmaz
      </h2>
      <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[var(--muted)]">
        Eksik bilgiyi sahada doğrula; cevap geldiğinde teşhis otomatik yeniden hesaplanır.
      </p>

      <ul className="mt-4 border-t border-[var(--rule-strong)]">
        {view.informationTasks.map((t, index) => (
          <li
            key={t.id}
            className={`border-b border-[var(--rule)] py-3.5 ${t.status ==="RESOLVED" ? "border-l-2 border-l-[var(--st-ok)] pl-3" : "pl-3"}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex min-w-0 items-baseline gap-2.5 text-[13px] font-medium">
                <span className="shrink-0 font-mono text-[11px] font-normal text-[var(--muted-2)]">
                  {pad2(index + 1)}
                </span>
                {t.question}
              </p>
              <span className={`tag shrink-0 ${t.status ==="OPEN" ? "state-warn" : "state-ok"}`}>
                {t.status === "OPEN" ? "Açık" : "Çözüldü"}
              </span>
            </div>

            {t.status === "OPEN" ? (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    className="field"
                    defaultValue={t.owner ?? ""}
                    placeholder="Sorumlu"
                    onBlur={(e) =>
                      mutate({
                        operation: "UPDATE",
                        taskId: t.id,
                        owner: e.target.value || null,
                        dueDate: t.dueDate,
                      })
                    }
                  />
                  <input
                    className="field"
                    type="date"
                    defaultValue={t.dueDate ?? ""}
                    onChange={(e) =>
                      mutate({
                        operation: "UPDATE",
                        taskId: t.id,
                        owner: t.owner,
                        dueDate: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="field"
                    value={answers[t.id] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [t.id]: e.target.value })}
                    placeholder="Sahadan gelen kesin cevap…"
                  />
                  <button
                    disabled={loading || busy === t.id || !(answers[t.id] ?? "").trim()}
                    onClick={() => mutate({ operation: "RESOLVE", taskId: t.id, answer: answers[t.id] })}
                    className="btn btn-primary shrink-0"
                  >
                    Çöz ve teşhisi yenile
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[12px] text-[var(--st-ok)]">
                Yanıt: {t.answer}
                <span className="mx-1.5 text-[var(--muted-2)]">/</span>
                Sonuç: {t.resultingMethodology}
              </p>
            )}
          </li>
        ))}
      </ul>

      {view.recommendationChanges.length > 0 && (
        <div className="alert alert-warn mt-4">
          <strong className="text-[13px]">Yeni kanıt metodoloji önerisini değiştirdi</strong>
          {view.recommendationChanges.map((c, i) => (
            <p key={i} className="mt-1 font-mono text-[12px]">
              {c.from} yerine {c.to}
            </p>
          ))}
        </div>
      )}
      {err && <p className="mt-2 text-[12px] text-[var(--st-risk)]">{err}</p>}
    </section>
  );
}

/* ---------- Intake ---------- */
function Intake({
  text,
  setText,
  onStart,
  loading,
}: {
  text: string;
  setText: (s: string) => void;
  onStart: () => void;
  loading: boolean;
}) {
  return (
    <div className="card p-5 sm:p-6">
      <SectionHead title="Problem tanımı" note="Adım 01" />
      <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
        Problemi kendi cümlelerinle anlat. Sistem açıklayıcı sorular sorup en uygun
        metodolojiyi gerekçesiyle önerecek.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Örn: Müşteriden şikayet geldi, üründe çatlak var ve kök neden bilinmiyor."
        className="field mt-3 resize-y"
      />
      {/* Vaka kütüphanesi: boş bir metin kutusuyla karşılaşan ziyaretçi ne
          yazacağını düşünmek zorunda kalmasın. Vakalar landing sayfasındaki
          vitrinle AYNI kaynaktan gelir; her biri farklı bir problem karakteri
          ve farklı bir yöntem ayrımı gösterir. Yalnız metni doldururlar —
          teşhis yine baştan çalışır. */}
      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--rule-strong)] pb-2">
          <p className="eyebrow">Örnek vakayı yükle</p>
          <span className="font-mono text-[11px] text-[var(--muted-2)]">
            {pad2(SHOWCASE_CASES.length)} vaka
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted-2)]">
          Yalnızca metni doldurur; teşhis yine sizin yanıtlarınızla yürür.
        </p>
        <ul className="mt-2">
          {SHOWCASE_CASES.map((showcase, index) => (
            <li key={showcase.id} className="border-b border-[var(--rule)]">
              <button
                onClick={() => setText(showcase.problemText)}
                className="flex w-full items-baseline gap-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunk)]"
              >
                <span className="shrink-0 font-mono text-[11px] text-[var(--muted-2)]">
                  {pad2(index + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[var(--ink)]">
                    {showcase.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] leading-relaxed text-[var(--muted)]">
                    {showcase.problemText}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Eşik domainden gelir; istemci, misafir rotası ve üye rotası aynı
          kuralı okur. Düğme kapalıysa nedeni yazılı — sessizce kapalı bir
          düğme kullanıcıya ne yapması gerektiğini söylemez. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          onClick={onStart}
          disabled={loading || !problemTextAcceptable(text)}
          className="btn btn-primary btn-lg"
        >
          {loading ? "Değerlendiriliyor…" : "Teşhise başla"}
        </button>
        {!loading && text.trim().length > 0 && !problemTextAcceptable(text) && (
          <span className="text-[11px] text-[var(--st-warn)]">
            {text.trim().length < PROBLEM_TEXT_MIN
              ? `Biraz daha ayrıntı gerekiyor — ${PROBLEM_TEXT_MIN - text.trim().length} karakter daha.`
              : PROBLEM_TEXT_TOO_LONG}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Asking ---------- */
function AskingView({
  view,
  loading,
  onAnswer,
  onReview,
  freeAnswer,
  setFreeAnswer,
}: {
  view: DiagnosisView;
  loading: boolean;
  onAnswer: (t: string) => void;
  onReview: (corrections: Partial<Record<DiagnosticFeatureKey, boolean | null>>) => void;
  freeAnswer: string;
  setFreeAnswer: (s: string) => void;
}) {
  const qas = view.messages.filter((m) => m.kind === "QUESTION" || m.kind === "ANSWER");
  const priorQas = qas.slice(0, -1);
  const answers = view.messages.filter((m) => m.kind === "ANSWER").map((m) => m.content.toLocaleLowerCase("tr-TR"));
  let unknownStreak = 0;
  for (let i = answers.length - 1; i >= 0 && /bilmiyorum|emin değil|belirsiz/.test(answers[i]); i--) unknownStreak++;
  const maxEntropy = Math.log2(view.ranking.length || 2);
  const clarity = Math.max(0, Math.min(1, 1 - view.entropy / maxEntropy));
  const help: Partial<Record<string, string>> = {
    rootCauseKnown: "Güçlü bir tahmin yeterli değildir; ölçüm veya kontrollü deney yoksa Hayır seçin.",
    hasMeasurementData: "Yalnız dosyanın varlığını değil, problemin büyüklüğünü ve zamanını açıklayan veriyi düşünün.",
    safetyOrRegulatory: "İnsan/ürün güvenliği, zorunlu uygunluk, bildirim veya geri çağırma risklerinden herhangi birini değerlendirin.",
    intermittent: "Evet = düzensiz aralıklarla ortaya çıkıp kayboluyor. Hayır = sürekli veya istikrarlı görülüyor.",
    humanErrorProne: "Kişiyi suçlamayın; sistemin yanlış işlemin ilerlemesine izin verip vermediğini değerlendirin.",
    externalNonconformance: "Teslimat gecikmesini değil, müşteriye ulaşmış doğrulanmış kalite uygunsuzluğunu değerlendirin.",
    containmentNeeded: "Ayıklama, stok blokajı, sevkiyat durdurma veya geçici koruma ihtiyacını değerlendirin.",
    measurementReliable: "Kalibrasyon tek başına yeterli olmayabilir; tekrar edilebilirlik ve operatörler arası uyumu da düşünün.",
    processStable: "Kararlılık, yalnızca sonuçların spesifikasyon içinde olması değildir; zaman içindeki özel neden sinyallerini değerlendirin.",
    comparisonAvailable: "Problemli ve problemsiz koşulları aynı ölçütlerle karşılaştırabilmeniz gerekir.",
    chronicEquipmentLoss: "Tek seferlik arıza için Hayır; tekrar eden duruş, hız veya kullanılabilirlik kaybı için Evet seçin.",
    failureModeKnown: "Kök nedenin bilinmesi gerekmez; önlenecek yanlış işlem veya sonuç açıkça tanımlı olmalıdır.",
    standardWorkEstablished: "Yalnız doküman bulunmasına değil, bütün vardiyalarda aynı yöntemin gerçekten uygulanmasına göre cevaplayın.",
    basicConditionsStable: "İnsan yetkinliği, ekipman temel koşulları, malzeme ve yöntemin asgari gereksinimlerini birlikte değerlendirin.",
  };

  const clarityPct = Math.round(clarity * 100);
  const phase =
    clarity >= 0.72
      ? "Öneri netleşiyor"
      : clarity >= 0.4
        ? "Yaklaşımlar karşılaştırılıyor"
        : "Problem tipi değerlendiriliyor";

  return (
    <div className="flex flex-col gap-4">
      {/* Ölçüm şeridi — nerede olduğunuzu sayıyla gösterir: kaç soru soruldu,
          kaç cevap bilindi, kaç bağımsız işaret aynı yönü gösteriyor. */}
      <div className="card flex flex-wrap items-end gap-x-7 gap-y-3 px-4 py-3.5">
        {[
          { label: "Soru", value: view.questionsAsked },
          { label: "Bilinen cevap", value: view.evidence.knownAnswers },
          { label: "Destekleyen işaret", value: view.evidence.supportingSignals },
        ].map((readout) => (
          <div key={readout.label}>
            <p className="eyebrow">{readout.label}</p>
            <p className="mt-1 font-mono text-[15px] font-semibold leading-none">{pad2(readout.value)}</p>
          </div>
        ))}
        <div className="min-w-[11rem] flex-1">
          <div className="meter-label">
            <span className="eyebrow">Yöntem ayrışması</span>
            <span className="font-mono text-[11px] text-[var(--muted)]">%{clarityPct}</span>
          </div>
          <div className="meter mt-1.5">
            <div className="meter-fill" style={{ width: `${Math.max(2, clarityPct)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-[var(--muted-2)]">{phase}</p>
        </div>
      </div>

      {priorQas.length > 0 && (
        <div className="card p-4">
          <p className="eyebrow">Önceki sorular</p>
          <ol className="mt-2.5 border-t border-[var(--rule)]">
            {priorQas.map((m, i) => (
              <li
                key={i}
                className="flex gap-3 border-b border-[var(--rule-faint)] py-1.5 text-[12px] leading-relaxed last:border-b-0"
              >
                <span className="mt-px shrink-0 font-mono text-[10px] font-semibold tracking-[0.08em] text-[var(--muted-2)]">
                  {m.role === "ASSISTANT" ? "S" : "C"}
                </span>
                <span className={m.role === "ASSISTANT" ? "text-[var(--muted)]" : "font-medium text-[var(--ink)]"}>
                  {m.content}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {view.nextQuestion && (
          <div className="card card-accent-indigo p-5 sm:p-6 lg:sticky lg:top-[4.5rem]">
            {view.nextQuestion.context && (
              <p className="mb-4 inline-flex items-center gap-2 border border-[var(--rule)] bg-[var(--surface-sunk)] px-2.5 py-1">
                <span className="eyebrow">Bağlam</span>
                <span className="text-[11px] text-[var(--muted)]">{view.nextQuestion.context} prosesi</span>
              </p>
            )}
            <p className="eyebrow">Soru {pad2(view.questionsAsked)}</p>
            <p className="mt-2 text-[1.0625rem] font-semibold leading-snug tracking-[-0.012em] sm:text-[1.125rem]">
              {view.nextQuestion.text}
            </p>
            <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--muted)]">
              {help[view.nextQuestion.featureKey] ??
                "Sahada doğrulanmış bilgiye göre yanıtlayın; emin değilseniz tahmin yürütmeyin."}
            </p>

            {/* Soru rastgele değil: hangi iki hipotezi ayırdığı deterministik
                olarak hesaplanır ve burada açıkça söylenir. Kullanıcı neyi
                yanıtladığını değil, NEDEN yanıtladığını da görür. */}
            {view.nextQuestion.separates && (
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-l-2 border-[var(--rule-strong)] pl-3 text-[11px] leading-relaxed text-[var(--muted-2)]">
                <span className="eyebrow">Bu soru şunu ayırıyor</span>
                <span className="text-[var(--ink-soft)]">
                  Evet ise {label(view.nextQuestion.separates.ifYes)}, hayır ise{" "}
                  {label(view.nextQuestion.separates.ifNo)} öne çıkar.
                </span>
              </p>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button onClick={() => onAnswer("evet")} disabled={loading} className="btn btn-answer">
                Evet
              </button>
              <button onClick={() => onAnswer("hayır")} disabled={loading} className="btn btn-answer">
                Hayır
              </button>
              <button
                onClick={() => onAnswer("bilmiyorum")}
                disabled={loading}
                className="btn btn-unknown"
                title="Eksik bilgi saha görevine dönüşür"
              >
                Bilmiyorum
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted-2)]">
              “Bilmiyorum” seçeneği tahmin istemez; doğrulama görevi oluşturur.
            </p>

            {unknownStreak >= 3 && (
              <div className="alert mt-4 border-[var(--st-warn-rule)] border-l-[var(--st-warn)] bg-[var(--st-warn-bg)]">
                <strong className="text-[13px] text-[var(--st-warn)]">
                  Arka arkaya {unknownStreak} saha bilgisi eksik
                </strong>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--st-warn)]">
                  İsterseniz mevcut kanıtlarla lider metodolojiyi görün; eksik bilgiler görev olarak
                  açık kalır.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onAnswer("__SHOW_CURRENT_RESULT__")}
                  className="btn btn-secondary mt-3"
                >
                  Mevcut bilgilerle sonucu göster
                </button>
              </div>
            )}

            <div className="mt-4 flex gap-2 border-t border-[var(--rule)] pt-4">
              <input
                value={freeAnswer}
                onChange={(e) => setFreeAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && freeAnswer.trim() && onAnswer(freeAnswer)}
                placeholder="veya kendi cümlenle yaz…"
                className="field"
              />
              <button
                onClick={() => freeAnswer.trim() && onAnswer(freeAnswer)}
                disabled={loading || !freeAnswer.trim()}
                className="btn btn-primary shrink-0"
              >
                Gönder
              </button>
            </div>
          </div>
        )}

        <aside className="border-l-2 border-[var(--rule-strong)] pl-4">
          <p className="eyebrow">Değerlendirme neden sürüyor?</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
            Sistem tek bir cevaba göre yöntem seçmez. Farklı açılardan en az birkaç tutarlı işaret
            arar; çelişkili veya bilinmeyen bilgiler varsa doğrulayıcı soru sorar.
          </p>
          <div className="mt-3 border-t border-[var(--rule)] pt-3">
            <p className="eyebrow">Şu an</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink)]">
              {view.evidence.supportingSignals
                ? `${view.evidence.supportingSignals} bağımsız işaret aynı yaklaşımı destekliyor.`
                : "Henüz baskın bir yaklaşım oluşmadı."}
            </p>
          </div>
        </aside>
      </div>
      <FeatureReviewPanel key={`${view.status}-${view.questionsAsked}`} view={view} loading={loading} onConfirm={onReview} />
    </div>
  );
}

/* ---------- Result ---------- */
function ResultView({
  view,
  router,
  onReset,
  onReview,
  authenticated,
}: {
  view: DiagnosisView;
  router: ReturnType<typeof useRouter>;
  onReset: () => void;
  onReview: (corrections: Partial<Record<DiagnosticFeatureKey, boolean | null>>) => void;
  authenticated: boolean;
}) {
  const result = view.result!;
  const meta = METHODOLOGY_META[result.methodology];
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState<"report" | "workspace" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function generateReport() {
    setBusy("report");
    setActionError(null);
    try {
      if (!authenticated) {
        const reasons = result.trace.steps.map((step) => `- ${step.because}`).join("\n");
        setReport(`# Teşhis özeti\n\n## Problem\n${view.structuredProblem.problemDescription ?? "Problem tanımı"}\n\n## Önerilen yaklaşım\n**${meta.name}**\n\n${meta.description}\n\n## Kararı destekleyen bulgular\n${reasons || "- Mevcut yanıtların kural tabanıyla uyumu değerlendirildi."}\n\n> Bu özet başarı olasılığı değildir; mevcut bilgilerle üretilmiş karar desteğidir.`);
        return;
      }
      const res = await fetch(`/api/diagnosis/${view.conversationId}/report`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rapor üretilemedi.");
      setReport(data.report);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "İşlem tamamlanamadı. Yeniden deneyin.");
    } finally {
      setBusy(null);
    }
  }

  async function openWorkspace() {
    setBusy("workspace");
    setActionError(null);
    try {
      if (!authenticated) {
        const workspace = createGuestWorkspace({
          conversationId: view.conversationId,
          methodology: result.methodology,
          problemDescription: view.structuredProblem.problemDescription ?? "Problem",
          recommendedMethodology: result.methodology,
          diagnosisRationale: result.trace.steps.map((step) => step.because).join(" "),
        });
        await saveGuestWorkspace(workspace);
        router.push(`/workspace/${workspace.id}`);
        return;
      }
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: view.conversationId,
          methodology: result.methodology,
          problemDescription: view.structuredProblem.problemDescription ?? "Problem",
          recommendedMethodology: result.methodology,
          diagnosisRationale: result.trace.steps.map((step) => step.because).join(" "),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Açılamadı.");
      router.push(`/workspace/${data.id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "İşlem tamamlanamadı. Yeniden deneyin.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sonuç ekranı, her vakada AYNI mantıksal sırayı izler: problem özeti →
          problem karakteri → birincil yöntem ve destek düzeyi → destekleyen
          kanıtlar → çelişen/çakışan sinyaller → yakın alternatifler ve neden
          onlar değil → eksik bilgi → sonraki adım. Kullanıcı ilk bakışta ana
          sonucu görür, detaya sonra iner. */}
      <ProblemSummaryPanel view={view} />

      {/* Sonuç künyesi. Gradyanlı "hero" yerine enstrüman okuması: yöntem kodu
          mono ve büyük, kanıt düzeyi sağda ayrı bir gösterge, gerekçeler
          numaralı hücrelerde. Renk yalnız kanıt düzeyinde ve uyarılarda. */}
      <div className="card card-accent-emerald">
        <div className="p-5 sm:p-6">
          <p className="eyebrow">
            {view.evidence.status === "CONFIRMED"
              ? "Kanıtlarla doğrulanan metodoloji"
              : view.evidence.status === "INCONCLUSIVE"
                ? "Yöntemler henüz kesin olarak ayrılamadı"
                : "Mevcut kanıtlara göre ön aday"}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h2 className="font-mono text-[2rem] font-semibold leading-none tracking-[-0.01em]">
                {meta.shortName}
              </h2>
              <p className="mt-2.5 text-[13px] text-[var(--ink-soft)]">{meta.name}</p>
              <p className="mt-1 text-[11px] text-[var(--muted-2)]">
                Rol: {METHODOLOGY_ROLES[result.methodology].label}
              </p>
            </div>
            <div className="shrink-0 border-l-2 border-[var(--st-ok)] pl-3">
              <p className="eyebrow">Mevcut kanıt düzeyi</p>
              <p className="mt-1 text-[15px] font-semibold text-[var(--st-ok)]">{evidenceLevel(view)}</p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            {meta.description}
          </p>
        </div>

        <div className="grid gap-px border-y border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
          {result.trace.steps.slice(0, 3).map((step, index) => (
            <div key={index} className="bg-[var(--surface)] p-4">
              <p className="eyebrow">{pad2(index + 1)} · Destek</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink-soft)]">{step.because}</p>
            </div>
          ))}
        </div>

        <dl className="flex flex-wrap gap-x-7 gap-y-2 px-5 py-3.5 sm:px-6">
          {[
            { label: "Bağımsız destek", value: String(view.evidence.supportingSignals) },
            { label: "Bilinen cevap", value: String(view.evidence.knownAnswers) },
            { label: "Lider farkı", value: `${view.evidence.scoreMargin} puan` },
            ...(view.evidence.conflicts.length > 0
              ? [{ label: "Çelişki", value: String(view.evidence.conflicts.length) }]
              : []),
          ].map((item) => (
            <div key={item.label}>
              <dt className="eyebrow">{item.label}</dt>
              <dd className="mt-0.5 font-mono text-[13px] font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-[var(--rule)] px-5 py-3 sm:px-6">
          <p className="text-[11px] leading-relaxed text-[var(--muted-2)]">
            <strong className="font-semibold text-[var(--muted)]">Kalibrasyon notu:</strong> Bu
            seviye istatistiksel başarı olasılığı değildir; yanıtların kural tabanıyla göreli
            uyumunu gösterir. Gerçek saha sonuçlarıyla henüz kalibre edilmemiştir.
          </p>
        </div>

        {view.evidence.status === "INCONCLUSIVE" && (
          <div className="alert mx-5 mb-4 alert-warn sm:mx-6">
            <strong className="text-[13px]">Bu kesin bir metodoloji seçimi değildir.</strong>
            <p className="mt-1 text-[12px] leading-relaxed">
              Sorulabilecek ayırıcı sorular tükendi veya soru sınırına ulaşıldı. Aşağıdaki ön adayı
              yalnız çalışma hipotezi olarak kullanın; cevapları gözden geçirip eksik saha
              kanıtlarını tamamlayın.
            </p>
          </div>
        )}
        {view.evidence.conflicts.length > 0 && (
          <div className="alert mx-5 mb-4 alert-warn sm:mx-6">
            <strong className="text-[13px]">Doğrulanması gereken çelişkiler</strong>
            <ul className="mt-1 list-disc pl-4 text-[12px] leading-relaxed">
              {view.evidence.conflicts.map((conflict) => (
                <li key={conflict}>{conflict}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-[var(--rule)] p-4 sm:px-6">
          <button onClick={generateReport} disabled={busy !== null} className="btn btn-secondary">
            {busy === "report" ? "Özet hazırlanıyor…" : "Teşhis özetini oluştur"}
          </button>
          <button onClick={openWorkspace} disabled={busy !== null} className="btn btn-primary">
            {busy === "workspace"
              ? "Açılıyor…"
              : view.evidence.status === "INCONCLUSIVE"
                ? "Ön adayla çalışma alanını aç"
                : "Çalışma alanını aç"}
          </button>
        </div>
        {actionError && (
          <p className="px-4 pb-4 text-[13px] text-[var(--st-risk)] sm:px-6">{actionError}</p>
        )}
      </div>

      {report && (
        <div className="card p-5 sm:p-6">
          <SectionHead title="Teşhis özeti" note="Rapor" />
          <Markdown className="mt-4">{report}</Markdown>
        </div>
      )}

      <ContestedSignalsPanel view={view} />

      <ContrastiveTracePanel view={view} />

      {/* "Neden bu yöntem?" kadar "neden diğerleri değil?" de birincil bilgidir;
          bu yüzden katlanmış bir panelde saklanmaz. */}
      <section className="card p-5 sm:p-6">
        <RivalAnalysisPanel view={view} />
      </section>

      <MissingEvidencePanel view={view} />

      {/* Karar zinciri: nokta-zaman çizelgesi yerine defter. Her satırın katkısı
          (+delta) sağda mono ve hizalı — toplamın nasıl oluştuğu okunabilir. */}
      <details className="card p-5">
        <summary className="text-[13px] font-semibold">Ayrıntılı karar zincirini göster</summary>
        <div className="mt-4">
          <p className="eyebrow">Karar zinciri</p>
          <ol className="mt-2.5 border-t border-[var(--rule-strong)]">
            {result.trace.steps.map((s, i) => (
              <li key={i} className="flex items-baseline gap-3 border-b border-[var(--rule)] py-2.5">
                <span className="shrink-0 font-mono text-[11px] text-[var(--muted-2)]">{pad2(i + 1)}</span>
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">{s.because}</p>
                <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums">+{s.delta}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-l-2 border-[var(--st-ok)] pl-3">
            <span className="text-[13px] font-semibold">Bu nedenle: {label(result.methodology)}</span>
            <span className="text-[12px] text-[var(--st-ok)]">{supportLabel(result.confidence)} destek</span>
          </p>
        </div>
      </details>

      <details className="card p-5">
        <summary className="text-[13px] font-semibold">Tamamlayıcı yaklaşımlar ve sonraki adımlar</summary>
        <div className="mt-4">
          <SequencePanel methodology={result.methodology} ranking={view.ranking} />
        </div>
      </details>

      <StabilizationGatePanel view={view} />

      <div className="card card-accent-indigo p-4 sm:px-5">
        <strong className="text-[13px]">Teknik öneri ile kurumsal zorunluluk aynı şey değildir.</strong>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-[var(--muted)]">
          Çalışma alanında müşteri/OEM formatı, regülasyon, mevcut CAPA kaydı, ekip yetkinliği,
          zaman ve kaynak baskısını ayrıca kaydedin. Örneğin teknik analiz RCA iken müşteri yanıtı
          8D formatında yürütülebilir.
        </p>
      </div>

      <MethodPlanPanel view={view} />

      <details className="card p-5">
        <summary className="text-[13px] font-semibold">Kararı ne değiştirirdi?</summary>
        <div className="mt-4">
          <p className="eyebrow">Karşı-olgusal teşhis</p>
          <p className="mt-1.5 text-[12px] text-[var(--muted-2)]">
            Her senaryo aynı deterministik motorla yeniden hesaplandı; LLM yorumu değildir.
          </p>
          {view.counterfactuals.length > 0 ? (
            <ul className="mt-3 border-t border-[var(--rule-strong)]">
              {view.counterfactuals.map((c) => (
                <li
                  key={`${c.featureKey}-${c.assumedValue}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule)] py-2.5"
                >
                  <span className="min-w-0 text-[13px] leading-relaxed">
                    <span className="text-[var(--muted-2)]">Eğer</span> {c.explanation}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted)]">
                    {label(c.from)} yerine {label(c.to)} · %{pct(c.confidence)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 border-l-2 border-[var(--st-ok)] bg-[var(--st-ok-bg)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--st-ok)]">
              Bu karar sağlam: tek bir cevabın değişmesi önerilen yöntemi değiştirmiyor — öneriyi
              birden fazla koşul birlikte destekliyor.
            </p>
          )}
        </div>
      </details>

      <details className="card p-5">
        <summary className="text-[13px] font-semibold">Gelişmiş yöntem karşılaştırmasını göster</summary>
        <div className="mt-4">
          <RankingBars
            ranking={view.ranking}
            limit={6}
            caption="Bu değer, metodolojinin başarılı olma olasılığını göstermez. Mevcut cevapların karar kurallarında ilgili metodolojiyi ne ölçüde desteklediğini gösteren göreli bir skordur."
          />
        </div>
      </details>

      <FeatureReviewPanel key={`${view.status}-${result.methodology}`} view={view} loading={busy !== null} onConfirm={onReview} includeUnknownFamily />

      <button onClick={onReset} className="btn btn-primary btn-lg self-start">
        Yeni teşhis başlat
      </button>
    </div>
  );
}

function RivalAnalysisPanel({ view }: { view: DiagnosisView }) {
  const rivals = view.rivalAnalysis ?? [];
  if (rivals.length === 0) return null;
  return (
    <section>
      <p className="eyebrow">Neden diğer yöntemler değil?</p>
      <h3 className="mt-1.5 text-[13px] font-semibold">Elenen yöntemlerin gerekçesi</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-2)]">
        Gerekçeler kararı veren kuralların kendi notlarıdır; sonradan yazılmış bir yorum ya da LLM
        çıktısı değildir.
      </p>
      <ul className="mt-3 border-t border-[var(--rule-strong)]">
        {rivals.map((r) => (
          <li key={r.methodology} className="border-b border-[var(--rule)] py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="code-tag">{label(r.methodology)}</span>
              <span
                className={`text-[11px] ${r.kind ==="SUPPRESSED" ? "text-[var(--st-risk)]" : "text-[var(--st-warn)]"}`}
              >
                {r.kind === "SUPPRESSED"
                  ? "Mevcut kanıta göre birincil değil"
                  : `Yakın alternatif · lider ${r.scoreGapToLeader} puan önde`}
              </span>
            </div>
            {r.question && (
              <p className="mt-1.5 text-[11px] italic text-[var(--muted-2)]">
                Sorduğu soru: “{r.question}”
              </p>
            )}
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">{r.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StabilizationGatePanel({ view }: { view: DiagnosisView }) {
  const gate = view.stabilization;
  const tone =
    gate.status === "READY" ? "alert-ok" : gate.status === "STABILIZE_FIRST" ? "alert-warn" : "alert-idle";
  return (
    <section className={`alert ${tone} px-4 py-3.5 sm:px-5`}>
      <p className="eyebrow">Stabilizasyon kapısı</p>
      <h3 className="mt-1.5 text-[13px] font-semibold">
        {gate.status === "READY"
          ? "İyileştirme için baz hat hazır"
          : gate.status === "STABILIZE_FIRST"
            ? "Önce SDCA ile stabilize et"
            : "Stabilizasyon hazırlığı henüz doğrulanmadı"}
      </h3>
      {gate.blockers.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-[12px] leading-relaxed">
          {gate.blockers.map((blocker) => (
            <li key={blocker.featureKey}>{blocker.reason}</li>
          ))}
        </ul>
      )}
      {gate.unknowns.length > 0 && (
        <p className="mt-2 text-[12px]">
          Doğrulanması gereken {gate.unknowns.length} hazırlık koşulu var.
        </p>
      )}
    </section>
  );
}

function MethodPlanPanel({ view }: { view: DiagnosisView }) {
  const plan = view.methodPlan;
  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Uygulama mimarisi</p>
      <h3 className="mt-1.5 text-[13px] font-semibold">Tek yöntem değil, görevine göre yöntem bileşimi</h3>
      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--muted-2)]">
        Ana yöntem çalışmayı taşır; destekleyici yöntemler yalnız pozitif kanıt bulunan teknik
        boşlukları tamamlar.
      </p>
      <ul className="mt-4 border-t border-[var(--rule-strong)]">
        {[plan.primary, ...plan.supporting].map((entry, index) => (
          <li
            key={`${entry.layer}-${entry.methodology}`}
            className={`border-b border-[var(--rule)] py-3 ${index === 0 ? "border-l-2 border-l-[var(--st-ok)] pl-3" : "pl-3"}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-2.5">
                <span className="code-tag">{METHODOLOGY_META[entry.methodology].shortName}</span>
                <span className="eyebrow">{entry.layerLabel}</span>
              </div>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted)]">
                {entry.roleLabel} · {entry.score > 0 ? "+" : ""}
                {entry.score}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{entry.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Dizi / tamamlayıcı yaklaşımlar ---------- */
function SequencePanel({
  methodology,
  ranking,
}: {
  methodology: Methodology;
  ranking: DiagnosisView["ranking"];
}) {
  const alts = closeAlternatives(ranking);
  const next = nextMethodologies(methodology);
  if (alts.length === 0 && next.length === 0) return null;

  return (
    <div>
      <p className="eyebrow">Tamamlayıcı yaklaşımlar ve sonraki adımlar</p>
      {alts.length > 0 && (
        <div className="mt-3">
          <h4 className="text-[13px] font-semibold">Yakın alternatifler</h4>
          <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
            Asıl mesele farklıysa şunları da değerlendir.
          </p>
          <ul className="mt-2 border-t border-[var(--rule)]">
            {alts.map((a) => {
              const m = METHODOLOGY_META[a.methodology];
              return (
                <li
                  key={a.methodology}
                  className="flex items-baseline gap-2.5 border-b border-[var(--rule-faint)] py-2 last:border-b-0"
                >
                  <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-2)]">
                    %{pct(a.confidence)}
                  </span>
                  <span className="min-w-0 text-[13px] leading-relaxed">
                    <span className="font-semibold">{m.shortName}</span>
                    <span className="text-[var(--muted)]"> — {m.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {next.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[13px] font-semibold">Sonraki / tamamlayıcı adımlar</h4>
          <ul className="mt-2 border-t border-[var(--rule)]">
            {next.map((n) => (
              <li
                key={n.code}
                className="flex items-baseline gap-2.5 border-b border-[var(--rule-faint)] py-2 last:border-b-0"
              >
                <span className="code-tag shrink-0">{METHODOLOGY_META[n.code].shortName}</span>
                <span className="min-w-0 text-[13px] leading-relaxed text-[var(--muted)]">{n.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- Ranking bars ---------- */
function RankingBars({
  ranking,
  limit,
  caption,
}: {
  ranking: DiagnosisView["ranking"];
  limit: number;
  caption?: string;
}) {
  const shown = ranking.slice(0, limit).filter((r) => r.confidence >= 0.005 || ranking.indexOf(r) < 3);
  return (
    // Kapsayıcı zaten bir panel; burada ikinci bir çerçeve çizilmez.
    // Lider dolu mürekkep, diğerleri aynı mürekkebin soluk hâli — sıralama
    // renk kodlamasıyla değil yoğunlukla okunur.
    <div>
      <p className="eyebrow">Karar desteği skoru</p>
      <ol className="mt-2.5 border-t border-[var(--rule)]">
        {shown.map((r, i) => (
          <li
            key={r.methodology}
            className="flex items-center gap-3 border-b border-[var(--rule-faint)] py-2 last:border-b-0"
          >
            <span className="w-20 shrink-0 truncate font-mono text-[11px] font-medium">
              {label(r.methodology)}
            </span>
            <div className="meter flex-1">
              <div
                className={`meter-fill ${i === 0 ? "" : "opacity-30"}`}
                style={{ width: `${Math.max(2, pct(r.confidence))}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">
              %{pct(r.confidence)}
            </span>
          </li>
        ))}
      </ol>
      {caption && <p className="mt-2.5 text-[11px] text-[var(--muted-2)]">{caption}</p>}
    </div>
  );
}
