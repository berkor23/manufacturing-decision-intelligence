import { describe, expect, it } from "vitest";
import { KeywordProblemParser } from "./keyword-problem-parser";

describe("KeywordProblemParser — profesyonel olumsuzluklar", () => {
  it("'yeni ürün tasarımı değildir' ifadesini yeni tasarım olarak işaretlemez", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "Seri üretimdeki fren kaliperi prosesi için risk analizi; yeni ürün tasarımı değildir.",
    );
    expect(parsed.features.isNewDesign).toBe(false);
  });

  it("gerçek yeni tasarım ifadesini pozitif yakalar", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "Yeni ürün tasarımı için DFSS çalışması başlatıyoruz.",
    );
    expect(parsed.features.isNewDesign).toBe(true);
  });
});
