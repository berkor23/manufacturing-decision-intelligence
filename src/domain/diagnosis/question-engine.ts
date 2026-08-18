// Adaptive Question Engine — belirsizliği en çok azaltacak soruyu seçer. SAF.
//
// İlke: chatbot değil, teşhis. Sıradaki soru öncelikle en yüksek beklenen bilgi
// kazancı (mutual information) olan bilinmeyen alandır. Ancak tek-adım bilgi
// kazancı MİYOPtur: bir metodolojiyi ancak İKİ alan birlikte tetikliyorsa
// (ör. DMAIC = veri + varyasyon), hiçbir alan tek başına bilgilendirici görünmez
// ve hatta yeni bir rakip hipotez ekleyip entropiyi artırabilir (negatif IG).
// Bu platoyu aşmak için: IG sıfıra yakınken STATİK TEŞHİS ÖNCELİĞİNE düşeriz
// (bir alanın kurallarda aldığı en büyük ağırlık) — böylece eşleşik kuralların
// kilidini açan yüksek etkili alanlar sorulur. (bkz. docs/ARCHITECTURE.md §7)

import {
  StructuredProblem,
  DiagnosticFeatureKey,
  unknownFeatures,
  withFeature,
  FEATURE_KEYS,
  knownFeatures,
} from "./features";
import { Rule, RULES, referencedFeatures } from "./rules";
import {
  computeConfidence,
  rankingEntropy,
  MethodologyConfidence,
  DEFAULT_TEMPERATURE,
} from "./confidence-engine";
import { evaluateRules } from "./rule-engine";
import type { Methodology } from "./methodologies";

export interface StopPolicy {
  /** Lider MUTLAK güven bu eşiği geçerse dur. */
  confidenceThreshold: number;
  /** En fazla bu kadar soru sor (belirsiz vakalar için üst sınır). */
  maxQuestions: number;
  /** Sonuç için gereken asgari bilinen cevap sayısı. */
  minimumKnownAnswers: number;
  /** Başlangıç metninden bağımsız olarak kullanıcıya sorulacak asgari soru sayısı. */
  minimumQuestionsAsked: number;
  /** Lider yöntemi bağımsız olarak destekleyen asgari özellik sayısı. */
  minimumSupportingSignals: number;
  /** Lider ile ikinci aday arasındaki asgari ham puan farkı. */
  minimumScoreMargin: number;
}

export const DEFAULT_STOP_POLICY: StopPolicy = {
  // Geniş metodoloji havuzunda lider mutlak güveni daha düşük seyreder; eşik ona göre.
  confidenceThreshold: 0.72,
  // Tutarlı olmayan vakalarda kesinlik üretmek yerine 12 soruda bilgi planına dön.
  maxQuestions: 12,
  minimumKnownAnswers: 4,
  minimumQuestionsAsked: 3,
  minimumSupportingSignals: 3,
  minimumScoreMargin: 2,
};

export interface DecisionReadiness {
  knownAnswers: number;
  supportingSignals: number;
  scoreMargin: number;
  /** Yönteme özgü zorunlu kanıt boyutları ve çelişki kapısı karşılandı. */
  ready?: boolean;
}

export interface QuestionCandidate {
  featureKey: DiagnosticFeatureKey;
  informationGain: number;
  /** Statik teşhis önceliği (kurallarda aldığı en büyük ağırlık). */
  priority: number;
  /** Evet veya hayır yanıtlarından en az biri mevcut lideri değiştirebilir. */
  changesLeader: boolean;
  /** Soru, mevcut liderin kendi kanıt profilini güçlendiren bir kuralda kullanılır. */
  supportsLeader: boolean;
  /**
   * Sorunun AYIRDIĞI yöntem çifti: "evet" denirse öne çıkan ile "hayır" denirse
   * öne çıkan farklıysa doldurulur. Kullanıcıya sorunun neden sorulduğunu
   * göstermek için kullanılır — soru rastgele değil, iki hipotezi ayırmak
   * içindir. İki durumda da aynı yöntem lider kalıyorsa null.
   */
  separates: { ifYes: Methodology; ifNo: Methodology } | null;
}

export interface QuestionEngineOptions {
  rules?: Rule[];
  temperature?: number;
  /** Daha önce sorulmuş ama yanıtı belirsiz kalmış (null) alanlar — tekrar sorma. */
  excludedFeatures?: DiagnosticFeatureKey[];
}

function confidenceFor(
  p: StructuredProblem,
  rules: Rule[],
  temperature: number,
): MethodologyConfidence[] {
  return computeConfidence(evaluateRules(p, rules).scores, temperature);
}

/** Bir alanın statik teşhis önceliği: kurallarda göründüğü en büyük |ağırlık|. */
function featurePriority(key: DiagnosticFeatureKey, rules: Rule[]): number {
  let max = 0;
  for (const r of rules) {
    if (!r.reads.includes(key)) continue;
    for (const w of Object.values(r.effect)) {
      max = Math.max(max, Math.abs(w as number));
    }
  }
  return max;
}

/**
 * Bilgi kazancı yüksek olsa bile sahadaki problem ailesiyle anlamsız kalan soruları
 * ele. Bu karar sonucunu DEĞİŞTİRMEZ; yalnızca kullanıcıya sunulan aday havuzunu
 * daraltır. Henüz aile sinyali yoksa bütün sorular aday kalır.
 */
/** Yalnız bir karar (alternatif seçimi) bağlamında anlamlı olan alanlar. */
const DECISION_CONTEXT_ONLY = new Set<DiagnosticFeatureKey>([
  "multipleAlternativesDefined",
  "mandatoryCriteriaDefined",
  "preferenceCriteriaDefined",
  "decisionOwnerKnown",
  "unresolvedCauseBeforeDecision",
]);

export function isQuestionRelevant(key: DiagnosticFeatureKey, p: StructuredProblem): boolean {
  const f = p.features;

  // Hata çoktan oluştuysa "sıfırdan yeni bir şey mi tasarlıyoruz?" sorusu bilgi
  // üretmez: yeni tasarım dalı gerçekleşmiş hata YOKKEN anlamlıdır. Bu soru
  // yüksek bilgi kazancı hesaplasa bile kullanıcı için boş bir turdur.
  if (key === "isNewDesign" && f.defectOccurred === true) return false;

  // `decisionBetweenOptions` bir TEŞHİS alanı değil, ÇERÇEVE alanıdır: problemin
  // bir seçim kararı olduğu kullanıcının kendi anlatımından gelir. Karar kuralı
  // KD1 çok büyük ağırlık taşıdığı için bu alan her ailede en yüksek bilgi
  // kazancını hesaplar ve gerçek ayırt edici soruların önüne geçer. Hata
  // bildiren bir kullanıcıya "bu aslında alternatif seçimi mi?" diye sormak
  // hem tuhaf hem de bir tur kaybıdır; anlatımda seçim geçiyorsa alan zaten
  // ayrıştırmadan dolu gelir (bkz. S vakası).
  if (key === "decisionBetweenOptions" && f.defectOccurred === true) return false;

  // Karar analizi alanları yalnız KARAR BAĞLAMINDA anlamlıdır. Ortada bir
  // alternatif seçimi olduğu bilinmeden "zorunlu kriterler tanımlı mı?" ya da
  // "seçimi engelleyen çözülmemiş bir neden var mı?" diye sormak, kullanıcının
  // hiç kurmadığı bir çerçeveyi varsayar. Karar bağlamı kurulduğunda (aşağıdaki
  // decisionBetweenOptions === true dalı) bu alanların hepsi zaten sorulabilir.
  if (DECISION_CONTEXT_ONLY.has(key) && f.decisionBetweenOptions !== true) return false;

  if (f.decisionBetweenOptions === true) {
    return new Set<DiagnosticFeatureKey>([
      "decisionBetweenOptions",
      "multipleAlternativesDefined",
      "mandatoryCriteriaDefined",
      "preferenceCriteriaDefined",
      "decisionOwnerKnown",
      "unresolvedCauseBeforeDecision",
      "hasMeasurementData",
      "safetyOrRegulatory",
    ]).has(key);
  }

  if (f.bottleneckThroughput === true) {
    return new Set<DiagnosticFeatureKey>([
      "bottleneckThroughput", "flowOrWaste", "constraintQueue",
      "downstreamStarvation", "constraintMeasured", "constraintLeverageExpected", "hasMeasurementData",
      "measurementReliable", "equipmentBreakdown", "isImprovementInitiative",
      "defectOccurred",
    ]).has(key);
  }

  const plannedChange = f.processChanged === true || f.operatorChanged === true || f.supplierChanged === true;
  if (f.defectOccurred === false && plannedChange) {
    return new Set<DiagnosticFeatureKey>([
      "defectOccurred", "processChanged", "operatorChanged", "supplierChanged",
      "failureModeKnown", "humanErrorProne", "safetyOrRegulatory",
      "potentialEffectKnown", "controlAdequacyUncertain",
      "standardWorkEstablished", "basicConditionsStable", "isNewDesign",
    ]).has(key);
  }

  const common = new Set<DiagnosticFeatureKey>(["defectOccurred", "customerAffected", "safetyOrRegulatory", "standardWorkEstablished", "basicConditionsStable"]);
  if (common.has(key)) return true;

  if (f.chronicEquipmentLoss === true || f.equipmentBreakdown === true) {
    return new Set<DiagnosticFeatureKey>([
      "rootCauseKnown", "startedRecently", "previouslyOccurred", "processChanged",
      "operatorChanged", "supplierChanged", "comparisonAvailable", "hasMeasurementData",
      "measurementReliable", "intermittent", "isImprovementInitiative", "safetyOrRegulatory",
      "customerAffected", "defectOccurred", "equipmentBreakdown", "chronicEquipmentLoss",
      "standardWorkEstablished", "basicConditionsStable",
      // Kısıt soruları BU ailede de sorulabilmeli. Kronik arızalı bir ekipmanın
      // aynı zamanda sistem kısıtı olması sahada sık görülen çift-karakterli
      // vakadır; "arızalanmadığı zaman da çıktıyı sınırlıyor mu?" sorulamazsa
      // motor güvenilirlik kaybı ile yapısal kısıtı hiçbir zaman ayıramaz.
      "bottleneckThroughput", "constraintQueue", "downstreamStarvation",
      "constraintMeasured", "constraintLeverageExpected", "flowOrWaste",
    ]).has(key);
  }

  if (f.isNewDesign === true) {
    return new Set<DiagnosticFeatureKey>(["isNewDesign", "humanErrorProne", "failureModeKnown", "hasMeasurementData", "measurementReliable", "highVariation", "safetyOrRegulatory", "customerAffected", "defectOccurred"]).has(key);
  }

  if (f.defectOccurred === false) {
    return new Set<DiagnosticFeatureKey>(["isNewDesign", "humanErrorProne", "failureModeKnown", "workplaceDisorganized", "equipmentBreakdown", "chronicEquipmentLoss", "flowOrWaste", "bottleneckThroughput", "isImprovementInitiative", "monitoringNeed", "processStable", "hasMeasurementData", "measurementReliable", "safetyOrRegulatory", "customerAffected", "externalNonconformance", "defectOccurred"]).has(key);
  }

  if (f.customerAffected === true && f.defectOccurred === true) {
    return new Set<DiagnosticFeatureKey>(["rootCauseKnown", "startedRecently", "previouslyOccurred", "processChanged", "operatorChanged", "supplierChanged", "comparisonAvailable", "hasMeasurementData", "measurementReliable", "safetyOrRegulatory", "intermittent", "equipmentBreakdown", "failureModeKnown", "humanErrorProne", "customerAffected", "externalNonconformance", "containmentNeeded", "defectOccurred"]).has(key);
  }

  if (f.highVariation === true) {
    return new Set<DiagnosticFeatureKey>(["hasMeasurementData", "measurementReliable", "processStable", "rootCauseKnown", "intermittent", "monitoringNeed", "startedRecently", "previouslyOccurred", "processChanged", "comparisonAvailable", "isImprovementInitiative", "safetyOrRegulatory", "customerAffected", "defectOccurred", "highVariation"]).has(key);
  }

  if (f.flowOrWaste === true) {
    return new Set<DiagnosticFeatureKey>(["bottleneckThroughput", "flowOrWaste", "constraintQueue", "downstreamStarvation", "constraintMeasured", "equipmentBreakdown", "chronicEquipmentLoss", "hasMeasurementData", "measurementReliable", "monitoringNeed", "processStable", "isImprovementInitiative", "safetyOrRegulatory", "customerAffected", "defectOccurred"]).has(key);
  }

  return true;
}

/**
 * Her bilinmeyen (ve kural setince referans edilen) alan için beklenen bilgi
 * kazancını ve statik önceliğini hesaplar. Sıralama:
 *   1) max(IG, 0) azalan  — gerçekten bilgilendirici sorular önce
 *   2) statik öncelik azalan — plato durumunda yüksek etkili alanlar
 *   3) sabit FEATURE_KEYS sırası — determinizm
 * Alan değeri önseli: 0.5/0.5 (Faz 6'da taban oranıyla iyileşir).
 */
export function rankQuestions(
  p: StructuredProblem,
  options: QuestionEngineOptions = {},
): QuestionCandidate[] {
  const rules = options.rules ?? RULES;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const referenced = referencedFeatures(rules);
  const excluded = new Set(options.excludedFeatures ?? []);

  const hBefore = rankingEntropy(confidenceFor(p, rules, temperature));
  const currentLeader = confidenceFor(p, rules, temperature)[0]?.methodology;

  const candidates: QuestionCandidate[] = [];
  for (const key of unknownFeatures(p)) {
    if (!referenced.has(key)) continue; // ilgi kapısı: hiçbir kuralda geçmiyorsa sorma
    if (excluded.has(key)) continue; // zaten sorulmuş, yanıtı belirsiz kalmış
    if (!isQuestionRelevant(key, p)) continue; // problem ailesiyle anlamsız soruyu sorma

    const trueRanking = confidenceFor(withFeature(p, key, true), rules, temperature);
    const falseRanking = confidenceFor(withFeature(p, key, false), rules, temperature);
    const hTrue = rankingEntropy(trueRanking);
    const hFalse = rankingEntropy(falseRanking);
    const expectedAfter = 0.5 * hTrue + 0.5 * hFalse;
    const informationGain = hBefore - expectedAfter;

    const leaderIfYes = trueRanking[0]?.methodology;
    const leaderIfNo = falseRanking[0]?.methodology;

    candidates.push({
      featureKey: key,
      informationGain,
      priority: featurePriority(key, rules),
      separates:
        leaderIfYes && leaderIfNo && leaderIfYes !== leaderIfNo
          ? { ifYes: leaderIfYes as Methodology, ifNo: leaderIfNo as Methodology }
          : null,
      changesLeader: trueRanking[0]?.methodology !== currentLeader || falseRanking[0]?.methodology !== currentLeader,
      supportsLeader: rules.some((rule) => rule.reads.includes(key) && currentLeader != null && (rule.effect[currentLeader] ?? 0) > 0),
    });
  }

  const familyEstablished = knownFeatures(p).length >= 2;
  const useful = familyEstablished
    ? candidates.filter((candidate) => candidate.supportsLeader || candidate.changesLeader)
    : candidates;
  // Bileşik kurallarda lideri tek başına değiştirmeyen ama asgari doğrulama
  // turunu tamamlayan sorular kalabilir. Dar liste boşsa teşhisi bir soruda
  // kapatmak yerine aile filtresinden geçmiş adaylara geri dön.
  const rankedCandidates = useful.length > 0 ? useful : candidates;

  // Sıralama: (1) gerçek bilgi kazancı, (2) ADAYLARI AYIRAN soru, (3) statik
  // teşhis önceliği, (4) determinizm. İkinci ölçüt madde madde şu demektir:
  // aynı ölçüde bilgilendirici iki sorudan, cevabı liderliği değiştirebilecek
  // olanı sor. Belirsizliği azaltmayan ama "ilgili" görünen sorular böylece
  // ayırt edici soruların önüne geçemez.
  return rankedCandidates.sort(
    (a, b) =>
      Math.max(b.informationGain, 0) - Math.max(a.informationGain, 0) ||
      Number(b.separates !== null) - Number(a.separates !== null) ||
      b.priority - a.priority ||
      FEATURE_KEYS.indexOf(a.featureKey) - FEATURE_KEYS.indexOf(b.featureKey),
  );
}

/** En iyi adayı döndürür; aday yoksa null. */
export function selectNextQuestion(
  p: StructuredProblem,
  options: QuestionEngineOptions = {},
): QuestionCandidate | null {
  const ranked = rankQuestions(p, options);
  return ranked.length > 0 ? ranked[0] : null;
}

/**
 * Durma ölçütü sağlandı mı? (soru sormayı bırakıp sonuca geç)
 *
 * Not: Bilinçli olarak "saf marj" ve "düşük IG" ölçütleri YOKtur. İkisi de
 * yanıltıcıdır: marj, diğerleri sıfıra yakınken düşük güvende bile büyük
 * görünebilir; düşük/negatif IG ise eşleşik kuralların (iki alan birlikte)
 * kilidini açacak soruları erken kapatır. Bu yüzden yalnızca (a) lider MUTLAK
 * güvene ulaşınca, (b) sorulacak alan kalmayınca, (c) soru bütçesi bitince
 * durulur — teşhis yapan doktor gibi.
 */
export function shouldStop(
  ranking: MethodologyConfidence[],
  questionsAsked: number,
  bestCandidateGain: number | null,
  policy: StopPolicy = DEFAULT_STOP_POLICY,
  readiness?: DecisionReadiness,
): boolean {
  if (questionsAsked >= policy.maxQuestions) return true;
  if (bestCandidateGain === null) return true; // sorulacak alan kalmadı

  if (!readiness) return false;
  if (questionsAsked < policy.minimumQuestionsAsked) return false;
  if (readiness.knownAnswers < policy.minimumKnownAnswers) return false;
  if (readiness.supportingSignals < policy.minimumSupportingSignals) return false;
  if (readiness.scoreMargin < policy.minimumScoreMargin) return false;
  // Profil tabanlı çağrıda zorunlu kanıt boyutları tamamlanmadan yalnız yüksek
  // softmax değeriyle durma. `ready` verilmemiş eski/genel çağrılar confidence
  // eşiğini kullanmaya devam eder.
  if (readiness.ready !== undefined) return readiness.ready;

  const top = ranking[0]?.confidence ?? 0;
  if (top >= policy.confidenceThreshold) return true;

  return false;
}
