import { describe, it, expect } from "vitest";
import { analyzeDecision, type DecisionCriterion, type DecisionOption } from "./decision-analysis";

const criteria: DecisionCriterion[] = [
  { id: "leadtime", label: "Teslim ≤ 4 hafta", kind: "MUST" },
  { id: "cert", label: "ISO/IATF sertifikalı", kind: "MUST" },
  { id: "cost", label: "Maliyet avantajı", kind: "WANT", weight: 8 },
  { id: "quality", label: "Kalite geçmişi", kind: "WANT", weight: 10 },
  { id: "capacity", label: "Kapasite esnekliği", kind: "WANT", weight: 5 },
];

describe("decision-analysis — KT MUST/WANT motoru", () => {
  it("bir MUST'ı karşılamayan alternatif, WANT puanı yüksek olsa bile elenir", () => {
    const options: DecisionOption[] = [
      // A: en iyi WANT puanları ama sertifikasız → elenmeli
      { id: "A", label: "Tedarikçi A", scores: { leadtime: true, cert: false, cost: 10, quality: 10, capacity: 10 } },
      { id: "B", label: "Tedarikçi B", scores: { leadtime: true, cert: true, cost: 6, quality: 7, capacity: 5 } },
    ];
    const r = analyzeDecision(criteria, options);
    const a = r.ranked.find((e) => e.option.id === "A")!;
    expect(a.eliminated).toBe(true);
    expect(a.failedMusts).toContain("ISO/IATF sertifikalı");
    expect(r.recommended?.option.id).toBe("B");
  });

  it("elenmeyenler arasında en yüksek ağırlıklı WANT skoru önerilir", () => {
    const options: DecisionOption[] = [
      { id: "B", label: "Tedarikçi B", scores: { leadtime: true, cert: true, cost: 6, quality: 7, capacity: 5 } },
      { id: "C", label: "Tedarikçi C", scores: { leadtime: true, cert: true, cost: 8, quality: 9, capacity: 6 } },
    ];
    const r = analyzeDecision(criteria, options);
    expect(r.recommended?.option.id).toBe("C");
    // C her WANT'ta B'den yüksek → normalize skoru da yüksek olmalı.
    expect(r.ranked[0].normalized).toBeGreaterThan(r.ranked[1].normalized);
  });

  it("dar farkta karar 'kırılgan' işaretlenir ve trace uyarır", () => {
    const options: DecisionOption[] = [
      { id: "B", label: "Tedarikçi B", scores: { leadtime: true, cert: true, cost: 7, quality: 8, capacity: 5 } },
      { id: "C", label: "Tedarikçi C", scores: { leadtime: true, cert: true, cost: 7, quality: 8, capacity: 6 } },
    ];
    const r = analyzeDecision(criteria, options);
    expect(r.close).toBe(true);
    expect(r.trace.some((t) => t.toLocaleLowerCase("tr").includes("kırılgan"))).toBe(true);
  });

  it("hiçbir alternatif MUST'ları karşılamazsa öneri yok, trace açıklar", () => {
    const options: DecisionOption[] = [
      { id: "A", label: "Tedarikçi A", scores: { leadtime: false, cert: true, cost: 9, quality: 9, capacity: 9 } },
    ];
    const r = analyzeDecision(criteria, options);
    expect(r.recommended).toBeNull();
    expect(r.trace.join(" ")).toContain("zorunlu");
  });

  it("MUST değeri bilinmiyorsa elenmez ama 'doğrulanmamış' olarak işaretlenir", () => {
    const options: DecisionOption[] = [
      { id: "B", label: "Tedarikçi B", scores: { leadtime: true, cert: null, cost: 6, quality: 7, capacity: 5 } },
    ];
    const r = analyzeDecision(criteria, options);
    expect(r.recommended?.option.id).toBe("B");
    expect(r.recommended?.unverifiedMusts).toContain("ISO/IATF sertifikalı");
  });
});
