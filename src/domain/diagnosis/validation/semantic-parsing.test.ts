// Semantik ayrıştırma testleri.
//
// Karar kurallarını değil, onlara girdi üreten AYRIŞTIRMA katmanını sınar.
// Motor ne kadar iyi karar verirse versin, cümleyi yanlış okursa yanlış
// karara ulaşır — ve bu tür hatalar kullanıcıya "kural hatası" gibi görünür.
//
// Deterministik yedek ayrıştırıcı (KeywordProblemParser) test edilir: LLM
// olmadan da doğru davranması gerekir, çünkü out-of-box kurulum bunu kullanır.

import { describe, it, expect } from "vitest";
import { KeywordProblemParser } from "@/infrastructure/parser/keyword-problem-parser";
import { SEMANTIC_CASES } from "./semantic-edge-cases";

const parser = new KeywordProblemParser();

describe("semantik edge case'ler — cümlenin anlamı, kelimenin varlığı değil", () => {
  for (const testCase of SEMANTIC_CASES) {
    it(`${testCase.id} · ${testCase.title}`, async () => {
      const parsed = await parser.parseInitial(testCase.text);

      for (const [key, expected] of Object.entries(testCase.mustExtract)) {
        expect(
          parsed.features[key as keyof typeof parsed.features],
          `${testCase.id}: '${key}' ${expected} olmalıydı. TUZAK: ${testCase.trap}`,
        ).toBe(expected);
      }

      for (const [key, forbidden] of Object.entries(testCase.mustNotExtract)) {
        expect(
          parsed.features[key as keyof typeof parsed.features],
          `${testCase.id}: '${key}' ${forbidden} olarak okundu. TUZAK: ${testCase.trap}`,
        ).not.toBe(forbidden);
      }
    });
  }
});

describe("ayrıştırma güvenliği — emin olunmayan alan boş bırakılır", () => {
  it("belirsiz metinden alan uydurulmaz", async () => {
    const parsed = await parser.parseInitial("Bir sorun var, bakmamız lazım.");
    const filled = Object.values(parsed.features).filter((value) => value !== undefined && value !== null);
    // Tek bir belirsiz cümleden çok sayıda alan doldurmak, kullanıcının
    // söylemediğini söylemiş gibi göstermektir.
    expect(filled.length).toBeLessThanOrEqual(2);
  });

  it("olasılık kipindeki cümle gerçekleşmiş olay sayılmaz", async () => {
    const parsed = await parser.parseInitial(
      "Bu değişiklikten sonra çatlak oluşabilir; henüz bir hata gerçekleşmedi.",
    );
    expect(parsed.features.defectOccurred).toBe(false);
  });
});
