// Phase 1 sonu baseline'ı — Phase 2 çalışmasının referans noktası.
//
// Bu sayılar bir hedef değil, bir KALKANdır: Phase 2'de kalibrasyon ve
// abstention eklenirken mevcut ayrım davranışının bozulmadığını göstermek için
// dondurulmuştur. Bir düzeltme bu değerlerin altına düşürüyorsa, düzeltme
// başka bir yeteneği bozuyor demektir.
//
// NOT: bunlar doğruluk yüzdesi değildir (bkz. docs/ENGINEERING_VALIDATION.md).

export interface ValidationBaseline {
  label: string;
  totalTests: number;
  developmentCases: number;
  developmentPrimaryMatch: number;
  developmentAcceptableMatch: number;
  developmentTop3: number;
  holdoutCases: number;
  holdoutPrimaryMatch: number;
  holdoutAcceptableMatch: number;
  forbiddenLeaderViolation: number;
  contestedCorrect: number;
  contestedExpected: number;
  /** Sorduğu sorunun ayırdığı çifti bildiren vaka sayısı / toplam. */
  questionPairDisclosure: [number, number];
}

export const PHASE1_BASELINE: ValidationBaseline = {
  label: "Phase 1 — discrimination & contested signals",
  totalTests: 490,
  developmentCases: 21,
  developmentPrimaryMatch: 20,
  developmentAcceptableMatch: 21,
  developmentTop3: 21,
  holdoutCases: 8,
  holdoutPrimaryMatch: 7,
  holdoutAcceptableMatch: 8,
  forbiddenLeaderViolation: 0,
  contestedCorrect: 9,
  contestedExpected: 9,
  questionPairDisclosure: [7, 10],
};
