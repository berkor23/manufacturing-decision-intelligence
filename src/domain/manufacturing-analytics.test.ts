import { describe, expect, it } from "vitest";
import { analyzeIndividuals, buildChangeTimeline, customerUpdate, parseMeasurementText, scoreFmea } from "./manufacturing-analytics";

describe("manufacturing analytics", () => {
  it("CSV ölçümlerini okuyup kontrol dışı noktayı yakalar", () => {
    const points = parseMeasurementText("t1;10\nt2;10.1\nt3;9.9\nt4;10\nt5;20");
    expect(points).toHaveLength(5);
    expect(analyzeIndividuals(points).signals.some((s) => s.rule === "BEYOND_3SIGMA")).toBe(true);
  });
  it("FMEA puanını hesaplar ve S=9'u kritik yapar", () => {
    expect(scoreFmea("9", "2", "2")).toMatchObject({ rpn: 36, priority: "CRITICAL", valid: true });
    expect(scoreFmea("11", "2", "2").valid).toBe(false);
  });
  it("değişiklikleri sapma etrafında sıralar", () => {
    const items = buildChangeTimeline("2026-01-10", [{ date: "2026-01-08", change: "Lot değişti" }]);
    expect(items[0].distanceDays).toBe(-2);
  });
  it("doğrulanmamış kök nedeni kesin dille yazmaz", () => {
    expect(customerUpdate("Çatlak", "Ayıklama", "")).toContain("henüz kesin neden");
  });
});
