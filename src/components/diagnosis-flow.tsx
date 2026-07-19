"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiagnosisView } from "@/application/diagnosis-service";
import { METHODOLOGY_META, METHODOLOGY_ROLES, type Methodology } from "@/domain/diagnosis/methodologies";
import { closeAlternatives, nextMethodologies } from "@/domain/diagnosis/sequence";
import { Markdown } from "@/components/markdown";

const EXAMPLES = [
  "Müşteriden şikayet geldi, üründe çatlak var ve kök neden bilinmiyor.",
  "Yeni hat kuruldu, henüz hata yok ama ciddi bir risk görüyoruz.",
  "İki haftadır kaynak hattında çatlak oluşuyor, geçen ay süreç değişti.",
  "Ölçüm verilerinde varyasyon sürekli yüksek.",
  "Makine sürekli arıza yapıyor, üretim duruyor.",
];

const pct = (c: number) => Math.round(c * 100);
const supportLabel=(value:number)=>value>=0.55?"Çok güçlü":value>=0.35?"Güçlü":value>=0.2?"Orta":value>=0.1?"Sınırlı":"Zayıf";
const label = (m: Methodology) => METHODOLOGY_META[m].shortName;

function normalizeDiagnosisView(data: DiagnosisView): DiagnosisView {
  if (data.evidence && data.methodPlan && data.stabilization) return data;
  const knownAnswers = data.structuredProblem
    ? Object.values(data.structuredProblem.features).filter((value) => value !== null).length
    : 0;
  const top = data.ranking?.[0]?.score ?? 0;
  const second = data.ranking?.[1]?.score ?? 0;
  const primaryMethod = data.ranking?.[0]?.methodology ?? "PDCA_A3";
  const primaryRole = METHODOLOGY_ROLES[primaryMethod];
  return {
    ...data,
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

export function DiagnosisFlow() {
  const router = useRouter();
  const [view, setView] = useState<DiagnosisView | null>(null);
  const [text, setText] = useState("");
  const [freeAnswer, setFreeAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, body: unknown) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "İstek başarısız.");
      setView(normalizeDiagnosisView(data as DiagnosisView));
      setFreeAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata.");
    } finally {
      setLoading(false);
    }
  }

  const start = () => call("/api/diagnosis", { text: text.trim() });
  const answer = (t: string) =>
    view && call(`/api/diagnosis/${view.conversationId}/answer`, { text: t });
  const reset = () => {
    setView(null);
    setText("");
    setError(null);
  };

  return (
    <main className="page-shell max-w-4xl flex-1">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Teşhis</p>
          <h1 className="page-heading mt-1">Problem Teşhisi</h1>
          <p className="page-lead">Problemi tarif edin; sistem belirsizliği azaltan sorularla uygun yönteme kanıt biriktirsin.</p>
        </div>
        {view && (
          <button onClick={reset} className="btn btn-secondary">
            ↺ Yeni teşhis
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {!view && (
        <Intake text={text} setText={setText} onStart={start} loading={loading} />
      )}

      {view && view.status === "ASKING" && (
        <AskingView
          view={view}
          loading={loading}
          onAnswer={answer}
          freeAnswer={freeAnswer}
          setFreeAnswer={setFreeAnswer}
        />
      )}

      {view && view.status === "CONCLUDED" && (
        <ResultView view={view} router={router} onReset={reset} />
      )}
      {view && view.informationTasks.length > 0 && (
        <InformationTasks view={view} loading={loading} onView={setView} />
      )}
    </main>
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
    } catch(e) { setErr(e instanceof Error ? e.message : "Hata"); } finally { setBusy(null); }
  }
  return <section className="card card-accent-indigo p-6">
    <p className="eyebrow">Bilgi görevleri</p><h2 className="text-lg font-semibold">“Bilmiyorum” burada kaybolmaz</h2><p className="mt-1 text-xs text-slate-400">Eksik bilgiyi sahada doğrula; cevap geldiğinde teşhis otomatik yeniden hesaplanır.</p>
    <div className="mt-4 flex flex-col gap-3">{view.informationTasks.map(t=><div key={t.id} className={`rounded-xl border p-4 ${t.status==='RESOLVED'?'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900':'border-slate-200 dark:border-slate-800'}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{t.question}</p><span className="text-xs text-slate-400">{t.status==='OPEN'?'Açık':'Çözüldü'}</span></div>{t.status==='OPEN'?<><div className="mt-3 grid gap-2 sm:grid-cols-2"><input className="field" defaultValue={t.owner??''} placeholder="Sorumlu" onBlur={(e)=>mutate({operation:'UPDATE',taskId:t.id,owner:e.target.value||null,dueDate:t.dueDate})}/><input className="field" type="date" defaultValue={t.dueDate??''} onChange={(e)=>mutate({operation:'UPDATE',taskId:t.id,owner:t.owner,dueDate:e.target.value||null})}/></div><div className="mt-2 flex gap-2"><input className="field" value={answers[t.id]??''} onChange={(e)=>setAnswers({...answers,[t.id]:e.target.value})} placeholder="Sahadan gelen kesin cevap…"/><button disabled={loading||busy===t.id||!(answers[t.id]??'').trim()} onClick={()=>mutate({operation:'RESOLVE',taskId:t.id,answer:answers[t.id]})} className="btn btn-primary">Çöz ve teşhisi yenile</button></div></>:<p className="mt-2 text-xs text-emerald-700">Yanıt: {t.answer} · Sonuç: {t.resultingMethodology}</p>}</div>)}</div>
    {view.recommendationChanges.length>0&&<div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><strong>Yeni kanıt metodoloji önerisini değiştirdi</strong>{view.recommendationChanges.map((c,i)=><p key={i} className="mt-1 text-xs">{c.from} → {c.to}</p>)}</div>}{err&&<p className="mt-2 text-xs text-red-600">{err}</p>}
  </section>;
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
    <div className="card p-6">
      <p className="text-slate-600 dark:text-slate-400">
        Problemi kendi cümlelerinle anlat. Sistem açıklayıcı sorular sorup en uygun
        metodolojiyi gerekçesiyle önerecek.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Örn: Müşteriden şikayet geldi, üründe çatlak var ve kök neden bilinmiyor."
        className="field mt-4 resize-y"
      />
      <div className="mt-3">
        <p className="mb-2 text-xs font-medium text-slate-400">Örnekler</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setText(ex)} className="chip">
              {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onStart}
        disabled={loading || text.trim().length === 0}
        className="btn btn-primary btn-lg mt-5"
      >
        {loading ? "…" : "Teşhise başla →"}
      </button>
    </div>
  );
}

/* ---------- Asking ---------- */
function AskingView({
  view,
  loading,
  onAnswer,
  freeAnswer,
  setFreeAnswer,
}: {
  view: DiagnosisView;
  loading: boolean;
  onAnswer: (t: string) => void;
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

  return (
    <div className="flex flex-col gap-5">
      {/* Netlik göstergesi */}
      <div className="card p-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
          <span>Soru {view.questionsAsked}</span>
          <span>Netlik %{Math.round(clarity * 100)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
            style={{ width: `${Math.max(4, clarity * 100)}%` }}
          />
        </div>
      </div>

      {priorQas.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold text-slate-400">Önceki sorular</p>
          <ol className="flex flex-col gap-1.5">
            {priorQas.map((m, i) => (
              <li
                key={i}
                className={`text-sm ${
                  m.role === "ASSISTANT"
                    ? "text-slate-500"
                    : "font-medium text-slate-800 dark:text-slate-200"
                }`}
              >
                {m.role === "ASSISTANT" ? "S· " : "→ "}
                {m.content}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      {view.nextQuestion && (
        <div className="card card-accent-indigo p-6 lg:sticky lg:top-20">
          {view.nextQuestion.context && <div className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900"><span className="font-semibold text-slate-700 dark:text-slate-300">Bağlam</span><span>{view.nextQuestion.context} prosesi</span></div>}
          <p className="eyebrow">Soru</p>
          <p className="mt-1 text-xl font-semibold leading-snug">{view.nextQuestion.text}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{help[view.nextQuestion.featureKey] ?? "Sahada doğrulanmış bilgiye göre yanıtlayın; emin değilseniz tahmin yürütmeyin."}</p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button onClick={() => onAnswer("evet")} disabled={loading} className="btn btn-answer">
              Evet
            </button>
            <button onClick={() => onAnswer("hayır")} disabled={loading} className="btn btn-answer">
              Hayır
            </button>
            <button onClick={() => onAnswer("bilmiyorum")} disabled={loading} className="btn btn-unknown" title="Eksik bilgi saha görevine dönüşür">
              ? Bilmiyorum
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400 sm:text-right">“Bilmiyorum” seçeneği tahmin istemez; doğrulama görevi oluşturur.</p>

          {unknownStreak >= 3 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20"><strong className="text-sm text-amber-800 dark:text-amber-300">Arka arkaya {unknownStreak} saha bilgisi eksik</strong><p className="mt-1 text-xs text-amber-700 dark:text-amber-400">İsterseniz mevcut kanıtlarla lider metodolojiyi görün; eksik bilgiler görev olarak açık kalır.</p><button type="button" disabled={loading} onClick={()=>onAnswer("__SHOW_CURRENT_RESULT__")} className="btn btn-secondary mt-3">Mevcut bilgilerle sonucu göster</button></div>}

          <div className="mt-3 flex gap-2">
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
      <div className="flex flex-col gap-3"><RankingBars ranking={view.ranking} limit={5} caption={`Teknik belirsizlik: ${view.entropy.toFixed(2)} bit`} /><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50"><strong className="block text-slate-700 dark:text-slate-300">Neden henüz bitmedi?</strong><p className="mt-1">Lider aday için {view.evidence.supportingSignals}/3 bağımsız destek ve toplam {view.evidence.knownAnswers}/4 doğrulanmış cevap var. Yüzde tek başına sonuçlandırma nedeni değildir.</p></div></div>
      </div>
    </div>
  );
}

/* ---------- Result ---------- */
function ResultView({
  view,
  router,
  onReset,
}: {
  view: DiagnosisView;
  router: ReturnType<typeof useRouter>;
  onReset: () => void;
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
      const res = await fetch(`/api/diagnosis/${view.conversationId}/report`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rapor üretilemedi.");
      setReport(data.report);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Hata.");
    } finally {
      setBusy(null);
    }
  }

  async function openWorkspace() {
    setBusy("workspace");
    setActionError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: view.conversationId,
          methodology: result.methodology,
          problemDescription: view.structuredProblem.problemDescription ?? "Problem",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Açılamadı.");
      router.push(`/workspace/${data.id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Hata.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Sonuç hero */}
      <div className="card card-accent-emerald overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {view.evidence.status === "CONFIRMED" ? "Kanıtlarla doğrulanan metodoloji" : "Mevcut kanıtlara göre ön aday"}
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold">{meta.shortName}</h2>
              <p className="text-sm text-slate-500">{meta.name}</p>
              <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">Rol: {METHODOLOGY_ROLES[result.methodology].label}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{supportLabel(result.confidence)}</div>
              <div className="text-xs text-slate-500">öneri destek seviyesi</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
          <p className="mt-2 text-xs text-slate-500">{view.evidence.supportingSignals} bağımsız destek · {view.evidence.knownAnswers} bilinen cevap · lider farkı {view.evidence.scoreMargin} puan{view.evidence.conflicts.length > 0 ? ` · ${view.evidence.conflicts.length} çelişki` : ""}</p>
          <p className="mt-2 rounded-lg bg-white/70 p-2 text-[11px] text-slate-500 dark:bg-slate-900/50"><strong>Kalibrasyon notu:</strong> Bu seviye istatistiksel başarı olasılığı değildir; yanıtların kural tabanıyla göreli uyumunu gösterir. Gerçek saha sonuçlarıyla henüz kalibre edilmemiştir.</p>
          {view.evidence.conflicts.length > 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><strong>Doğrulanması gereken çelişkiler</strong><ul className="mt-1 list-disc pl-4">{view.evidence.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></div>}
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          <button onClick={generateReport} disabled={busy !== null} className="btn btn-secondary">
            {busy === "report" ? "Rapor üretiliyor…" : "📄 Rapor oluştur"}
          </button>
          <button onClick={openWorkspace} disabled={busy !== null} className="btn btn-success">
            {busy === "workspace" ? "Açılıyor…" : "🚀 Uygulama alanını aç →"}
          </button>
        </div>
        {actionError && <p className="px-4 pb-3 text-sm text-red-600">{actionError}</p>}
      </div>

      {report && (
        <div className="card p-6">
          <p className="eyebrow">Rapor</p>
          <Markdown className="mt-2">{report}</Markdown>
        </div>
      )}

      {/* Karar zinciri */}
      <div className="card p-6">
        <p className="eyebrow">Karar zinciri</p>
        <ol className="mt-3">
          {result.trace.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 pb-4">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {s.because}
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400 dark:bg-slate-800">+{s.delta}</span>
              </p>
            </li>
          ))}
          <li className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/40" />
            <p className="text-sm font-semibold">
              Bu nedenle: {label(result.methodology)} <span className="text-emerald-600 dark:text-emerald-400">({supportLabel(result.confidence)} destek)</span>
            </p>
          </li>
        </ol>
      </div>

      <StabilizationGatePanel view={view} />
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200"><strong>Teknik öneri ile kurumsal zorunluluk aynı şey değildir.</strong><p className="mt-1 text-xs leading-5">Uygulama alanında müşteri/OEM formatı, regülasyon, mevcut CAPA kaydı, ekip yetkinliği, zaman ve kaynak baskısını ayrıca kaydedin. Örneğin teknik analiz RCA iken müşteri yanıtı 8D formatında yürütülebilir.</p></div>
      <MethodPlanPanel view={view} />

      <SequencePanel methodology={result.methodology} ranking={view.ranking} />

      {view.counterfactuals.length > 0 && (
        <div className="card p-6">
          <p className="eyebrow">Kararı ne değiştirirdi?</p>
          <h3 className="mt-1 font-semibold">Karşı-olgusal teşhis</h3>
          <p className="mt-1 text-xs text-slate-400">Her senaryo aynı deterministik motorla yeniden hesaplandı; LLM yorumu değildir.</p>
          <div className="mt-3 flex flex-col gap-2">
            {view.counterfactuals.map((c) => (
              <div key={`${c.featureKey}-${c.assumedValue}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <span><strong>Eğer:</strong> {c.explanation}</span>
                <span className="shrink-0 text-xs text-indigo-600 dark:text-indigo-400">{label(c.from)} → {label(c.to)} · %{pct(c.confidence)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <RankingBars ranking={view.ranking} limit={6} caption="Tüm metodolojiler için göreli uygunluk" />

      <button onClick={onReset} className="btn btn-primary btn-lg self-start">
        Yeni teşhis başlat
      </button>
    </div>
  );
}

function StabilizationGatePanel({ view }: { view: DiagnosisView }) {
  const gate = view.stabilization;
  const tone = gate.status === "READY"
    ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
    : gate.status === "STABILIZE_FIRST"
      ? "border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300";
  return <section className={`rounded-xl border p-5 ${tone}`}><p className="eyebrow">Stabilizasyon kapısı</p><h3 className="mt-1 font-semibold">{gate.status === "READY" ? "İyileştirme için baz hat hazır" : gate.status === "STABILIZE_FIRST" ? "Önce SDCA ile stabilize et" : "Stabilizasyon hazırlığı henüz doğrulanmadı"}</h3>{gate.blockers.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs">{gate.blockers.map((blocker) => <li key={blocker.featureKey}>{blocker.reason}</li>)}</ul>}{gate.unknowns.length > 0 && <p className="mt-2 text-xs">Doğrulanması gereken {gate.unknowns.length} hazırlık koşulu var.</p>}</section>;
}

function MethodPlanPanel({ view }: { view: DiagnosisView }) {
  const plan = view.methodPlan;
  return (
    <section className="card p-6">
      <p className="eyebrow">Uygulama mimarisi</p>
      <h3 className="mt-1 font-semibold">Tek yöntem değil, görevine göre yöntem bileşimi</h3>
      <p className="mt-1 text-xs text-slate-400">Ana yöntem çalışmayı taşır; destekleyici yöntemler yalnız pozitif kanıt bulunan teknik boşlukları tamamlar.</p>
      <div className="mt-4 flex flex-col gap-3">
        {[plan.primary, ...plan.supporting].map((entry, index) => (
          <div key={`${entry.layer}-${entry.methodology}`} className={`rounded-xl border p-4 ${index === 0 ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{entry.layerLabel}</p><p className="font-semibold">{METHODOLOGY_META[entry.methodology].shortName}</p></div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{entry.roleLabel} · {entry.score > 0 ? "+" : ""}{entry.score}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{entry.reason}</p>
          </div>
        ))}
      </div>
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
    <div className="card p-6">
      <p className="eyebrow">Tamamlayıcı yaklaşımlar ve sonraki adımlar</p>
      {alts.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Yakın alternatifler</p>
          <p className="text-xs text-slate-400">Asıl mesele farklıysa şunları da değerlendir.</p>
          <ul className="mt-2 flex flex-col gap-2">
            {alts.map((a) => {
              const m = METHODOLOGY_META[a.methodology];
              return (
                <li key={a.methodology} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    %{pct(a.confidence)}
                  </span>
                  <span>
                    <span className="font-semibold">{m.shortName}</span>{" "}
                    <span className="text-slate-500 dark:text-slate-400">— {m.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {next.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sonraki / tamamlayıcı adımlar</p>
          <ul className="mt-2 flex flex-col gap-2">
            {next.map((n) => (
              <li key={n.code} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  {METHODOLOGY_META[n.code].shortName}
                </span>
                <span className="text-slate-500 dark:text-slate-400">{n.reason}</span>
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
    <div className="card p-5">
      <p className="eyebrow">Güven sıralaması</p>
      <div className="mt-3 flex flex-col gap-2">
        {shown.map((r, i) => (
          <div key={r.methodology} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400">
              {label(r.methodology)}
            </span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${i === 0 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`}
                style={{ width: `${Math.max(2, pct(r.confidence))}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">%{pct(r.confidence)}</span>
          </div>
        ))}
      </div>
      {caption && <p className="mt-2.5 text-xs text-slate-400">{caption}</p>}
    </div>
  );
}
