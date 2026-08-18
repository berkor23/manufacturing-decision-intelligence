// Engineering Validation Suite — ortak tipler.
//
// Bu klasör bir ÖZELLİK değil, bir KANIT aracıdır: karar motorunun gri bölge
// üretim vakalarında mühendislik açısından tutarlı davranıp davranmadığını
// ölçer. Vakalar bilinçli olarak test kodundan ayrı tutulur; bir üretim/kalite
// mühendisi kod bilmeden okuyup ground truth'a itiraz edebilmelidir.
//
// Ölçüt tasarımı üç seviyelidir; böylece testler aşırı kırılgan olmaz:
//   mustLead      → expectedPrimary gerçekten lider mi (metrik: primary match)
//   shouldBeTop3  → expectedPrimary + acceptableSecondary ilk üçte mi
//   mustNotLead   → shouldNotLead listesindekiler ASLA lider olmamalı (sert kural)
//
// Gerçekten çift-karakterli vakalarda liderin `acceptableSecondary` içinden
// çıkması başarısızlık değildir (metrik: acceptable-primary match); sert
// başarısızlık yalnız yasaklı bir yöntemin lidere geçmesidir.

import type { DiagnosticFeatureKey, Ternary } from "../features";
import type { Methodology } from "../methodologies";

/** Bir metodoloji çatışması — hangi ayrımın sınandığını künyeler. */
export type MethodologyPair = [Methodology, Methodology];

export interface ValidationCase {
  id: string;
  title: string;
  /** Vakanın düz anlatımı — mühendis okuru için. Motor bunu doğrudan kullanmaz. */
  problem: string;
  /**
   * Teşhis turunda yetkin bir mühendisin vereceği yanıtlar. YALNIZCA anlatımda
   * gerçekten söylenen alanlar doldurulur; anlatımın söylemediği her şey null
   * kalır. Beklenen sonucu zorlamak için alan eklemek ground truth'u bozar.
   */
  answers: Partial<Record<DiagnosticFeatureKey, Ternary>>;

  /** Mühendislik açısından savunulabilir birincil yöntem. */
  expectedPrimary: Methodology;
  /** Liderliği de savunulabilir olan yakın adaylar (ilk üçte beklenir). */
  acceptableSecondary: Methodology[];
  /** Bu yöntemler lider olursa vaka SERT biçimde başarısızdır. */
  shouldNotLead: Methodology[];

  /** Kararın dayanması beklenen sinyaller (makine tarafından denetlenir). */
  expectedSignals: DiagnosticFeatureKey[];
  /** Bu vakayı komşusundan ayıran kanıt — insan okuru için Türkçe. */
  discriminatingEvidence: string[];
  /** Ground truth'un mühendislik gerekçesi. */
  rationale: string;

  /** Sınanan metodoloji çatışması (raporlama ve kapsam denetimi için). */
  pair: MethodologyPair;
  /**
   * Çakışan sinyal beklentisi:
   *   çift  → tam olarak bu iki yöntem çakışmalı
   *   false → çakışma ilan EDİLMEMELİ (tek karakterli vaka)
   *   undefined → bu vakada çakışma serbest, denetlenmez
   */
  expectContested?: MethodologyPair | false;
}

/**
 * Mutation ailesi: aynı vakadan tek bir kanıtı değiştirerek kararın gerçekten
 * o kanıta tepki verdiğini gösterir. "Motor anahtar kelime eşlemiyor, kanıt
 * okuyor" iddiasının en doğrudan kanıtı budur.
 */
export interface MutationFamily {
  id: string;
  title: string;
  /** Ailenin ortak zemini. */
  base: {
    label: string;
    answers: Partial<Record<DiagnosticFeatureKey, Ternary>>;
    expectedPrimary: Methodology;
    expectContested?: MethodologyPair | false;
  };
  /** Zemine uygulanan tekil kanıt değişiklikleri. */
  mutations: {
    label: string;
    /** Yalnız DEĞİŞEN alanlar — zeminin üstüne yazılır. */
    change: Partial<Record<DiagnosticFeatureKey, Ternary>>;
    /** Bu değişiklikten sonra beklenen lider. */
    expectedPrimary: Methodology;
    expectContested?: MethodologyPair | false;
    /** Neden bu kanıt kararı değiştirmeli. */
    why: string;
  }[];
}

/**
 * Semantik edge case: motorun Boolean alanları değil, cümlenin mühendislik
 * anlamını doğru okuduğunu sınar. Ayrıştırıcı (parser) üzerinde çalışır.
 */
export interface SemanticCase {
  id: string;
  title: string;
  text: string;
  /** Ayrıştırma sonrası bu alanlar TAM OLARAK bu değerde olmalı. */
  mustExtract: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  /** Bu alanlar KESİNLİKLE bu değere ayarlanmamalı (yüzeysel okuma tuzağı). */
  mustNotExtract: Partial<Record<DiagnosticFeatureKey, boolean>>;
  /** Tuzağın ne olduğu. */
  trap: string;
}

/** Yeterli kanıt yokken motorun kesin karar vermemesi gereken vakalar. */
export interface InsufficientEvidenceCase {
  id: string;
  title: string;
  problem: string;
  answers: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  /** Bu adaylar arasında karar verilemiyor olmalı. */
  ambiguousBetween: Methodology[];
  rationale: string;
}

/**
 * Adaptif soru kalitesi: motorun sorduğu ilk soru gerçekten iki hipotezi
 * ayırmalı. "Bu problem önemli mi?" gibi bir soru değersizdir.
 */
export interface QuestionQualityCase {
  id: string;
  title: string;
  answers: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  /** Sorunun ayırması beklenen aday çifti. */
  shouldDiscriminate: MethodologyPair;
  /** Kabul edilebilir soru alanları — bunlardan biri sorulmalı. */
  acceptableFeatures: DiagnosticFeatureKey[];
  rationale: string;
}

/** Suite metrikleri — madde 14. Pazarlama metriği DEĞİLDİR. */
export interface ValidationMetrics {
  totalCases: number;
  primaryMatch: number;
  acceptablePrimaryMatch: number;
  top3Inclusion: number;
  forbiddenLeaderViolation: number;
  contestedExpected: number;
  contestedCorrect: number;
}
