// Anti-pattern suite — motorun ASLA yapmaması gereken kısayollar.
//
// Bir karar destek sisteminin en kolay düştüğü tuzak, tek bir anahtar sinyalden
// yönteme atlamaktır:
//
//   müşteri etkisi  → 8D
//   makine arızası  → TPM
//   varyasyon       → DMAIC
//   ara stok        → VSM
//   yeni proses     → DMADV
//   iyileştirme     → PDCA
//
// Bu kısayollar tek tek makul görünür ve sahada sürekli yapılır; sistemin
// değeri tam olarak bunları YAPMAMASINDA. Buradaki testler iki şeyi ayırır:
//   (a) tek sinyal yanlış yöntemi LİDER yapmamalı,
//   (b) tek sinyal — doğru aileyi işaret etse bile — KESİN karar verdirmemeli.

import { describe, it, expect } from "vitest";
import { problemWith, type DiagnosticFeatureKey } from "../features";
import { evaluateRules } from "../rule-engine";
import { computeConfidence } from "../confidence-engine";
import { diagnose } from "../diagnose";

const leaderOf = (key: DiagnosticFeatureKey, value: boolean = true) =>
  computeConfidence(evaluateRules(problemWith({ [key]: value })).scores)[0].methodology;

describe("anti-pattern: tek sinyal yanlış yöntemi lidere taşımamalı", () => {
  it("müşteri etkisi tek başına 8D seçtirmez", () => {
    expect(leaderOf("customerAffected")).not.toBe("EIGHT_D");
  });

  it("gerçekleşmiş hata tek başına 8D seçtirmez", () => {
    expect(leaderOf("defectOccurred")).not.toBe("EIGHT_D");
  });

  it("ekipman arızası tek başına TPM seçtirmez", () => {
    expect(leaderOf("equipmentBreakdown")).not.toBe("TPM");
  });

  it("ölçüm verisinin varlığı tek başına DMAIC seçtirmez", () => {
    expect(leaderOf("hasMeasurementData")).not.toBe("DMAIC");
  });

  it("kısıt kelimesi olmadan akış kaybı TOC seçtirmez", () => {
    expect(leaderOf("flowOrWaste")).not.toBe("TOC");
  });

  it("kök nedenin bilinmesi RCA'yı lider yapmaz", () => {
    expect(leaderOf("rootCauseKnown", true)).not.toBe("RCA");
  });

  it("standart iş varlığı tek başına SDCA seçtirmez", () => {
    expect(leaderOf("standardWorkEstablished", true)).not.toBe("SDCA");
  });

  it("proses kararlılığı tek başına SPC'yi doğrulamaz", () => {
    // Kararlı olmak izleme İHTİYACI anlamına gelmez.
    const snapshot = diagnose(problemWith({ processStable: true }), 8);
    expect(snapshot.evidence.status).not.toBe("CONFIRMED");
  });
});

describe("anti-pattern: tek sinyal kesin karar verdirmemeli", () => {
  // Aşağıdaki sinyaller doğru AİLEYİ işaret eder; sorun ailede değil,
  // tek bir sinyalle sonucu kapatmakta.
  const singleSignals: DiagnosticFeatureKey[] = [
    "customerAffected",
    "equipmentBreakdown",
    "highVariation",
    "flowOrWaste",
    "isNewDesign",
    "isImprovementInitiative",
    "bottleneckThroughput",
    "workplaceDisorganized",
    "monitoringNeed",
    "humanErrorProne",
  ];

  for (const signal of singleSignals) {
    it(`'${signal}' tek başına doğrulanmış sonuç üretmez`, () => {
      const snapshot = diagnose(problemWith({ [signal]: true }), 0);
      expect(snapshot.evidence.status, `${signal}: tek sinyalle doğrulandı`).not.toBe("CONFIRMED");
      expect(snapshot.nextQuestion, `${signal}: ayırt edici soru sorulmalı`).not.toBeNull();
      expect(
        snapshot.evidence.supportingSignals,
        `${signal}: tek sinyalden bağımsız destek türetilmemeli`,
      ).toBeLessThan(3);
    });
  }
});

describe("anti-pattern: çakışma yalnız skorlar yakın diye ilan edilmez", () => {
  it("kurallarca bastırılmış bir yöntem 'eş geçerli ikinci yaklaşım' sayılmaz", () => {
    // Kök nedeni bilinen, koruma gerektirmeyen tekil müşteri hatası: 8D'nin
    // POZİTİF puanı yüksektir (uygunsuzluk müşteriye ulaştı) ama net puanı
    // kurallarca çökertilmiştir. Bu durumda 8D çakışan sinyal olarak sunulamaz.
    const snapshot = diagnose(
      problemWith({
        defectOccurred: true,
        customerAffected: true,
        externalNonconformance: true,
        rootCauseKnown: true,
        failureModeKnown: true,
        humanErrorProne: true,
        previouslyOccurred: false,
        containmentNeeded: false,
      }),
      8,
    );
    const contestedCodes = snapshot.contested?.sides.map((side) => side.methodology) ?? [];
    expect(contestedCodes).not.toContain("EIGHT_D");
  });

  it("liderle aynı bağlamdan doğan tek boyutlu destek çakışma sayılmaz", () => {
    // Kararlı ve yeterli proseste 'henüz hata yok' olgusu FMEA'ya pozitif puan
    // verir; ama bu, ayrı bir problem karakteri değil liderin bağlamının yan
    // ürünüdür. FMEA kendi kanıt profilinden yalnız tek boyut karşılar.
    const snapshot = diagnose(
      problemWith({
        processStable: true,
        monitoringNeed: true,
        measurementReliable: true,
        highVariation: false,
        defectOccurred: false,
        customerAffected: false,
        isNewDesign: false,
      }),
      8,
    );
    expect(snapshot.contested).toBeNull();
  });
});

describe("anti-pattern: soru turu boş sorularla harcanmaz", () => {
  it("hata oluşmuşken 'yeni tasarım mı?' sorulmaz", () => {
    const snapshot = diagnose(problemWith({ defectOccurred: true }), 0);
    expect(snapshot.nextQuestion?.featureKey).not.toBe("isNewDesign");
  });

  it("karar bağlamı yokken karar analizi alanları sorulmaz", () => {
    const snapshot = diagnose(problemWith({ defectOccurred: true, equipmentBreakdown: true }), 0);
    const decisionOnly = [
      "multipleAlternativesDefined",
      "mandatoryCriteriaDefined",
      "preferenceCriteriaDefined",
      "decisionOwnerKnown",
      "unresolvedCauseBeforeDecision",
    ];
    expect(decisionOnly).not.toContain(snapshot.nextQuestion?.featureKey);
  });
});
