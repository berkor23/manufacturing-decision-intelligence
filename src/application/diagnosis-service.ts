// Diagnosis Service — teşhis döngüsünü orkestre eder.
// domain (saf karar) + parser (anlama) + repository (kalıcılık) burada birleşir.
// KARAR domain'de verilir; bu servis yalnızca akışı yönetir.

import {
  StructuredProblem,
  DiagnosticFeatureKey,
  MethodologyConfidence,
  DecisionTrace,
  Methodology,
  createEmptyProblem,
  withFeature,
  FEATURE_META,
  diagnose,
  DiagnosisConfig,
  detectProcessName,
  diagnosisCounterfactuals,
  DiagnosisCounterfactual,
  composeMethodologyPlan,
  evaluateStabilizationGate,
  normalizeExtraction,
} from "@/domain/diagnosis";
import type { RecordOwner } from "@/domain/access";
import { IProblemParser } from "./ports/problem-parser";
import {
  IConversationRepository,
  Conversation,
  ConversationMessage,
  MessageRole,
  MessageKind,
  InformationTask,
  RecommendationChange,
  FeatureSource,
} from "./ports/conversation-repository";

export interface DiagnosisView {
  conversationId: string;
  status: "ASKING" | "CONCLUDED";
  structuredProblem: StructuredProblem;
  featureSources: Partial<Record<DiagnosticFeatureKey, FeatureSource>>;
  ranking: MethodologyConfidence[];
  entropy: number;
  questionsAsked: number;
  nextQuestion?: {
    featureKey: DiagnosticFeatureKey;
    text: string;
    context: string | null;
    /** Bu sorunun ayırdığı yöntem çifti — "neden bu soru?" için. */
    separates: { ifYes: Methodology; ifNo: Methodology } | null;
  };
  result?: { methodology: Methodology; confidence: number; trace: DecisionTrace };
  messages: ConversationMessage[];
  informationTasks: InformationTask[];
  recommendationChanges: RecommendationChange[];
  counterfactuals: DiagnosisCounterfactual[];
  evidence: ReturnType<typeof diagnose>["evidence"];
  methodPlan: ReturnType<typeof diagnose>["methodPlan"];
  rivalAnalysis: ReturnType<typeof diagnose>["rivalAnalysis"];
  stabilization: ReturnType<typeof diagnose>["stabilization"];
  contrastive: ReturnType<typeof diagnose>["contrastive"];
  contested: ReturnType<typeof diagnose>["contested"];
  recommendation: ReturnType<typeof diagnose>["recommendation"];
}

export class DiagnosisService {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly parser: IProblemParser,
    private readonly config: DiagnosisConfig = {},
  ) {}

  /** Yeni teşhis başlatır: serbest metni yapılandırır, ilk adımı üretir. */
  /** `owner` verilirse konuşma kaydı sahibiyle birlikte tek yazımda oluşturulur. */
  async start(text: string, owner?: RecordOwner): Promise<DiagnosisView> {
    const parse = await this.parser.parseInitial(text);
    // Şüphe kipinde okunan alanlar DEĞER OLARAK YAZILMAZ: "kök nedenin X olduğunu
    // düşünüyoruz" ifadesi rootCauseKnown=true değildir. Alan boş kalır, motor
    // onu sorar. Bu, çıkarıcı ne olursa olsun (anahtar kelime ya da dil modeli)
    // aynı biçimde uygulanır.
    const normalized = normalizeExtraction({ features: parse.features, epistemic: parse.epistemic });
    const sp: StructuredProblem = createEmptyProblem();
    // Süreç adı: parser verdiyse onu, yoksa deterministik saptama.
    sp.processName = parse.processName ?? detectProcessName(text);
    sp.problemDescription = parse.problemDescription;
    for (const [k, v] of Object.entries(normalized.features)) {
      if (v !== undefined && v !== null) sp.features[k as DiagnosticFeatureKey] = v;
    }

    const featureSources: Partial<Record<DiagnosticFeatureKey, FeatureSource>> = {};
    for (const [key, value] of Object.entries(sp.features)) {
      if (value !== null) featureSources[key as DiagnosticFeatureKey] = "PARSER";
    }
    const conv = await this.repo.create({
      structuredProblem: sp,
      featureSources,
      messages: [message("USER", "FREE_TEXT", text)],
    }, owner);

    return this.advance(conv);
  }

  /** Bekleyen soruya verilen serbest cevabı işler ve döngüyü ilerletir. */
  async answer(conversationId: string, text: string): Promise<DiagnosisView> {
    const raw = await this.repo.get(conversationId);
    const conv = raw ? this.normalize(raw) : null;
    if (!conv) throw new Error(`Conversation bulunamadı: ${conversationId}`);
    if (conv.status !== "ACTIVE") return this.toView(conv, this.snapshot(conv));

    if (text === "__SHOW_CURRENT_RESULT__") {
      conv.pendingFeature = null;
      const snap = this.snapshot(conv);
      const leader = snap.ranking[0];
      conv.status = "CONCLUDED";
      conv.result = { methodology: leader.methodology, confidence: leader.confidence, ranking: snap.ranking, trace: snap.trace, evidenceStatus: snap.evidence.status, methodPlan: snap.methodPlan, stabilization: snap.stabilization };
      conv.messages.push(message("SYSTEM", "REPORT", "Kullanıcının isteğiyle mevcut bilgiler kullanılarak teşhis sonuçlandırıldı."));
      conv.messages.push(message("ASSISTANT", "REPORT", summarize(snap.trace)));
      await this.repo.save(conv);
      return this.toView(conv, snap);
    }

    const feature = conv.pendingFeature;
    conv.messages.push(message("USER", "ANSWER", text, feature));

    if (feature) {
      const value = await this.parser.interpretAnswer({
        featureKey: feature,
        questionTheme: FEATURE_META[feature].questionTheme,
        answerText: text,
      });
      if (value !== null) {
        conv.structuredProblem = withFeature(conv.structuredProblem, feature, value);
        conv.featureSources[feature] = "USER_ANSWERED";
      } else {
        const exists = conv.informationTasks.some((t) => t.featureKey === feature && t.status === "OPEN");
        if (!exists) conv.informationTasks.push({
          id: `info_${Date.now().toString(36)}_${feature}`,
          featureKey: feature,
          question: FEATURE_META[feature].questionTheme,
          status: "OPEN", owner: null, dueDate: null, answer: null,
          createdAt: new Date().toISOString(), resolvedAt: null,
          previousMethodology: conv.result?.methodology ?? null, resultingMethodology: null,
        });
      }
      // Cevabı belirsiz olsa bile bir daha sorma:
      if (!conv.askedFeatures.includes(feature)) conv.askedFeatures.push(feature);
      conv.pendingFeature = null;
    }

    return this.advance(conv);
  }

  /** Mevcut durumu (soru sormadan) döndürür. */
  async getState(conversationId: string): Promise<DiagnosisView | null> {
    const raw = await this.repo.get(conversationId);
    const conv = raw ? this.normalize(raw) : null;
    return conv ? this.toView(conv, this.snapshot(conv)) : null;
  }

  /** İlk metinden çıkarılan kritik alanları kullanıcı onayıyla düzeltir. */
  async reviewFeatures(
    conversationId: string,
    corrections: Partial<Record<DiagnosticFeatureKey, boolean | null>>,
  ): Promise<DiagnosisView> {
    const raw = await this.repo.get(conversationId);
    if (!raw) throw new Error(`Conversation bulunamadı: ${conversationId}`);
    const conv = this.normalize(raw);
    if (conv.status === "ABANDONED") throw new Error("Terk edilmiş teşhis düzenlenemez.");

    if (conv.status === "CONCLUDED") {
      conv.status = "ACTIVE";
      conv.result = null;
      const last = conv.messages.at(-1);
      if (last?.role === "ASSISTANT" && last.kind === "REPORT") conv.messages.pop();
    }

    for (const [rawKey, value] of Object.entries(corrections)) {
      const key = rawKey as DiagnosticFeatureKey;
      conv.structuredProblem = withFeature(conv.structuredProblem, key, value ?? null);
      conv.featureSources[key] = value === null ? "UNKNOWN" : "USER_CONFIRMED";
    }

    // start() ilk soruyu önceden üretir. Onaydan sonra eski varsayımla seçilmiş
    // soruyu kaldırıp güncel problem üzerinden yeniden seçiyoruz.
    if (conv.pendingFeature) {
      const last = conv.messages.at(-1);
      if (last?.role === "ASSISTANT" && last.kind === "QUESTION") conv.messages.pop();
      conv.questionsAsked = Math.max(0, conv.questionsAsked - 1);
      conv.pendingFeature = null;
    }
    conv.result = null;
    conv.messages.push(message("SYSTEM", "REPORT", "İlk metinden çıkarılan kritik bilgiler kullanıcı tarafından gözden geçirildi."));
    return this.advance(conv);
  }

  async updateInformationTask(conversationId: string, taskId: string, patch: { owner?: string | null; dueDate?: string | null }) {
    const raw = await this.repo.get(conversationId);
    if (!raw) throw new Error(`Conversation bulunamadı: ${conversationId}`);
    const conv = this.normalize(raw);
    const task = conv.informationTasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Bilgi görevi bulunamadı.");
    if (patch.owner !== undefined) task.owner = patch.owner;
    if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
    await this.repo.save(conv);
    return this.toView(conv, this.snapshot(conv));
  }

  async resolveInformationTask(conversationId: string, taskId: string, answerText: string): Promise<DiagnosisView> {
    const raw = await this.repo.get(conversationId);
    if (!raw) throw new Error(`Conversation bulunamadı: ${conversationId}`);
    const conv = this.normalize(raw);
    const task = conv.informationTasks.find((t) => t.id === taskId);
    if (!task || task.status !== "OPEN") throw new Error("Açık bilgi görevi bulunamadı.");
    const value = await this.parser.interpretAnswer({ featureKey: task.featureKey, questionTheme: FEATURE_META[task.featureKey].questionTheme, answerText });
    if (value === null) throw new Error("Cevap evet/hayır olarak yorumlanamadı; daha açık yazın.");
    const before = conv.result?.methodology ?? this.snapshot(conv).ranking[0]?.methodology ?? null;
    conv.structuredProblem = withFeature(conv.structuredProblem, task.featureKey, value);
    conv.featureSources[task.featureKey] = "USER_ANSWERED";
    task.status = "RESOLVED"; task.answer = answerText; task.resolvedAt = new Date().toISOString(); task.previousMethodology = before;
    conv.pendingFeature = null; conv.result = null; conv.status = "ACTIVE";
    conv.messages.push(message("USER", "ANSWER", `[Bilgi görevi tamamlandı] ${answerText}`, task.featureKey));
    const view = await this.advance(conv);
    const after = view.result?.methodology ?? view.ranking[0]?.methodology ?? null;
    task.resultingMethodology = after;
    if (before && after && before !== after) conv.recommendationChanges.push({ taskId, from: before, to: after, changedAt: new Date().toISOString() });
    await this.repo.save(conv);
    return this.toView(conv, this.snapshot(conv));
  }

  // --- iç yardımcılar ---

  private snapshot(conv: Conversation) {
    return diagnose(conv.structuredProblem, conv.questionsAsked, {
      ...this.config,
      excludedFeatures: conv.askedFeatures,
      unconfirmedFeatures: Object.entries(conv.featureSources)
        .filter(([, source]) => source === "PARSER")
        .map(([key]) => key as DiagnosticFeatureKey),
    });
  }

  private async advance(conv: Conversation): Promise<DiagnosisView> {
    const snap = this.snapshot(conv);

    if (snap.nextQuestion) {
      const q = snap.nextQuestion;
      conv.pendingFeature = q.featureKey;
      conv.questionsAsked += 1;
      conv.status = "ACTIVE";
      conv.messages.push(message("ASSISTANT", "QUESTION", q.theme, q.featureKey));
    } else {
      conv.status = "CONCLUDED";
      const leader = snap.ranking[0];
      conv.result = {
        methodology: leader.methodology,
        confidence: leader.confidence,
        ranking: snap.ranking,
        trace: snap.trace,
        evidenceStatus: snap.evidence.status,
        methodPlan: snap.methodPlan,
        stabilization: snap.stabilization,
      };
      conv.messages.push(message("ASSISTANT", "REPORT", summarize(snap.trace)));
    }

    await this.repo.save(conv);
    return this.toView(conv, snap);
  }

  private toView(conv: Conversation, snap: ReturnType<typeof diagnose>): DiagnosisView {
    return {
      conversationId: conv.id,
      status: conv.status === "CONCLUDED" ? "CONCLUDED" : "ASKING",
      structuredProblem: conv.structuredProblem,
      featureSources: conv.featureSources,
      ranking: snap.ranking,
      entropy: snap.entropy,
      questionsAsked: conv.questionsAsked,
      nextQuestion:
        conv.status !== "CONCLUDED" && conv.pendingFeature
          ? {
              featureKey: conv.pendingFeature,
              text: FEATURE_META[conv.pendingFeature].questionTheme,
              context: conv.structuredProblem.processName,
              separates:
                snap.nextQuestion?.featureKey === conv.pendingFeature
                  ? snap.nextQuestion.separates
                  : null,
            }
          : undefined,
      result: conv.result
        ? {
            methodology: conv.result.methodology,
            confidence: conv.result.confidence,
            trace: conv.result.trace,
          }
        : undefined,
      messages: conv.messages,
      informationTasks: conv.informationTasks,
      recommendationChanges: conv.recommendationChanges,
      counterfactuals: conv.status === "CONCLUDED" ? diagnosisCounterfactuals(conv.structuredProblem, conv.questionsAsked, this.config) : [],
      evidence: snap.evidence,
      methodPlan: snap.methodPlan,
      rivalAnalysis: snap.rivalAnalysis,
      stabilization: snap.stabilization,
      contrastive: snap.contrastive,
      contested: snap.contested,
      recommendation: snap.recommendation,
    };
  }

  private normalize(conv: Conversation): Conversation {
    const empty = createEmptyProblem();
    return {
      ...conv,
      structuredProblem: {
        ...empty,
        ...conv.structuredProblem,
        features: { ...empty.features, ...conv.structuredProblem.features },
      },
      featureSources: conv.featureSources ?? {},
      result: conv.result
        ? {
            ...conv.result,
            evidenceStatus: conv.result.evidenceStatus ?? "PROVISIONAL",
            methodPlan: conv.result.methodPlan ?? composeMethodologyPlan(conv.result.ranking),
            stabilization: conv.result.stabilization ?? evaluateStabilizationGate(conv.structuredProblem),
          }
        : null,
      informationTasks: conv.informationTasks ?? [],
      recommendationChanges: conv.recommendationChanges ?? [],
    };
  }
}

function message(
  role: MessageRole,
  kind: MessageKind,
  content: string,
  featureKey: DiagnosticFeatureKey | null = null,
): ConversationMessage {
  return { role, kind, content, featureKey, createdAt: new Date().toISOString() };
}

function summarize(trace: DecisionTrace): string {
  const chain = trace.steps.map((s) => s.because).join("; ");
  const pct = Math.round(trace.conclusion.confidence * 100);
  return `${chain}${chain ? ". " : ""}Önerilen metodoloji: ${trace.conclusion.methodology} (göreli kural desteği ${pct}/100; kalibre başarı olasılığı değildir)`;
}
