// Ayrım (discrimination) regresyon paketi.
//
// Bu dosya "doğru cevabı buldu mu?" sorusunu değil, onun ikizini sorar:
// **yanlış yöntem gereksiz yere tetikleniyor mu?** Yüzeyde benzeyen yöntem
// çiftlerinin her biri için iki yönlü bir vaka çifti tutulur — biri yöntemi
// hak eden, diğeri onu hak ETMEYEN. Ağırlıklar kalibre edilirken bu paket
// kalkandır: bir yöntemin puanını yükseltmek, ikizinin negatif vakasını
// bozmadan yapılmalıdır.

import { describe, it, expect } from "vitest";
import { problemWith, type DiagnosticFeatureKey, type Ternary } from "./features";
import { evaluateRules } from "./rule-engine";
import { computeConfidence } from "./confidence-engine";
import { diagnose } from "./diagnose";
import type { Methodology } from "./methodologies";

type Features = Partial<Record<DiagnosticFeatureKey, Ternary>>;

const ranking = (f: Features) => computeConfidence(evaluateRules(problemWith(f)).scores);
const leader = (f: Features): Methodology => ranking(f)[0].methodology;
/** Bir yöntemin sıralamadaki yeri (0 = birinci). */
const rankOf = (f: Features, m: Methodology) =>
  ranking(f).findIndex((r) => r.methodology === m);

describe("8D — müşteri etkisi tek başına yeterli değildir", () => {
  it("müşteriye ulaşan tekil hata, kök neden biliniyor ve koruma gerekmiyorsa 8D seçtirmez", () => {
    const f: Features = {
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      rootCauseKnown: true,
      containmentNeeded: false,
      previouslyOccurred: false,
    };
    expect(leader(f)).not.toBe("EIGHT_D");
  });

  it("müşteri etkisi var ama koruma da tekrar da yoksa 8D öne çıkmaz", () => {
    const f: Features = {
      defectOccurred: true,
      customerAffected: true,
      containmentNeeded: false,
      previouslyOccurred: false,
      rootCauseKnown: false,
    };
    expect(leader(f)).not.toBe("EIGHT_D");
  });

  it("müşteriye ulaşmış uygunsuzluk + koruma ihtiyacı + bilinmeyen neden + tekrar → 8D", () => {
    const f: Features = {
      defectOccurred: true,
      customerAffected: true,
      externalNonconformance: true,
      containmentNeeded: true,
      rootCauseKnown: false,
      previouslyOccurred: true,
    };
    expect(leader(f)).toBe("EIGHT_D");
  });
});

describe("TPM — tekil arıza bir bakım sistemi gerektirmez", () => {
  it("ilk kez yaşanan tekil ekipman arızası TPM'i kesinleştirmez", () => {
    const f: Features = {
      defectOccurred: true,
      equipmentBreakdown: true,
      chronicEquipmentLoss: false,
      previouslyOccurred: false,
      rootCauseKnown: false,
    };
    expect(leader(f)).not.toBe("TPM");
  });

  it("kronik plansız duruş + tekrar eden arıza → TPM", () => {
    const f: Features = {
      equipmentBreakdown: true,
      chronicEquipmentLoss: true,
      previouslyOccurred: true,
    };
    expect(leader(f)).toBe("TPM");
  });
});

describe("TOC ↔ Lean/VSM — dağınık israf ile baskın kısıt aynı şey değildir", () => {
  it("kapasite kısıtı sayısal doğrulanmış + önünde kuyruk + sonrasında açlık → TOC", () => {
    const f: Features = {
      bottleneckThroughput: true,
      constraintQueue: true,
      downstreamStarvation: true,
      constraintMeasured: true,
      constraintLeverageExpected: true,
      flowOrWaste: true,
    };
    expect(leader(f)).toBe("TOC");
  });

  it("akış kaybı var ama kuyruk da açlık da yok → TOC otomatik seçilmez, VSM öne çıkar", () => {
    const f: Features = {
      flowOrWaste: true,
      constraintQueue: false,
      downstreamStarvation: false,
      hasMeasurementData: true,
    };
    expect(leader(f)).toBe("LEAN_VSM");
  });

  it("temin süresinin büyük kısmı bekleme/stok ise VSM güçlenir", () => {
    const f: Features = { flowOrWaste: true, hasMeasurementData: true, isImprovementInitiative: true };
    expect(leader(f)).toBe("LEAN_VSM");
  });
});

describe("SPC ↔ DMAIC — izlemek ile nedeni bulmak farklı işlerdir", () => {
  it("kararlı proses + izleme ihtiyacı + güvenilir ölçüm → SPC", () => {
    const f: Features = {
      processStable: true,
      monitoringNeed: true,
      measurementReliable: true,
      highVariation: false,
    };
    expect(leader(f)).toBe("SPC");
  });

  it("kararlı ve varyasyonu sorun olmayan proseste DMAIC gereksiz yere öne çıkmaz", () => {
    const f: Features = { processStable: true, monitoringNeed: true, highVariation: false };
    expect(leader(f)).not.toBe("DMAIC");
  });

  it("kronik yüksek varyasyon + veri var + neden bilinmiyor → DMAIC", () => {
    const f: Features = {
      hasMeasurementData: true,
      highVariation: true,
      rootCauseKnown: false,
      measurementReliable: true,
      startedRecently: false,
    };
    expect(leader(f)).toBe("DMAIC");
  });

  it("nedeni bilinmeyen kronik kötü performansta tek başına SPC yetersizdir", () => {
    const f: Features = { hasMeasurementData: true, highVariation: true, rootCauseKnown: false };
    expect(leader(f)).not.toBe("SPC");
  });

  it("ani değişiklik sonrası sapma DMAIC'e değil, sapma analizine gider", () => {
    const f: Features = {
      defectOccurred: true,
      startedRecently: true,
      processChanged: true,
      hasMeasurementData: true,
      rootCauseKnown: false,
    };
    expect(leader(f)).not.toBe("DMAIC");
    expect(["KEPNER_TREGOE", "RCA"]).toContain(leader(f));
  });
});

describe("PDCA ↔ SDCA — iyileştirmeden önce stabilizasyon", () => {
  it("standart iş yok ve temel koşullar oturmamışsa SDCA, PDCA'nın önüne geçer", () => {
    const f: Features = {
      isImprovementInitiative: true,
      standardWorkEstablished: false,
      basicConditionsStable: false,
    };
    expect(leader(f)).toBe("SDCA");
    expect(rankOf(f, "SDCA")).toBeLessThan(rankOf(f, "PDCA_A3"));
  });

  it("standart, temel koşul ve kararlılık doğrulanmışsa iyileştirme PDCA'ya döner", () => {
    const f: Features = {
      isImprovementInitiative: true,
      standardWorkEstablished: true,
      basicConditionsStable: true,
      processStable: true,
      defectOccurred: false,
    };
    expect(leader(f)).toBe("PDCA_A3");
  });
});

describe("FMEA ↔ DMADV — mevcut proses riski ile yeni tasarım", () => {
  it("mevcut proseste değişiklik kaynaklı risk → FMEA, DMADV değil", () => {
    const f: Features = {
      defectOccurred: false,
      isNewDesign: false,
      processChanged: true,
      potentialEffectKnown: true,
      controlAdequacyUncertain: true,
    };
    expect(leader(f)).toBe("FMEA");
    expect(rankOf(f, "DMADV")).toBeGreaterThan(rankOf(f, "FMEA"));
  });

  it("sıfırdan yeni ürün/proses tasarımı → DMADV", () => {
    const f: Features = { isNewDesign: true, defectOccurred: false, hasMeasurementData: true };
    expect(leader(f)).toBe("DMADV");
  });
});

describe("KT Karar — teşhis ile seçim aynı problem tipi değildir", () => {
  it("tanımlı alternatifler + kriterler → KT Karar", () => {
    const f: Features = {
      decisionBetweenOptions: true,
      multipleAlternativesDefined: true,
      mandatoryCriteriaDefined: true,
      preferenceCriteriaDefined: true,
      unresolvedCauseBeforeDecision: false,
    };
    expect(leader(f)).toBe("KT_DECISION");
  });

  it("seçimden önce çözülmesi gereken bilinmeyen neden varsa önce teşhis gelir", () => {
    const f: Features = {
      decisionBetweenOptions: true,
      multipleAlternativesDefined: true,
      unresolvedCauseBeforeDecision: true,
      rootCauseKnown: false,
    };
    expect(leader(f)).not.toBe("KT_DECISION");
  });
});

describe("sıralama (ranking) regresyonu — yalnız birinci sıra değil", () => {
  it("kronik ölçü varyasyonu vakasında DMAIC birinci, RCA ilk beşte, SPC arkada kalır", () => {
    const f: Features = {
      hasMeasurementData: true,
      highVariation: true,
      measurementReliable: true,
      rootCauseKnown: false,
      startedRecently: false,
      defectOccurred: true,
    };
    expect(leader(f)).toBe("DMAIC");
    expect(rankOf(f, "RCA")).toBeLessThan(5);
    expect(rankOf(f, "SPC")).toBeGreaterThan(rankOf(f, "DMAIC"));
  });

  it("kısıt vakasında TOC birinci, Lean/VSM geride ama elenmemiş kalır", () => {
    const f: Features = {
      bottleneckThroughput: true,
      constraintQueue: true,
      constraintMeasured: true,
      constraintLeverageExpected: true,
      flowOrWaste: true,
    };
    expect(leader(f)).toBe("TOC");
    expect(rankOf(f, "LEAN_VSM")).toBeGreaterThan(0);
    expect(rankOf(f, "LEAN_VSM")).toBeLessThan(6);
  });
});

describe("yeterli kanıt yoksa sistem kesin sonuç üretmez", () => {
  it("tek sinyalle başlayan vaka doğrulanmış sayılmaz", () => {
    const snapshot = diagnose(problemWith({ defectOccurred: true }), 0);
    expect(snapshot.evidence.status).not.toBe("CONFIRMED");
    expect(snapshot.nextQuestion).not.toBeNull();
  });

  it("soru bütçesi biterken kanıt tamamlanmadıysa sonuç INCONCLUSIVE olur", () => {
    const snapshot = diagnose(problemWith({ defectOccurred: true, customerAffected: true }), 12);
    expect(snapshot.concluded).toBe(true);
    expect(snapshot.evidence.status).toBe("INCONCLUSIVE");
  });
});
