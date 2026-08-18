// Validation koşucusu ve metrikleri.
//
// Bir vakayı motora verir, sonucu ground truth ile karşılaştırır ve raporlanabilir
// bir sonuç üretir. Test dosyaları buradan okur; böylece hem sert kurallar (yasaklı
// lider) hem de yumuşak metrikler (birincil eşleşme oranı) tek yerden gelir.
//
// ÖNEMLİ: buradaki oranlar bir doğruluk/başarı yüzdesi DEĞİLDİR. Karar
// kurallarının, tanımlanmış mühendislik vakalarında beklenen ayrımları koruyup
// korumadığını ölçer; gerçek dünya başarı olasılığını temsil etmez.

import { problemWith } from "../features";
import { diagnose } from "../diagnose";
import type { Methodology } from "../methodologies";
import type { MethodologyPair, ValidationCase, ValidationMetrics } from "./types";

/** Vitrin/validation koşularında soru turu bitmiş sayılır; sonuç ekranı ölçülür. */
const QUESTIONS_ASKED = 8;

export interface CaseResult {
  id: string;
  title: string;
  pair: MethodologyPair;
  leader: Methodology;
  top3: Methodology[];
  scoreMargin: number;
  evidenceStatus: "PROVISIONAL" | "CONFIRMED" | "INCONCLUSIVE";

  /** Lider tam olarak beklenen birincil mi? */
  primaryMatch: boolean;
  /** Lider beklenen birincil ya da kabul edilebilir alternatiflerden biri mi? */
  acceptableMatch: boolean;
  /** Beklenen birincil ilk üçte mi? */
  top3Includes: boolean;
  /** Yasaklı bir yöntem lidere geçti mi? (SERT ihlal) */
  forbiddenLeader: boolean;

  /** Çakışma beklentisi denetlendi mi ve tuttu mu? */
  contestedChecked: boolean;
  contestedCorrect: boolean;
  contestedActual: MethodologyPair | null;

  /** Kararın dayanması beklenen sinyallerden kaçı gerçekten bilinen kanıtta? */
  missingExpectedSignals: string[];
}

function samePair(a: MethodologyPair, b: MethodologyPair): boolean {
  return [...a].sort().join("|") === [...b].sort().join("|");
}

export function evaluateCase(testCase: ValidationCase): CaseResult {
  const problem = problemWith(testCase.answers, { problemDescription: testCase.problem });
  const snapshot = diagnose(problem, QUESTIONS_ASKED);

  const leader = snapshot.ranking[0].methodology;
  const top3 = snapshot.ranking.slice(0, 3).map((entry) => entry.methodology);

  const contestedActual: MethodologyPair | null = snapshot.contested
    ? [snapshot.contested.sides[0].methodology, snapshot.contested.sides[1].methodology]
    : null;

  const contestedChecked = testCase.expectContested !== undefined;
  let contestedCorrect = true;
  if (testCase.expectContested === false) {
    contestedCorrect = contestedActual === null;
  } else if (Array.isArray(testCase.expectContested)) {
    contestedCorrect = contestedActual !== null && samePair(contestedActual, testCase.expectContested);
  }

  // Beklenen sinyaller gerçekten yanıtlanmış mı? Ground truth'un kendi
  // tutarlılığını denetler: anlatımda olmayan bir sinyali beklemek hatadır.
  const missingExpectedSignals = testCase.expectedSignals.filter(
    (key) => testCase.answers[key] === undefined || testCase.answers[key] === null,
  );

  return {
    id: testCase.id,
    title: testCase.title,
    pair: testCase.pair,
    leader,
    top3,
    scoreMargin: snapshot.evidence.scoreMargin,
    evidenceStatus: snapshot.evidence.status,
    primaryMatch: leader === testCase.expectedPrimary,
    acceptableMatch:
      leader === testCase.expectedPrimary || testCase.acceptableSecondary.includes(leader),
    top3Includes: top3.includes(testCase.expectedPrimary),
    forbiddenLeader: testCase.shouldNotLead.includes(leader),
    contestedChecked,
    contestedCorrect,
    contestedActual,
    missingExpectedSignals,
  };
}

export function summarize(results: CaseResult[]): ValidationMetrics {
  return {
    totalCases: results.length,
    primaryMatch: results.filter((r) => r.primaryMatch).length,
    acceptablePrimaryMatch: results.filter((r) => r.acceptableMatch).length,
    top3Inclusion: results.filter((r) => r.top3Includes).length,
    forbiddenLeaderViolation: results.filter((r) => r.forbiddenLeader).length,
    contestedExpected: results.filter((r) => r.contestedChecked).length,
    contestedCorrect: results.filter((r) => r.contestedChecked && r.contestedCorrect).length,
  };
}

/** Konsola basılan özet — pazarlama metriği değil, mühendislik künyesi. */
export function formatMetrics(label: string, metrics: ValidationMetrics): string {
  const pct = (n: number, d: number) => (d === 0 ? "-" : `${Math.round((n / d) * 100)}%`);
  return [
    `\n── ${label} ──`,
    `  vaka                       ${metrics.totalCases}`,
    `  birincil eşleşme           ${metrics.primaryMatch}/${metrics.totalCases} (${pct(metrics.primaryMatch, metrics.totalCases)})`,
    `  kabul edilebilir birincil  ${metrics.acceptablePrimaryMatch}/${metrics.totalCases} (${pct(metrics.acceptablePrimaryMatch, metrics.totalCases)})`,
    `  ilk üçte                   ${metrics.top3Inclusion}/${metrics.totalCases} (${pct(metrics.top3Inclusion, metrics.totalCases)})`,
    `  yasaklı lider ihlali       ${metrics.forbiddenLeaderViolation}`,
    `  çakışma doğruluğu          ${metrics.contestedCorrect}/${metrics.contestedExpected}`,
    `  NOT: bu oranlar gerçek dünya başarı olasılığı değildir.`,
  ].join("\n");
}

/** Başarısız vakaları okunur biçimde döker — hata analizinin başlangıcı. */
export function formatFailures(results: CaseResult[], cases: ValidationCase[]): string {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const failures = results.filter((r) => !r.acceptableMatch || r.forbiddenLeader || !r.contestedCorrect);
  if (failures.length === 0) return "";
  return failures
    .map((r) => {
      const expected = byId.get(r.id)!;
      const problems: string[] = [];
      if (r.forbiddenLeader) problems.push(`YASAKLI LİDER: ${r.leader}`);
      if (!r.acceptableMatch) problems.push(`lider ${r.leader}, beklenen ${expected.expectedPrimary}`);
      if (!r.contestedCorrect) {
        problems.push(
          `çakışma: beklenen ${JSON.stringify(expected.expectContested)}, gelen ${JSON.stringify(r.contestedActual)}`,
        );
      }
      return `  ${r.id} — ${problems.join(" · ")} [ilk üç: ${r.top3.join(", ")}]`;
    })
    .join("\n");
}
