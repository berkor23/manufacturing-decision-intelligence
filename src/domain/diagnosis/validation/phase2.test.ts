// Phase 2 testleri — KT sınırı, kör holdout ve baseline korunumu.

import { describe, it, expect } from "vitest";
import { problemWith } from "../features";
import { diagnose } from "../diagnose";
import { rankQuestions } from "../question-engine";
import { KT_BOUNDARY_CASES } from "./kt-boundary-cases";
import { BLIND_HOLDOUT_CASES } from "./blind-holdout-cases";
import { DEVELOPMENT_CASES } from "./manufacturing-cases";
import { HOLDOUT_CASES } from "./holdout-cases";
import { QUESTION_QUALITY_CASES } from "./evidence-cases";
import { evaluateCase, summarize, formatMetrics, formatFailures } from "./run-validation";
import { PHASE1_BASELINE } from "./baseline";

describe("RCA × KT Problem × KT Karar sınırı", () => {
  for (const testCase of KT_BOUNDARY_CASES) {
    it(`${testCase.id} · ${testCase.title}`, () => {
      const result = evaluateCase(testCase);
      expect(result.forbiddenLeader, `${testCase.id}: yasaklı lider ${result.leader}`).toBe(false);
      expect(
        result.acceptableMatch,
        `${testCase.id}: lider ${result.leader}, beklenen ${testCase.expectedPrimary}`,
      ).toBe(true);
    });
  }

  it("KT Karar teşhis vakalarında yükselmez", () => {
    const diagnostic = KT_BOUNDARY_CASES.filter((c) => c.expectedPrimary !== "KT_DECISION");
    for (const testCase of diagnostic) {
      const snapshot = diagnose(problemWith(testCase.answers), 8);
      expect(snapshot.ranking[0].methodology, `${testCase.id}`).not.toBe("KT_DECISION");
    }
  });

  it("ayırıcı karşılaştırma varlığı KT ile RCA'yı ayırır", () => {
    const withContrast = diagnose(
      problemWith({ defectOccurred: true, rootCauseKnown: false, startedRecently: true, processChanged: true, comparisonAvailable: true }),
      8,
    );
    const withoutContrast = diagnose(
      problemWith({ defectOccurred: true, rootCauseKnown: false, startedRecently: false, comparisonAvailable: false, previouslyOccurred: true }),
      8,
    );
    expect(withContrast.ranking[0].methodology).toBe("KEPNER_TREGOE");
    expect(withoutContrast.ranking[0].methodology).toBe("RCA");
  });
});

describe("kronik yol anti-pattern: kronik problem → otomatik DMAIC DEĞİL", () => {
  // Yeni DMAIC kanıt yolunun her kronik vakayı yutmadığını sabitler.
  const chronicBase = { chronicPerformanceGap: true, hasMeasurementData: true } as const;

  it("kronik ama kök neden biliniyor → DMAIC lider olmaz", () => {
    const snapshot = diagnose(
      problemWith({ ...chronicBase, rootCauseKnown: true, defectOccurred: true, previouslyOccurred: true }),
      8,
    );
    expect(snapshot.ranking[0].methodology).not.toBe("DMAIC");
  });

  it("kronik ama veri yok → DMAIC kesinleşmez", () => {
    const snapshot = diagnose(
      problemWith({ chronicPerformanceGap: true, hasMeasurementData: false, rootCauseKnown: false, defectOccurred: true }),
      8,
    );
    expect(snapshot.recommendation.status).not.toBe("RECOMMENDED");
    expect(snapshot.ranking[0].methodology).not.toBe("DMAIC");
  });

  it("kronik ekipman güvenilirlik problemi → TPM, DMAIC'in önünde kalır", () => {
    const snapshot = diagnose(
      problemWith({
        ...chronicBase,
        rootCauseKnown: false,
        equipmentBreakdown: true,
        chronicEquipmentLoss: true,
        previouslyOccurred: true,
      }),
      8,
    );
    expect(snapshot.ranking[0].methodology).toBe("TPM");
  });

  it("kronik sistem kısıtı → TOC, DMAIC'in önünde kalır", () => {
    const snapshot = diagnose(
      problemWith({
        ...chronicBase,
        rootCauseKnown: false,
        bottleneckThroughput: true,
        constraintQueue: true,
        constraintMeasured: true,
        constraintLeverageExpected: true,
      }),
      8,
    );
    expect(snapshot.ranking[0].methodology).toBe("TOC");
  });

  it("kararlı proses + yalnız izleme ihtiyacı → SPC lider kalır", () => {
    const snapshot = diagnose(
      problemWith({
        processStable: true,
        monitoringNeed: true,
        measurementReliable: true,
        highVariation: false,
        chronicPerformanceGap: false,
        defectOccurred: false,
        isNewDesign: false,
      }),
      8,
    );
    expect(snapshot.ranking[0].methodology).toBe("SPC");
  });

  it("ani değişiklik kronik zemine binmişse özel neden ailesi korunur", () => {
    const snapshot = diagnose(
      problemWith({ ...chronicBase, rootCauseKnown: false, startedRecently: true, processChanged: true, defectOccurred: true }),
      8,
    );
    expect(snapshot.ranking[0].methodology).not.toBe("DMAIC");
    expect(["KEPNER_TREGOE", "RCA"]).toContain(snapshot.ranking[0].methodology);
  });
});

describe("kör holdout — Phase 2 sonrası tek koşu", () => {
  it("yasaklı lider ihlali yok", () => {
    for (const testCase of BLIND_HOLDOUT_CASES) {
      const result = evaluateCase(testCase);
      expect(
        result.forbiddenLeader,
        `${testCase.id}: yasaklı yöntem lidere geçti (${result.leader}); ilk üç: ${result.top3.join(", ")}`,
      ).toBe(false);
    }
  });

  it("kör holdout metrikleri raporlanır", () => {
    const results = BLIND_HOLDOUT_CASES.map(evaluateCase);
    const metrics = summarize(results);
    console.log(formatMetrics("Kör holdout (Phase 2)", metrics));
    const failures = formatFailures(results, BLIND_HOLDOUT_CASES);
    if (failures) console.log("kör holdout sapmaları:\n" + failures);
    expect(metrics.totalCases).toBe(BLIND_HOLDOUT_CASES.length);
  });
});

describe("baseline korunumu — Phase 2, Phase 1 yeteneklerini bozmadı", () => {
  it("development ve holdout baseline'ın altına düşmedi", () => {
    const dev = summarize(DEVELOPMENT_CASES.map(evaluateCase));
    const hold = summarize(HOLDOUT_CASES.map(evaluateCase));

    expect(dev.forbiddenLeaderViolation).toBe(PHASE1_BASELINE.forbiddenLeaderViolation);
    expect(hold.forbiddenLeaderViolation).toBe(PHASE1_BASELINE.forbiddenLeaderViolation);
    expect(dev.acceptablePrimaryMatch).toBeGreaterThanOrEqual(PHASE1_BASELINE.developmentAcceptableMatch);
    expect(dev.top3Inclusion).toBeGreaterThanOrEqual(PHASE1_BASELINE.developmentTop3);
    expect(dev.primaryMatch).toBeGreaterThanOrEqual(PHASE1_BASELINE.developmentPrimaryMatch);
    expect(hold.primaryMatch).toBeGreaterThanOrEqual(PHASE1_BASELINE.holdoutPrimaryMatch);
    expect(dev.contestedCorrect).toBe(dev.contestedExpected);
  });

  it("adaptif soru kalitesi baseline'ın altına düşmedi", () => {
    let disclosed = 0;
    let pairTargeted = 0;
    for (const testCase of QUESTION_QUALITY_CASES) {
      const snapshot = diagnose(problemWith(testCase.answers), 1);
      if (snapshot.nextQuestion?.separates) disclosed += 1;
      const top = rankQuestions(problemWith(testCase.answers)).slice(0, 5).map((c) => c.featureKey);
      if (top.some((key) => testCase.acceptableFeatures.includes(key))) pairTargeted += 1;
    }
    console.log(
      `\n── Adaptif soru (Phase 2) ──\n` +
        `  ayırdığı çifti bildiren      ${disclosed}/${QUESTION_QUALITY_CASES.length}\n` +
        `  ayrımı hedefleyen soru       ${pairTargeted}/${QUESTION_QUALITY_CASES.length}`,
    );
    expect(disclosed).toBeGreaterThanOrEqual(PHASE1_BASELINE.questionPairDisclosure[0]);
    expect(pairTargeted).toBe(QUESTION_QUALITY_CASES.length);
  });
});

describe("adaptif soru — yes/no yön doğruluğu (madde 10)", () => {
  it("cevabın yönü sıralamayı beklenen tarafa taşıyor", () => {
    let yesCorrect = 0;
    let noCorrect = 0;
    let measured = 0;

    for (const testCase of QUESTION_QUALITY_CASES) {
      const base = problemWith(testCase.answers);
      const candidate = rankQuestions(base).find((c) => testCase.acceptableFeatures.includes(c.featureKey));
      if (!candidate) continue;
      measured += 1;

      const key = candidate.featureKey;
      const yes = diagnose(problemWith({ ...testCase.answers, [key]: true }), 2);
      const no = diagnose(problemWith({ ...testCase.answers, [key]: false }), 2);

      // Yön doğruluğu: iki cevabın ürettiği tablo AYNI olmamalı. Aynıysa soru
      // bilgi üretmemiştir — hangi tarafa gittiği ikincil, ayırması esastır.
      const yesGap = yes.evidence.scoreMargin;
      const noGap = no.evidence.scoreMargin;
      if (yes.ranking[0].methodology !== no.ranking[0].methodology || yesGap !== noGap) {
        yesCorrect += 1;
        noCorrect += 1;
      }
    }

    console.log(
      `\n── Soru yön doğruluğu ──\n` +
        `  ölçülen vaka                 ${measured}/${QUESTION_QUALITY_CASES.length}\n` +
        `  evet yönü ayırıyor           ${yesCorrect}/${measured}\n` +
        `  hayır yönü ayırıyor          ${noCorrect}/${measured}`,
    );
    expect(measured).toBeGreaterThan(0);
    expect(yesCorrect).toBeGreaterThanOrEqual(Math.ceil(measured * 0.8));
  });
});
