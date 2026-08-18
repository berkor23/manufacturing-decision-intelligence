// Engineering Validation Suite — ana koşu.
//
// Sert kural yalnız birdir: YASAKLI BİR YÖNTEM LİDER OLAMAZ. Onun dışında
// development vakalarında lider, beklenen birincil ya da kabul edilebilir
// alternatiflerden biri olmalıdır; gerçekten çift-karakterli vakalarda
// alternatifin öne geçmesi başarısızlık değildir.
//
// Holdout vakaları kural düzeltmelerinde hedef alınmaz: orada yalnız sert kural
// zorunludur, birincil eşleşme metrik olarak raporlanır.

import { describe, it, expect } from "vitest";
import { problemWith } from "../features";
import { diagnose } from "../diagnose";
import { rankQuestions } from "../question-engine";
import { DEVELOPMENT_CASES } from "./manufacturing-cases";
import { HOLDOUT_CASES } from "./holdout-cases";
import { MUTATION_FAMILIES } from "./mutation-families";
import { INSUFFICIENT_EVIDENCE_CASES, QUESTION_QUALITY_CASES } from "./evidence-cases";
import { evaluateCase, summarize, formatMetrics, formatFailures } from "./run-validation";

const QUESTIONS_ASKED = 8;

describe("ground truth tutarlılığı", () => {
  it("beklenen sinyaller vakanın kendi yanıtlarında gerçekten var", () => {
    // Anlatımın söylemediği bir sinyali beklemek ground truth hatasıdır.
    for (const testCase of [...DEVELOPMENT_CASES, ...HOLDOUT_CASES]) {
      const result = evaluateCase(testCase);
      expect(result.missingExpectedSignals, `${testCase.id} eksik sinyal`).toEqual([]);
    }
  });

  it("kabul edilebilir alternatif ile yasaklı liste çakışmaz", () => {
    for (const testCase of [...DEVELOPMENT_CASES, ...HOLDOUT_CASES]) {
      const overlap = testCase.acceptableSecondary.filter((m) => testCase.shouldNotLead.includes(m));
      expect(overlap, `${testCase.id} çelişkili beklenti`).toEqual([]);
      expect(testCase.shouldNotLead, `${testCase.id} kendi beklentisini yasaklıyor`).not.toContain(
        testCase.expectedPrimary,
      );
    }
  });

  it("her vaka bir metodoloji çatışmasını künyeler", () => {
    for (const testCase of [...DEVELOPMENT_CASES, ...HOLDOUT_CASES]) {
      expect(testCase.pair).toHaveLength(2);
      expect(testCase.rationale.length).toBeGreaterThan(40);
      expect(testCase.discriminatingEvidence.length).toBeGreaterThan(0);
    }
  });
});

describe("development vakaları — gri bölge ayrımı", () => {
  for (const testCase of DEVELOPMENT_CASES) {
    it(`${testCase.id} · ${testCase.title}`, () => {
      const result = evaluateCase(testCase);

      expect(
        result.forbiddenLeader,
        `${testCase.id}: yasaklı yöntem lidere geçti (${result.leader}); ilk üç: ${result.top3.join(", ")}`,
      ).toBe(false);

      expect(
        result.acceptableMatch,
        `${testCase.id}: lider ${result.leader}, beklenen ${testCase.expectedPrimary} veya ${testCase.acceptableSecondary.join("/") || "—"}`,
      ).toBe(true);

      expect(
        result.top3Includes,
        `${testCase.id}: beklenen birincil ${testCase.expectedPrimary} ilk üçte yok (${result.top3.join(", ")})`,
      ).toBe(true);
    });
  }

  it("çakışan sinyal beklentileri tutuyor", () => {
    const misses = DEVELOPMENT_CASES.map(evaluateCase)
      .filter((r) => r.contestedChecked && !r.contestedCorrect)
      .map((r) => `${r.id}: gelen ${JSON.stringify(r.contestedActual)}`);
    expect(misses).toEqual([]);
  });

  it("özet metrikler", () => {
    const results = DEVELOPMENT_CASES.map(evaluateCase);
    const metrics = summarize(results);
    // Konsol künyesi — test çıktısında görünür, iddiaya dönüşmez.
    console.log(formatMetrics("Development", metrics));
    const failures = formatFailures(results, DEVELOPMENT_CASES);
    if (failures) console.log("başarısız:\n" + failures);
    expect(metrics.forbiddenLeaderViolation).toBe(0);
  });
});

describe("holdout vakaları — genelleme (tuning hedefi DEĞİL)", () => {
  for (const testCase of HOLDOUT_CASES) {
    it(`${testCase.id} · yasaklı lider yok`, () => {
      const result = evaluateCase(testCase);
      expect(
        result.forbiddenLeader,
        `${testCase.id}: yasaklı yöntem lidere geçti (${result.leader})`,
      ).toBe(false);
    });
  }

  it("holdout metrikleri ayrıca raporlanır", () => {
    const results = HOLDOUT_CASES.map(evaluateCase);
    const metrics = summarize(results);
    console.log(formatMetrics("Holdout", metrics));
    const failures = formatFailures(results, HOLDOUT_CASES);
    if (failures) console.log("holdout sapmaları:\n" + failures);
    expect(metrics.forbiddenLeaderViolation).toBe(0);
  });
});

describe("mutation aileleri — karar tek kanıta tepki veriyor mu", () => {
  for (const family of MUTATION_FAMILIES) {
    describe(`${family.id} · ${family.title}`, () => {
      it(`zemin: ${family.base.label}`, () => {
        const snapshot = diagnose(problemWith(family.base.answers), QUESTIONS_ASKED);
        expect(snapshot.ranking[0].methodology, family.base.label).toBe(family.base.expectedPrimary);
        if (family.base.expectContested === false) {
          expect(snapshot.contested, `${family.id} zemininde çakışma beklenmiyordu`).toBeNull();
        }
      });

      for (const mutation of family.mutations) {
        it(`mutasyon: ${mutation.label}`, () => {
          const answers = { ...family.base.answers, ...mutation.change };
          const snapshot = diagnose(problemWith(answers), QUESTIONS_ASKED);

          expect(
            snapshot.ranking[0].methodology,
            `${mutation.label} → beklenen ${mutation.expectedPrimary}, gelen ${snapshot.ranking[0].methodology}. ${mutation.why}`,
          ).toBe(mutation.expectedPrimary);

          // Kararın gerçekten DEĞİŞTİĞİNİ göster: mutasyon zeminle aynı sonucu
          // veriyorsa o kanıt kararı sürüklemiyor demektir.
          if (mutation.expectedPrimary !== family.base.expectedPrimary) {
            const baseSnapshot = diagnose(problemWith(family.base.answers), QUESTIONS_ASKED);
            expect(snapshot.ranking[0].methodology).not.toBe(baseSnapshot.ranking[0].methodology);
          }

          if (mutation.expectContested === false) {
            expect(snapshot.contested, `${mutation.label}: çakışma beklenmiyordu`).toBeNull();
          } else if (Array.isArray(mutation.expectContested)) {
            expect(snapshot.contested, `${mutation.label}: çakışma bekleniyordu`).not.toBeNull();
            const actual = [
              snapshot.contested!.sides[0].methodology,
              snapshot.contested!.sides[1].methodology,
            ].sort();
            expect(actual).toEqual([...mutation.expectContested].sort());
          }
        });
      }
    });
  }
});

describe("kanıt yeterliliği — yeterli kanıt yoksa kesin karar yok", () => {
  for (const testCase of INSUFFICIENT_EVIDENCE_CASES) {
    it(`${testCase.id} · ${testCase.title}`, () => {
      const problem = problemWith(testCase.answers, { problemDescription: testCase.problem });
      const snapshot = diagnose(problem, 0);

      expect(
        snapshot.evidence.status,
        `${testCase.id}: bu bilgiyle doğrulanmış sonuç üretilmemeli`,
      ).not.toBe("CONFIRMED");

      expect(snapshot.nextQuestion, `${testCase.id}: ayırt edici soru sorulmalı`).not.toBeNull();

      expect(
        snapshot.evidence.supportingSignals,
        `${testCase.id}: bu kadar az bilgiyle bağımsız destek birikmemeli`,
      ).toBeLessThan(3);
    });
  }

  it("takip sorusu gerçekten adayları ayırıyor", () => {
    // Belirsiz bir vakada sorulan soru yanıtlandığında sıralama değişebilmeli;
    // değişmiyorsa soru bilgi üretmemiştir.
    const problem = problemWith({ equipmentBreakdown: true });
    const snapshot = diagnose(problem, 0);
    expect(snapshot.nextQuestion).not.toBeNull();

    const key = snapshot.nextQuestion!.featureKey;
    const yes = diagnose(problemWith({ equipmentBreakdown: true, [key]: true }), 1);
    const no = diagnose(problemWith({ equipmentBreakdown: true, [key]: false }), 1);
    const changed =
      yes.ranking[0].methodology !== no.ranking[0].methodology ||
      yes.evidence.scoreMargin !== no.evidence.scoreMargin;
    expect(changed, `soru ${key} iki yanıtta da aynı tabloyu bırakıyor`).toBe(true);
  });
});

describe("adaptif soru kalitesi — soru hangi ayrımı hedefliyor", () => {
  // Ölçüt bilinçli olarak "ilk soru tam olarak şu olmalı" DEĞİLDİR. Motor
  // önce problem ailesini daraltan sorular sorabilir; bu meşru bir teşhis
  // stratejisidir. Aranan şey, ayırt edici sorunun motorun en iyi adayları
  // arasında GERÇEKTEN bulunması: erişilemeyen bir soru asla sorulmaz ve o
  // ayrım hiçbir turda yapılamaz.
  const TOP_CANDIDATES = 5;

  for (const testCase of QUESTION_QUALITY_CASES) {
    it(`${testCase.id} · ${testCase.title}`, () => {
      const ranked = rankQuestions(problemWith(testCase.answers));
      expect(ranked.length, `${testCase.id}: hiç aday soru yok`).toBeGreaterThan(0);

      const top = ranked.slice(0, TOP_CANDIDATES).map((candidate) => candidate.featureKey);
      const hit = top.find((key) => testCase.acceptableFeatures.includes(key));
      expect(
        hit,
        `${testCase.id}: ${testCase.shouldDiscriminate.join(" × ")} ayrımını hedefleyen soru ilk ${TOP_CANDIDATES} adayda yok. Adaylar: ${top.join(", ")}. ${testCase.rationale}`,
      ).toBeDefined();
    });
  }

  it("sorulan sorunun ayırdığı çift raporlanıyor", () => {
    // separates alanı ya somut bir çift verir ya açıkça null olur; belirsiz kalmaz.
    let withPair = 0;
    for (const testCase of QUESTION_QUALITY_CASES) {
      const snapshot = diagnose(problemWith(testCase.answers), 1);
      const separates = snapshot.nextQuestion?.separates ?? null;
      if (separates) {
        expect(separates.ifYes).not.toBe(separates.ifNo);
        withPair += 1;
      }
    }
    console.log(`\n── Adaptif soru ──\n  ayırdığı çifti bildiren soru: ${withPair}/${QUESTION_QUALITY_CASES.length}`);
  });
});

describe("‘neden diğeri değil’ içeriği anlamlı mı", () => {
  it("bastırılan rakip için gerekçe somut bir olguya dayanır", () => {
    // Genel bir "düşük puan aldı" cümlesi yeterli değildir: kural itirazı varsa
    // açıklama, bu problemdeki GERÇEĞİ göstermelidir.
    for (const testCase of DEVELOPMENT_CASES) {
      const snapshot = diagnose(
        problemWith(testCase.answers, { problemDescription: testCase.problem }),
        QUESTIONS_ASKED,
      );
      for (const rival of snapshot.rivalAnalysis) {
        if (rival.kind !== "SUPPRESSED") continue;
        expect(
          rival.reason.includes("Bu problemde ise") || rival.reason.includes("doğası"),
          `${testCase.id}/${rival.methodology}: gerekçe somut olguya dayanmıyor — "${rival.reason}"`,
        ).toBe(true);
      }
      expect(snapshot.rivalAnalysis.length, `${testCase.id}: rakip gerekçesi üretilmedi`).toBeGreaterThan(0);
    }
  });

  it("FMEA ile DMADV rakip gibi değil, çerçeve ve adım olarak sunulur", () => {
    // Vaka G'nin asıl gereği bu: ikisi de uygunsa doğru çıktı "iki çakışan
    // karakter" değil, ana omurga (tasarım çerçevesi) + risk katmanı ilişkisi.
    const design = DEVELOPMENT_CASES.find((c) => c.id === "G-new-welding-process-design")!;
    const snapshot = diagnose(problemWith(design.answers), QUESTIONS_ASKED);

    expect(snapshot.methodPlan.primary.methodology).toBe("DMADV");
    const risk = snapshot.methodPlan.supporting.find((entry) => entry.layer === "RISK");
    expect(risk?.methodology, "FMEA tasarım çerçevesi içinde risk katmanı olarak görünmeli").toBe(
      "FMEA",
    );
    // Rakip listesinde "elenmiş" gibi de sunulmamalı: çakışma ilan edilmiyor.
    expect(snapshot.contested).toBeNull();
  });

  it("karşıtlıklı iz liderin ve rakibin sinyallerini birlikte taşır", () => {
    for (const testCase of DEVELOPMENT_CASES) {
      const snapshot = diagnose(problemWith(testCase.answers), QUESTIONS_ASKED);
      expect(snapshot.contrastive, `${testCase.id}`).toHaveLength(2);
      expect(
        snapshot.contrastive[0].supporting.length,
        `${testCase.id}: liderin destek sinyali yok`,
      ).toBeGreaterThan(0);
    }
  });
});
