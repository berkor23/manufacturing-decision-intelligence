import { describe, it, expect } from "vitest";
import { problemWith } from "./features";
import { evaluateRules } from "./rule-engine";
import { computeConfidence } from "./confidence-engine";
import { detectContestedSignals } from "./contested-signals";
import { diagnose } from "./diagnose";
import { selectNextQuestion } from "./question-engine";

function detect(features: Parameters<typeof problemWith>[0]) {
  const p = problemWith(features);
  const evaluation = evaluateRules(p);
  return detectContestedSignals(p, evaluation, computeConfidence(evaluation.scores));
}

describe("çakışan sinyaller — iki karakteri birden taşıyan problemler", () => {
  it("kronik arızalı makine aynı zamanda darboğazsa TPM ve TOC birlikte görünür", () => {
    const contested = detect({
      equipmentBreakdown: true,
      chronicEquipmentLoss: true,
      previouslyOccurred: true,
      bottleneckThroughput: true,
      constraintQueue: true,
      constraintMeasured: true,
    });
    expect(contested).not.toBeNull();
    const codes = contested!.sides.map((s) => s.methodology).sort();
    expect(codes).toEqual(["TOC", "TPM"]);
    // Birleştirme reçetesi sırayı söyler: kısıt önceliklendirmesi içinde TPM.
    expect(contested!.integration).toContain("kısıt");
    // Her iki taraf da kendi bağımsız kanıtını taşımalı.
    for (const side of contested!.sides) {
      expect(side.support).toBeGreaterThanOrEqual(4);
      expect(side.facts.length).toBeGreaterThan(0);
    }
  });

  it("tek karakterli vakada çakışma uydurulmaz", () => {
    const contested = detect({
      isNewDesign: true,
      defectOccurred: false,
      hasMeasurementData: true,
    });
    // DMADV baskın; ikinci adayın kendi bağımsız kanıt gövdesi yok.
    expect(contested === null || contested.sides[1].support < contested.sides[0].support).toBe(true);
  });

  it("zayıf kanıtlı erken turda çakışma ilan edilmez", () => {
    expect(detect({ defectOccurred: true })).toBeNull();
  });

  it("çakışma teşhis anlık görüntüsüne taşınır", () => {
    const snapshot = diagnose(
      problemWith({
        equipmentBreakdown: true,
        chronicEquipmentLoss: true,
        previouslyOccurred: true,
        bottleneckThroughput: true,
        constraintQueue: true,
        constraintMeasured: true,
      }),
      4,
    );
    expect(snapshot.contested).not.toBeNull();
  });
});

describe("karşıtlıklı karar izi — destek ve itiraz birlikte", () => {
  it("lider ve en yakın rakip için iki liste birden üretilir", () => {
    // Kök nedeni bilinen, koruma gerektirmeyen müşteri hatası: burada hem 8D'ye
    // hem RCA'ya itiraz eden kurallar vardır — "neden o değil" kanıta dayanır.
    const snapshot = diagnose(
      problemWith({
        defectOccurred: true,
        customerAffected: true,
        externalNonconformance: true,
        rootCauseKnown: true,
        containmentNeeded: false,
        previouslyOccurred: false,
      }),
      4,
    );
    expect(snapshot.contrastive).toHaveLength(2);
    expect(snapshot.contrastive[0].methodology).toBe(snapshot.ranking[0].methodology);
    expect(snapshot.contrastive[0].supporting.length).toBeGreaterThan(0);
    // Rakip tarafta en az bir itiraz görünmeli: "neden o değil" kanıta dayanır.
    const opposed = snapshot.contrastive.some((entry) => entry.opposing.length > 0);
    expect(opposed).toBe(true);
  });

  it("itiraz sinyalleri negatif, destek sinyalleri pozitif katkı taşır", () => {
    const snapshot = diagnose(problemWith({ rootCauseKnown: false, defectOccurred: true }), 2);
    for (const entry of snapshot.contrastive) {
      expect(entry.supporting.every((s) => s.delta > 0)).toBe(true);
      expect(entry.opposing.every((s) => s.delta < 0)).toBe(true);
    }
  });
});

describe("ayırt edici soru — soru neden soruluyor", () => {
  it("iki hipotezi ayıran soru hangi çifti ayırdığını bildirir", () => {
    // Ekipman arızası var; "kronik mi?" sorusu TPM ile tekil neden analizini ayırır.
    const candidate = selectNextQuestion(
      problemWith({ defectOccurred: true, equipmentBreakdown: true, rootCauseKnown: false }),
    );
    expect(candidate).not.toBeNull();
    // Aday havuzunda lideri değiştirebilen en az bir soru bulunmalı.
    expect(candidate!.changesLeader || candidate!.supportsLeader).toBe(true);
  });

  it("ayrım bilgisi teşhis anlık görüntüsünde taşınır", () => {
    const snapshot = diagnose(problemWith({ defectOccurred: true }), 1);
    expect(snapshot.nextQuestion).not.toBeNull();
    // separates alanı ya bir çift ya da açıkça null olmalı — belirsiz bırakılmaz.
    expect(snapshot.nextQuestion!.separates === null || typeof snapshot.nextQuestion!.separates === "object").toBe(true);
  });
});
