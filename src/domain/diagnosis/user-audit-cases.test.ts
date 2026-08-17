import { describe, expect, it } from "vitest";
import { KeywordProblemParser } from "@/infrastructure/parser/keyword-problem-parser";
import { createEmptyProblem, type DiagnosticFeatureKey, withFeature } from "./features";
import { diagnose } from "./diagnose";
import type { Methodology } from "./methodologies";

type AuditCase = {
  name: string;
  text: string;
  expected: Methodology;
  answers: Partial<Record<DiagnosticFeatureKey, boolean>>;
  maxQuestions: number;
};

async function runAuditCase(testCase: AuditCase) {
  const parsed = await new KeywordProblemParser().parseInitial(testCase.text);
  let problem = createEmptyProblem();
  problem.problemDescription = parsed.problemDescription;
  problem.processName = parsed.processName;
  for (const [key, value] of Object.entries(parsed.features)) {
    if (value !== undefined) problem = withFeature(problem, key as DiagnosticFeatureKey, value);
  }

  const asked: DiagnosticFeatureKey[] = [];
  for (let index = 0; index < 20; index += 1) {
    const snapshot = diagnose(problem, asked.length);
    if (!snapshot.nextQuestion) return { snapshot, asked, problem };
    const key = snapshot.nextQuestion.featureKey;
    asked.push(key);
    problem = withFeature(problem, key, testCase.answers[key] ?? false);
  }
  return { snapshot: diagnose(problem, asked.length), asked, problem };
}

const cases: AuditCase[] = [
  {
    name: "müşteriye ulaşmış ve geçici koruma gereken çatlak",
    text: "Otomotiv müşterisine ulaşan kaynak çatlağı tekrar etti; kök neden bilinmiyor ve acil ayıklama gerekiyor.",
    expected: "EIGHT_D",
    answers: { defectOccurred: true, customerAffected: true, externalNonconformance: true, containmentNeeded: true, hasMeasurementData: true, humanErrorProne: false },
    maxQuestions: 8,
  },
  {
    name: "kronik ve ölçülebilir varyasyon",
    text: "Dolum ağırlığı aylardır yüksek değişkenlik gösteriyor; doğrulanmış ölçüm sistemimiz ve karşılaştırma verimiz var.",
    expected: "DMAIC",
    answers: { processStable: false, monitoringNeed: false, standardWorkEstablished: true },
    maxQuestions: 8,
  },
  {
    name: "yeni tedarikçiyle gelecekteki proses riski",
    text: "Mevcut montaj prosesinde yeni bir yapıştırıcı tedarikçisine geçilecek. Henüz hata yaşanmadı; açık bekleme süresi ve operatör uygulaması değişirse oluşabilecek riskleri önceden değerlendirmek istiyoruz.",
    expected: "FMEA",
    answers: { defectOccurred: false, supplierChanged: true, failureModeKnown: true, potentialEffectKnown: true, controlAdequacyUncertain: true, humanErrorProne: true, safetyOrRegulatory: true, standardWorkEstablished: true, basicConditionsStable: true },
    maxQuestions: 8,
  },
  {
    name: "kronik ekipman kaybı",
    text: "Paketleme makinesindeki kısa duruşlar aylardır tekrarlıyor; OEE ve bakım kayıtları mevcut.",
    expected: "TPM",
    answers: { chronicEquipmentLoss: true, standardWorkEstablished: false, isImprovementInitiative: false },
    maxQuestions: 8,
  },
  {
    name: "sayısal olarak doğrulanmış sistem kısıtı",
    text: "Boyahane fırını tek kapasite kısıtı; önünde kuyruk oluşuyor, diğer istasyonlar boş kalıyor ve kapasite ile talep verileri karşılaştırıldı.",
    expected: "TOC",
    answers: { flowOrWaste: true, measurementReliable: true, equipmentBreakdown: false },
    maxQuestions: 8,
  },
  {
    name: "zorunlu ve ağırlıklı kriterli yatırım kararı",
    text: "İki CNC tezgâhı teklifi arasında seçim yapacağız. Emniyet ve tolerans zorunlu kriter; maliyet, servis, çevrim süresi ve teslim tarihi ağırlıklı tercih kriterleri olacak. Henüz arıza yok.",
    expected: "KT_DECISION",
    answers: { decisionOwnerKnown: true, hasMeasurementData: true, safetyOrRegulatory: true },
    maxQuestions: 7,
  },
];

describe("dokümansız son kullanıcı golden vakaları", () => {
  for (const testCase of cases) {
    it(`${testCase.name} doğru yönteme makul soru bütçesinde gider`, async () => {
      const result = await runAuditCase(testCase);
      expect(result.snapshot.ranking[0].methodology).toBe(testCase.expected);
      expect(result.asked.length).toBeGreaterThanOrEqual(3);
      expect(result.asked.length).toBeLessThanOrEqual(testCase.maxQuestions);
      expect(new Set(result.asked).size).toBe(result.asked.length);
    });
  }

  it("karar vakasında ilgisiz arıza ve 5S soruları sorulmaz", async () => {
    const result = await runAuditCase(cases[5]);
    expect(result.asked).not.toContain("workplaceDisorganized");
    expect(result.asked).not.toContain("equipmentBreakdown");
    expect(result.asked).not.toContain("externalNonconformance");
  });
});
