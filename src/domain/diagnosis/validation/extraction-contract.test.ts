// Çıkarım sözleşmesi testleri.
//
// Deterministik çıkarıcı üzerinde koşar ve İKİ ayrı şey ölçer:
//
//   SERT KURAL  → hiçbir alan YANLIŞ değerle doldurulmamalı.
//   METRİK      → beklenen okumaların kaçı gerçekten çıkarılabildi (kapsam).
//
// Bu ayrım kasıtlıdır: bir alanı çıkaramamak güvenlidir (motor onu sorar),
// yanlış çıkarmak ise sessizce yanlış karara götürür. Aynı fixture seti
// `npm run validate:llm` ile gerçek dil modeline de uygulanır; CI ise
// tamamen deterministik kalır (bkz. scripts/validate-llm.mjs).

import { describe, it, expect } from "vitest";
import { KeywordProblemParser } from "@/infrastructure/parser/keyword-problem-parser";
import { LlmProblemParser } from "@/infrastructure/parser/llm-problem-parser";
import { OllamaProvider } from "@/infrastructure/ai/ollama-provider";
import {
  normalizeExtraction,
  contractViolations,
  extractionCoverage,
} from "../extraction-contract";
import { EXTRACTION_FIXTURES } from "./extraction-fixtures";

// Aynı fixture seti iki çıkarıcıyı da doğrular. CI varsayılanı deterministiktir;
// `npm run validate:llm` bu testi PARSER=llm ile yeniden koşar ve gerçek dil
// modelini aynı sözleşmeye tabi tutar. Ölçüt her iki yolda da aynıdır.
const parser =
  process.env.PARSER === "llm" ? new LlmProblemParser(new OllamaProvider()) : new KeywordProblemParser();

async function readFixture(text: string) {
  const parsed = await parser.parseInitial(text);
  return normalizeExtraction({ features: parsed.features, epistemic: parsed.epistemic });
}

describe("çıkarım sözleşmesi — yanlış doldurmak yasak", () => {
  for (const fixture of EXTRACTION_FIXTURES) {
    it(`${fixture.id} · ${fixture.challenge}`, async () => {
      const normalized = await readFixture(fixture.text);

      const violations = contractViolations(normalized.features, fixture.expected);
      expect(
        violations,
        `${fixture.id}: sözleşme ihlali — ${violations
          .map((v) => `${v.feature} beklenen ${v.expected}, gelen ${v.actual}`)
          .join("; ")}. ${fixture.note}`,
      ).toEqual([]);

      for (const key of fixture.mustStayUnknown ?? []) {
        expect(
          normalized.features[key],
          `${fixture.id}: '${key}' şüphe kipinde geçiyor, değer olarak yazılmamalıydı. ${fixture.note}`,
        ).toBeUndefined();
      }
    });
  }

  it("kapsam oranı raporlanır (iddia değil, ölçüm)", async () => {
    let hit = 0;
    let total = 0;
    const misses: string[] = [];
    for (const fixture of EXTRACTION_FIXTURES) {
      const normalized = await readFixture(fixture.text);
      const coverage = extractionCoverage(normalized.features, fixture.expected);
      hit += coverage.hit;
      total += coverage.total;
      if (coverage.hit < coverage.total) misses.push(`${fixture.id} (${coverage.hit}/${coverage.total})`);
    }
    console.log(
      `\n── Çıkarım kapsamı (deterministik) ──\n` +
        `  beklenen okuma            ${hit}/${total}\n` +
        `  eksik kalan fixture       ${misses.join(", ") || "—"}\n` +
        `  NOT: eksik çıkarım güvenlidir; motor o alanı sorar. Yanlış çıkarım ise sert ihlaldir.`,
    );
    expect(total).toBeGreaterThan(0);
  });
});

describe("epistemik fark — şüphe kipi kanıt değildir", () => {
  it("‘düşünüyoruz’ kök nedeni bilinir yapmaz", async () => {
    const suspected = await readFixture("Sorunun büyük ihtimalle hammadde kaynaklı olduğunu düşünüyoruz.");
    expect(suspected.features.rootCauseKnown).toBeUndefined();

    const confirmed = await readFixture("Kök nedenin yanlış hammadde olduğu doğrulandı.");
    expect(confirmed.features.rootCauseKnown).toBe(true);
  });

  it("şüpheli okuma kaybolmaz, doğrulanmak üzere kaydedilir", async () => {
    const parsed = await parser.parseInitial(
      "Kök nedenin fikstür olduğunu düşünüyoruz ama henüz doğrulamadık.",
    );
    const normalized = normalizeExtraction({ features: parsed.features, epistemic: parsed.epistemic });
    if (parsed.features.rootCauseKnown !== undefined) {
      // Çıkarıcı bir okuma ürettiyse, şüpheli olarak işaretlenmiş olmalı.
      expect(normalized.withheld).toContain("rootCauseKnown");
    }
    expect(normalized.features.rootCauseKnown).toBeUndefined();
  });

  it("normalizasyon doğrulanmış okumalara dokunmaz", () => {
    const normalized = normalizeExtraction({
      features: { defectOccurred: true, rootCauseKnown: true },
      epistemic: { rootCauseKnown: "SUSPECTED" },
    });
    expect(normalized.features.defectOccurred).toBe(true);
    expect(normalized.features.rootCauseKnown).toBeUndefined();
    expect(normalized.withheld).toEqual(["rootCauseKnown"]);
  });
});

describe("karar motoru yalnız normalize sözleşmeye bağlı", () => {
  it("aynı normalize alanlar aynı kararı verir — çıkarıcı kimliği kararı etkilemez", async () => {
    const { diagnose } = await import("../diagnose");
    const { problemWith } = await import("../features");

    const fromParser = await readFixture(
      "Makine arızalanmıyor ama kapasitesi talebe yetmiyor.",
    );
    const a = diagnose(problemWith(fromParser.features), 4);
    // Aynı alanları elle kurduğumuzda karar birebir aynı olmalı.
    const b = diagnose(problemWith({ ...fromParser.features }), 4);
    expect(a.ranking[0].methodology).toBe(b.ranking[0].methodology);
    expect(a.recommendation.status).toBe(b.recommendation.status);
  });
});
