import { describe, it, expect } from "vitest";
import { COMPLEMENTARY, nextMethodologies, closeAlternatives } from "./sequence";
import { METHODOLOGIES } from "./methodologies";
import { computeConfidence } from "./confidence-engine";
import { evaluateRules } from "./rule-engine";
import { problemWith } from "./features";

describe("sequence — tamamlayıcılık haritası bütünlüğü", () => {
  it("tüm metodolojiler haritada ve en az 1 takipçisi var", () => {
    for (const m of METHODOLOGIES) {
      expect(COMPLEMENTARY[m], `eksik: ${m}`).toBeDefined();
      expect(nextMethodologies(m).length, `takipçisiz: ${m}`).toBeGreaterThan(0);
    }
  });

  it("hiçbir metodoloji kendini takipçi göstermez ve kodlar geçerlidir", () => {
    const valid = new Set(METHODOLOGIES);
    for (const m of METHODOLOGIES) {
      const codes = nextMethodologies(m).map((l) => l.code);
      expect(codes, `kendine referans: ${m}`).not.toContain(m);
      for (const c of codes) expect(valid.has(c), `geçersiz kod ${c} (${m})`).toBe(true);
      // Aynı takipçi iki kez listelenmesin
      expect(new Set(codes).size).toBe(codes.length);
      // Her bağın gerekçesi dolu
      for (const l of nextMethodologies(m)) expect(l.reason.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("sequence — closeAlternatives", () => {
  it("lider baskınsa yakın alternatif YOK", () => {
    // Tek güçlü sinyal → lider net önde.
    const ranking = computeConfidence(
      evaluateRules(problemWith({ equipmentBreakdown: true, chronicEquipmentLoss: true, previouslyOccurred: true })).scores,
    );
    expect(closeAlternatives(ranking)).toHaveLength(0);
  });

  it("beraberlikte yakın rakibi gösterir", () => {
    // Akış iyileştirme + sürekli izleme → LEAN ve SPC berabere (s=4).
    const ranking = computeConfidence(
      evaluateRules(problemWith({ flowOrWaste: true, monitoringNeed: true })).scores,
    );
    const alts = closeAlternatives(ranking);
    expect(alts.length).toBeGreaterThanOrEqual(1);
    expect(alts[0].methodology).not.toBe(ranking[0].methodology); // lideri tekrar etmez
  });

  it("limit ve eşik parametrelerine uyar", () => {
    const ranking = computeConfidence(
      evaluateRules(problemWith({ flowOrWaste: true, monitoringNeed: true })).scores,
    );
    expect(closeAlternatives(ranking, { limit: 1 }).length).toBeLessThanOrEqual(1);
    // Eşik 1.01 → hiçbir rakip lidere eşit/üstün olamaz → boş
    expect(closeAlternatives(ranking, { relativeThreshold: 1.01 })).toHaveLength(0);
  });
});
