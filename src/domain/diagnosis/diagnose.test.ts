import { describe, it, expect } from "vitest";
import { problemWith, createEmptyProblem, withFeature, FEATURE_META } from "./features";
import { evaluateRules } from "./rule-engine";
import { computeConfidence, entropy } from "./confidence-engine";
import { rankQuestions, selectNextQuestion, shouldStop } from "./question-engine";
import { diagnose } from "./diagnose";
import { METHODOLOGIES } from "./methodologies";

function topMethodology(p: Parameters<typeof evaluateRules>[0]) {
  const { scores } = evaluateRules(p);
  return computeConfidence(scores)[0].methodology;
}

describe("confidence-engine", () => {
  it("softmax bir olasılık dağılımıdır (toplam = 1)", () => {
    const { scores } = evaluateRules(problemWith({ customerAffected: true }));
    const ranking = computeConfidence(scores);
    const sum = ranking.reduce((a, r) => a + r.confidence, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(ranking).toHaveLength(METHODOLOGIES.length);
  });

  it("tüm skorlar eşitken entropi maksimum (log2 N)", () => {
    const empty = createEmptyProblem();
    const ranking = computeConfidence(evaluateRules(empty).scores);
    const h = entropy(ranking.map((r) => r.confidence));
    expect(h).toBeCloseTo(Math.log2(METHODOLOGIES.length), 6);
  });

  it("keskin dağılımda entropi düşer", () => {
    const strong = computeConfidence(evaluateRules(
      problemWith({ hasMeasurementData: true, highVariation: true }),
    ).scores);
    const h = entropy(strong.map((r) => r.confidence));
    expect(h).toBeLessThan(Math.log2(METHODOLOGIES.length));
  });
});

describe("golden cases — doğru metodoloji seçimi", () => {
  it("müşteriye ulaşmış uygunsuzluk + containment + kök neden bilinmiyor → 8D", () => {
    const p = problemWith({
      defectOccurred: true,
      customerAffected: true,
      rootCauseKnown: false,
      externalNonconformance: true,
      containmentNeeded: true,
    });
    expect(topMethodology(p)).toBe("EIGHT_D");
  });

  it("hat yeni, hata yok ama risk var → FMEA", () => {
    const p = problemWith({
      defectOccurred: false,
      startedRecently: true,
      isImprovementInitiative: false,
    });
    expect(topMethodology(p)).toBe("FMEA");
  });

  it("iki haftadır çatlak + süreç değişti → Kepner-Tregoe", () => {
    const p = problemWith({
      defectOccurred: true,
      startedRecently: true,
      processChanged: true,
    });
    expect(topMethodology(p)).toBe("KEPNER_TREGOE");
  });

  it("ölçümlerde varyasyon sürekli yüksek → DMAIC", () => {
    const p = problemWith({ hasMeasurementData: true, highVariation: true });
    expect(topMethodology(p)).toBe("DMAIC");
  });

  it("akut hata değil, sürekli iyileştirme → PDCA/A3", () => {
    const p = problemWith({
      isImprovementInitiative: true,
      defectOccurred: false,
    });
    expect(topMethodology(p)).toBe("PDCA_A3");
  });

  it("tekrar eden, kök nedeni bilinmeyen problem → RCA", () => {
    const p = problemWith({
      defectOccurred: true,
      customerAffected: false,
      rootCauseKnown: false,
      previouslyOccurred: true,
    });
    expect(topMethodology(p)).toBe("RCA");
  });

  it("iş yeri düzensiz → 5S", () => {
    expect(topMethodology(problemWith({ workplaceDisorganized: true }))).toBe("FIVE_S");
  });

  it("kronik ve tekrar eden ekipman kaybı → TPM", () => {
    expect(topMethodology(problemWith({ equipmentBreakdown: true, chronicEquipmentLoss: true, previouslyOccurred: true }))).toBe("TPM");
  });

  it("akış/israf/temin süresi → Yalın/VSM", () => {
    expect(topMethodology(problemWith({ flowOrWaste: true }))).toBe("LEAN_VSM");
  });

  it("yeni ürün/süreç tasarımı → DMADV", () => {
    expect(topMethodology(problemWith({ isNewDesign: true }))).toBe("DMADV");
  });

  it("stabil süreci sürekli izleme → SPC", () => {
    expect(topMethodology(problemWith({ monitoringNeed: true }))).toBe("SPC");
  });

  it("insan hatası/hata önleme → Poka-Yoke", () => {
    expect(topMethodology(problemWith({ humanErrorProne: true }))).toBe("POKA_YOKE");
  });

  it("dar boğaz/kapasite kısıtı → TOC", () => {
    expect(topMethodology(problemWith({ bottleneckThroughput: true }))).toBe("TOC");
  });

  it("darboğaz WIP ve akış kaybı da üretiyorsa açık sistem kısıtı nedeniyle TOC öne çıkar", () => {
    expect(topMethodology(problemWith({ bottleneckThroughput: true, flowOrWaste: true, hasMeasurementData: true }))).toBe("TOC");
  });
});

describe("teşhis önceliği (R6b) — kök neden bilinmezken çözüm erken", () => {
  it("kök neden bilinmiyor + insan hatası → Poka-Yoke değil, önce RCA", () => {
    const p = problemWith({
      defectOccurred: true,
      customerAffected: false,
      rootCauseKnown: false,
      humanErrorProne: true,
    });
    expect(topMethodology(p)).toBe("RCA");
  });

  it("kök neden bilinmiyor iken SPC/5S bastırılır ama RCA öne çıkar", () => {
    // İzleme ihtiyacı + neden bilinmiyor: SPC erken; teşhis öncelikli olmalı.
    expect(topMethodology(problemWith({ rootCauseKnown: false, monitoringNeed: true }))).toBe("RCA");
  });

  it("R6b yalnızca kök neden AÇIKÇA false iken tetiklenir (arketip bozulmaz)", () => {
    // rootCauseKnown null → guard tetiklenmez, saf arketip lider kalır.
    expect(topMethodology(problemWith({ humanErrorProne: true }))).toBe("POKA_YOKE");
    expect(topMethodology(problemWith({ monitoringNeed: true }))).toBe("SPC");
    expect(topMethodology(problemWith({ workplaceDisorganized: true }))).toBe("FIVE_S");
  });

  it("R6b TPM/TOC gibi kendi analizini içeren yöntemleri ETKİLEMEZ", () => {
    // Ekipman arızası/dar boğaz + neden bilinmiyor: bu yöntemler bastırılmamalı.
    expect(topMethodology(problemWith({ rootCauseKnown: false, equipmentBreakdown: true, chronicEquipmentLoss: true, previouslyOccurred: true }))).toBe("TPM");
    expect(topMethodology(problemWith({ rootCauseKnown: false, bottleneckThroughput: true }))).toBe("TOC");
  });
});

describe("question-engine — adaptif soru seçimi", () => {
  it("boş problemde bilgi kazançlı bir soru seçer", () => {
    const q = selectNextQuestion(createEmptyProblem());
    expect(q).not.toBeNull();
    expect(q!.informationGain).toBeGreaterThan(0);
  });

  it("bilinen alanı tekrar sormaz", () => {
    const p = problemWith({ customerAffected: true });
    const q = selectNextQuestion(p);
    expect(q?.featureKey).not.toBe("customerAffected");
  });

  it("yeterince eminken durur", () => {
    const ranking = computeConfidence(evaluateRules(
      problemWith({ hasMeasurementData: true, highVariation: true }),
    ).scores);
    // lider mutlak güveni yüksek → durmalı
    expect(shouldStop(ranking, 4, 0.1, undefined, {
      knownAnswers: 4,
      supportingSignals: 3,
      scoreMargin: 2,
    })).toBe(true);
  });

  it("yüksek güven tek başına teşhisi sonuçlandırmaz", () => {
    const ranking = computeConfidence(evaluateRules(
      problemWith({ equipmentBreakdown: true }),
    ).scores);
    expect(shouldStop(ranking, 1, 0.1, undefined, {
      knownAnswers: 1,
      supportingSignals: 1,
      scoreMargin: 4,
    })).toBe(false);
  });

  it("dört cevap olsa bile lideri üç bağımsız sinyal desteklemiyorsa devam eder", () => {
    const ranking = computeConfidence(evaluateRules(
      problemWith({ equipmentBreakdown: true }),
    ).scores);
    expect(shouldStop(ranking, 4, 0.1, undefined, {
      knownAnswers: 4,
      supportingSignals: 1,
      scoreMargin: 4,
    })).toBe(false);
  });

  it("maxQuestions aşılınca durur", () => {
    const ranking = computeConfidence(evaluateRules(createEmptyProblem()).scores);
    expect(shouldStop(ranking, 99, 1.0)).toBe(true);
  });

  it("müşteriye ulaşmış hata vakasında ilgisiz işyeri ve akış sorularını ele", () => {
    const keys = rankQuestions(problemWith({
      defectOccurred: true,
      customerAffected: true,
    })).map((candidate) => candidate.featureKey);

    expect(keys).not.toContain("workplaceDisorganized");
    expect(keys).not.toContain("flowOrWaste");
    expect(keys).not.toContain("bottleneckThroughput");
    expect(keys).not.toContain("isNewDesign");
  });

  it("ekipman arızası vakasında alakasız tasarım ve düzen sorularını ele", () => {
    const keys = rankQuestions(problemWith({ equipmentBreakdown: true }))
      .map((candidate) => candidate.featureKey);

    expect(keys).not.toContain("workplaceDisorganized");
    expect(keys).not.toContain("isNewDesign");
    expect(keys).not.toContain("humanErrorProne");
    expect(keys).not.toContain("bottleneckThroughput");
  });

  it("henüz hata oluşmamış risk vakasında olay-sonrası soruları ele", () => {
    const keys = rankQuestions(problemWith({ defectOccurred: false }))
      .map((candidate) => candidate.featureKey);

    expect(keys).not.toContain("rootCauseKnown");
    expect(keys).not.toContain("startedRecently");
    expect(keys).not.toContain("previouslyOccurred");
  });

  it("soru metinleri profesyonel, tarafsız ve yöntem adından bağımsızdır", () => {
    const themes = Object.values(FEATURE_META).map((meta) => meta.questionTheme);
    expect(themes.every((theme) => theme.endsWith("?"))).toBe(true);
    expect(FEATURE_META.rootCauseKnown.questionTheme).toContain("doğruland");
    expect(FEATURE_META.humanErrorProne.questionTheme).not.toMatch(/Poka|Yoke/i);
    expect(themes.join(" ")).not.toMatch(/DMAIC|FMEA|8D|Kepner|SPC/i);
  });
});

describe("diagnose fasadı — uçtan uca tek tur", () => {
  it("boş problemde sonuca varmaz, soru döndürür", () => {
    const snap = diagnose(createEmptyProblem(), 0);
    expect(snap.concluded).toBe(false);
    expect(snap.nextQuestion).not.toBeNull();
    expect(snap.entropy).toBeGreaterThan(0);
  });

  it("net problemde sonuca varır ve trace üretir", () => {
    const p = problemWith({
      defectOccurred: true,
      customerAffected: true,
      rootCauseKnown: false,
      externalNonconformance: true,
      containmentNeeded: true,
    });
    const snap = diagnose(p, 3);
    expect(snap.ranking[0].methodology).toBe("EIGHT_D");
    expect(snap.trace.steps.length).toBeGreaterThan(0);
    expect(snap.trace.conclusion.methodology).toBe("EIGHT_D");
  });

  it("adaptif döngü: soruları cevaplayınca entropi düşer", () => {
    // Simülasyon: gerçek (gizli) durum bir DMAIC senaryosu.
    const truth = {
      hasMeasurementData: true,
      highVariation: true,
      defectOccurred: true,
      customerAffected: false,
      measurementReliable: true,
      processStable: false,
      standardWorkEstablished: true,
      basicConditionsStable: true,
    } as const;

    let p = createEmptyProblem();
    // Boş başlangıçtan simülasyon: tüm değişkenlerin sorulabilmesi için bütçe geniş.
    // (Gerçekte parser alanları metinden doldurur; bu yapay en-kötü senaryodur.)
    const config = { stop: { maxQuestions: 30, confidenceThreshold: 1.1 } };
    const hStart = diagnose(p, 0, config).entropy;
    let asked = 0;
    for (let i = 0; i < 30; i++) {
      const snap = diagnose(p, asked, config);
      if (snap.concluded || !snap.nextQuestion) break;
      const key = snap.nextQuestion.featureKey;
      const answer = (truth as Record<string, boolean>)[key] ?? false;
      p = withFeature(p, key, answer);
      asked++;
    }
    const final = diagnose(p, asked, config);
    expect(final.entropy).toBeLessThan(hStart);
    expect(final.ranking[0].methodology).toBe("DMAIC");
  });
});

describe("profesyonel çoklu kanıt doğrulaması", () => {
  it("müşteri teslimat etkisi tek başına 8D seçtirmez", () => {
    const p = problemWith({ customerAffected: true, flowOrWaste: true });
    expect(topMethodology(p)).toBe("LEAN_VSM");
  });

  it("tekil ekipman arızası TPM'i doğrulamaz", () => {
    const snap = diagnose(problemWith({
      defectOccurred: true,
      equipmentBreakdown: true,
      chronicEquipmentLoss: false,
      previouslyOccurred: false,
    }), 4);
    expect(snap.evidence.status).toBe("PROVISIONAL");
    expect(snap.evidence.supportingSignals).toBeLessThan(3);
  });

  it("güvenilir veri + yüksek varyasyon + kararsız proses DMAIC'i çoklu kanıtla destekler", () => {
    const snap = diagnose(problemWith({
      defectOccurred: true,
      hasMeasurementData: true,
      measurementReliable: true,
      highVariation: true,
      processStable: false,
    }), 4);
    expect(snap.ranking[0].methodology).toBe("DMAIC");
    expect(snap.evidence.status).toBe("CONFIRMED");
  });

  it("SPC ancak kararlılık, güvenilir ölçüm ve izleme ihtiyacı birlikteyken doğrulanır", () => {
    const snap = diagnose(problemWith({
      hasMeasurementData: true,
      measurementReliable: true,
      processStable: true,
      monitoringNeed: true,
    }), 4);
    expect(snap.ranking[0].methodology).toBe("SPC");
    expect(snap.evidence.status).toBe("CONFIRMED");
  });

  it("sürekli görülen problem tek başına DMAIC veya SPC sinyali değildir", () => {
    const ranking = computeConfidence(evaluateRules(problemWith({ intermittent: false })).scores);
    expect(ranking.find((r) => r.methodology === "DMAIC")?.score).toBe(0);
    expect(ranking.find((r) => r.methodology === "SPC")?.score).toBe(0);
  });

  it("gerçekleşmemiş güvenlik riski 8D yerine FMEA'yı destekler", () => {
    expect(topMethodology(problemWith({ defectOccurred: false, safetyOrRegulatory: true }))).toBe("FMEA");
  });

  it("mantıksal çelişki varken sonuç doğrulanmış sayılmaz", () => {
    const snap = diagnose(problemWith({
      defectOccurred: false,
      externalNonconformance: true,
      customerAffected: true,
      containmentNeeded: true,
    }), 4);
    expect(snap.evidence.conflicts.length).toBeGreaterThan(0);
    expect(snap.evidence.status).toBe("PROVISIONAL");
  });
});
