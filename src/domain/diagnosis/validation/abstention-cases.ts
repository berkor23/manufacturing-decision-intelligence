// Abstention (karar vermeme) vakaları.
//
// "Bir sistemin güvenilirliği yalnızca ne zaman doğru karar verdiğiyle değil,
// ne zaman karar vermemesi gerektiğini bilmesiyle de ölçülür."
//
// Üç kategori bilinçli olarak AYRI tutulur; ikisi yüzeyde birbirine benzer ama
// mühendislik anlamı taban tabana zıttır:
//
//   INSUFFICIENT_EVIDENCE     → bilgi EKSİK; problem olabilir, seçemeyiz.
//   NO_FORMAL_METHOD_NEEDED   → bilgi TAM; kapsamlı bir metodoloji gerekmiyor.
//   PROVISIONAL               → aday var ama kanıt gövdesi tamamlanmadı.
//
// İlk ikisini karıştırmak, kullanıcıyı ya gereksiz bir projeye sokar ya da
// gerçekten eksik olan bilgiyi görmezden gelmesine yol açar.

import type { DiagnosticFeatureKey, Ternary } from "../features";
import type { RecommendationStatus } from "../recommendation";

export interface AbstentionCase {
  id: string;
  title: string;
  problem: string;
  answers: Partial<Record<DiagnosticFeatureKey, Ternary>>;
  expectedStatus: RecommendationStatus;
  /** Bu durumda kullanıcıya bir yöntem DAYATILMAMALI. */
  mustNotRecommend: boolean;
  rationale: string;
}

export const ABSTENTION_CASES: AbstentionCase[] = [
  // ── Kanıt yetersiz ──────────────────────────────────────────────────────
  {
    id: "AB1-performance-dropped",
    title: "Hattın performansı düştü",
    problem: "Hattın performansı düştü, hedeflerin altındayız.",
    answers: {},
    expectedStatus: "INSUFFICIENT_EVIDENCE",
    mustNotRecommend: true,
    rationale:
      "Performans düşüşü bir sonuçtur, problem karakteri değil. Kayıp güvenilirlikten mi, kısıttan mı, akıştan mı, varyasyondan mı geliyor bilinmiyor.",
  },
  {
    id: "AB2-quality-issue-vague",
    title: "Kalitede sorun yaşıyoruz",
    problem: "Kalitede sorun yaşıyoruz, red oranı yükseldi ama detayına bakmadık.",
    answers: { defectOccurred: true },
    expectedStatus: "INSUFFICIENT_EVIDENCE",
    mustNotRecommend: true,
    rationale:
      "Tek başına 'hata var' sinyali reaktif aileyi açar ama içinden birini seçtirmez; kronik mi, değişiklik sonrası mı, müşteriye ulaştı mı bilinmiyor.",
  },
  {
    id: "AB3-machine-not-good",
    title: "Makine iyi çalışmıyor",
    problem: "Makine son zamanlarda iyi çalışmıyor.",
    answers: { equipmentBreakdown: true },
    expectedStatus: "INSUFFICIENT_EVIDENCE",
    mustNotRecommend: true,
    rationale:
      "Duruşun kronik mi tekil mi olduğu, makinenin kısıt olup olmadığı, nedenin bilinip bilinmediği hiç sorulmadan yöntem seçilemez.",
  },

  // ── Kapsamlı yöntem gerekmiyor ──────────────────────────────────────────
  {
    id: "AB4-sensor-cable-closed",
    title: "Kırılan sensör kablosu, doğrulandı ve düzeltildi",
    problem:
      "Makine bir kez durdu; nedeni kırılmış bir sensör kablosu olarak kesin belirlendi. Kablo değiştirildi, makine normale döndü. Daha önce yaşanmamıştı, tekrar etmedi, müşteriye yansımadı ve ayıklama gerekmedi.",
    answers: {
      defectOccurred: true,
      equipmentBreakdown: true,
      rootCauseKnown: true,
      previouslyOccurred: false,
      chronicEquipmentLoss: false,
      customerAffected: false,
      containmentNeeded: false,
    },
    expectedStatus: "NO_FORMAL_METHOD_NEEDED",
    mustNotRecommend: true,
    rationale:
      "Burada bilgi EKSİK değil, tam: neden doğrulanmış, olay tekil ve kapanmış. Kapsamlı bir problem çözme metodolojisi açmak kaynak israfıdır.",
  },
  {
    id: "AB5-known-cause-single-adjustment",
    title: "Yanlış ayar tek seferlik, düzeltildi",
    problem:
      "Bir vardiyada parça ölçüsü kaydı; nedeni operatörün yanlış ofset girmesi olarak doğrulandı. Ofset düzeltildi, parçalar ayrıldı ve sorun tekrar etmedi. Müşteriye ulaşmadı, kronik bir durum yok.",
    answers: {
      defectOccurred: true,
      rootCauseKnown: true,
      previouslyOccurred: false,
      customerAffected: false,
      containmentNeeded: false,
      chronicPerformanceGap: false,
      isImprovementInitiative: false,
    },
    expectedStatus: "NO_FORMAL_METHOD_NEEDED",
    mustNotRecommend: true,
    rationale:
      "Tekil, nedeni doğrulanmış ve kapanmış olay. Yöntem önermek yerine ‘buna resmî bir çalışma gerekmiyor’ demek daha dürüst bir cevaptır.",
  },

  // ── Aday var ama kanıt tamamlanmadı ─────────────────────────────────────
  {
    id: "AB6-chronic-quality-unknown-data",
    title: "Kronik kalite problemi, veri ve kararlılık bilinmiyor",
    problem:
      "Uzun süredir devam eden bir kalite problemimiz var ve tekrar ediyor. Kök nedeni bilmiyoruz. Elimizde düzenli ölçüm verisi olup olmadığından ve prosesin kararlı olup olmadığından emin değiliz.",
    answers: {
      defectOccurred: true,
      previouslyOccurred: true,
      rootCauseKnown: false,
      startedRecently: false,
    },
    // GROUND TRUTH DÜZELTMESİ: veri ve proses kararlılığı DMAIC'in kanıt
    // gövdesine aittir, RCA'nın değil. Hata oluşmuş + neden bilinmiyor + tekrar
    // ediyor üçlüsü RCA'nın kendi profilini zaten tamamlar; motorun burada
    // öneri üretmesi doğrudur. Eksik olan bilgi, ALTERNATİF yöntemi (DMAIC)
    // değerlendirmek için gerekli — bu ayrı bir sorudur.
    expectedStatus: "RECOMMENDED",
    mustNotRecommend: false,
    rationale:
      "Hata oluşmuş, kök neden bilinmiyor ve tekrar ediyor: RCA'nın kanıt gövdesi tamam. Veri ve kararlılık bilgisi DMAIC alternatifini değerlendirmek için gerekir, RCA'yı önermeyi engellemez.",
  },
  {
    id: "AB7-flow-problem-partial",
    title: "Akış problemi var ama kısıt bilinmiyor",
    problem:
      "Temin süremiz uzun ve ara stoklarımız yüksek. Belirli bir noktanın kısıt olup olmadığını henüz ölçmedik.",
    answers: { flowOrWaste: true, hasMeasurementData: true },
    // GROUND TRUTH DÜZELTMESİ: yalnız iki doğrulanmış cevap var. Aile doğru
    // olsa bile bu, bir yöntemi önermeye yetecek kanıt gövdesi değildir;
    // motorun burada çekimser kalması beklenen davranıştır.
    expectedStatus: "INSUFFICIENT_EVIDENCE",
    mustNotRecommend: true,
    rationale:
      "Akış ailesi doğru ama yalnız iki cevap var; TOC ile VSM ayrımı için kısıt imzası (kuyruk, açlık, kapasite-talep) henüz sorulmadı.",
  },
  {
    id: "AB8-improvement-no-baseline",
    title: "İyileştirme isteniyor, taban bilinmiyor",
    problem:
      "Bu hattı iyileştirmek istiyoruz. Standart çalışmanın fiilen uygulanıp uygulanmadığını ve prosesin kararlı olup olmadığını henüz değerlendirmedik.",
    answers: { isImprovementInitiative: true, defectOccurred: false },
    expectedStatus: "INSUFFICIENT_EVIDENCE",
    mustNotRecommend: true,
    rationale:
      "İyileştirme niyeti bir problem karakteri değildir. Stabilizasyon kapısı sorulmadan PDCA'ya geçmek, olmayan bir tabanın üzerine proje kurmaktır.",
  },
];
