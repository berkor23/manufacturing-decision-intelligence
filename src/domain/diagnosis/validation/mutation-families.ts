// Mutation ailesi testleri.
//
// Bir vakadan TEK BİR kanıt değiştirilir ve kararın gerçekten o kanıta tepki
// verdiği gösterilir. Bu, "motor anahtar kelime eşlemiyor, kanıt okuyor"
// iddiasının en doğrudan kanıtıdır: aynı cümlelerin çoğu sabitken kararın
// dönmesi, dönmenin sebebinin o tek sinyal olduğunu söyler.
//
// Aynı zamanda ters yönde bir kalkandır: bir kural ağırlığı şişirildiğinde
// mutation zinciri kırılır, çünkü karar artık kanıta değil ağırlığa bağlanmıştır.

import type { MutationFamily } from "./types";

export const MUTATION_FAMILIES: MutationFamily[] = [
  {
    id: "MF1-reliability-to-constraint",
    title: "Güvenilirlik kaybından sistem kısıtına",
    base: {
      label: "Makine kronik arızalanıyor ama darboğaz değil",
      answers: {
        equipmentBreakdown: true,
        chronicEquipmentLoss: true,
        previouslyOccurred: true,
        bottleneckThroughput: false,
        constraintQueue: false,
      },
      expectedPrimary: "TPM",
      expectContested: false,
    },
    mutations: [
      {
        label: "Aynı makine artık doğrulanmış sistem kısıtı",
        change: {
          bottleneckThroughput: true,
          constraintQueue: true,
          constraintMeasured: true,
          constraintLeverageExpected: true,
        },
        expectedPrimary: "TOC",
        expectContested: ["TPM", "TOC"],
        why:
          "Kısıt kanıtlandığında güvenilirlik kaybı yok olmaz; ikisi birden geçerlidir ve sıra kurulmalıdır.",
      },
      {
        label: "Arızalar giderildi ama makine hâlâ kapasite kısıtı",
        change: {
          equipmentBreakdown: false,
          chronicEquipmentLoss: false,
          previouslyOccurred: false,
          bottleneckThroughput: true,
          constraintQueue: true,
          constraintMeasured: true,
          constraintLeverageExpected: true,
        },
        expectedPrimary: "TOC",
        expectContested: false,
        why: "Güvenilirlik kanıtı kalkınca TPM'in dayanağı da kalkar; geriye saf yapısal kısıt kalır.",
      },
    ],
  },

  {
    id: "MF2-eightd-boundary",
    title: "8D'nin sınırı: müşteri etkisi değil, koruma ve tekrar",
    base: {
      label: "Müşteriye ulaşmış, tekrar eden, nedeni bilinmeyen hata",
      answers: {
        defectOccurred: true,
        customerAffected: true,
        externalNonconformance: true,
        containmentNeeded: true,
        previouslyOccurred: true,
        rootCauseKnown: false,
      },
      expectedPrimary: "EIGHT_D",
    },
    mutations: [
      {
        label: "Kök neden bulundu, koruma gerekmiyor, tekrar yok",
        change: { rootCauseKnown: true, containmentNeeded: false, previouslyOccurred: false },
        expectedPrimary: "PDCA_A3",
        why:
          "8D'yi ayakta tutan üç sinyal birden kalkarsa geriye bilinen karşı önlemi uygulayıp doğrulamak kalır.",
      },
      {
        label: "Hata içeride yakalandı, müşteriye ulaşmadı",
        change: { externalNonconformance: false, customerAffected: false, containmentNeeded: false },
        expectedPrimary: "RCA",
        why: "Müşteriye ulaşma kanıtı kalkınca 8D'nin yönetim disiplini gerekçesi düşer; kalan iş nedeni bulmaktır.",
      },
    ],
  },

  {
    id: "MF3-monitor-to-improve",
    title: "İzlemekten iyileştirmeye",
    base: {
      label: "Kararlı ve yeterli proses, izleme ihtiyacı",
      answers: {
        processStable: true,
        monitoringNeed: true,
        measurementReliable: true,
        highVariation: false,
        defectOccurred: false,
      },
      expectedPrimary: "SPC",
      expectContested: false,
    },
    mutations: [
      {
        label: "Proses kararsız ve varyasyon yüksek",
        change: { processStable: false, highVariation: true, hasMeasurementData: true, rootCauseKnown: false },
        expectedPrimary: "DMAIC",
        why:
          "Kararsız bir prosese kontrol limiti çizilmez. Kararlılık kanıtı kalkınca izleme değil, nedeni bulma işi başlar.",
      },
    ],
  },

  {
    id: "MF4-stabilize-then-improve",
    title: "Önce stabilize, sonra iyileştir",
    base: {
      label: "Standart yok, temel koşullar yok, proses kararsız",
      answers: {
        isImprovementInitiative: true,
        standardWorkEstablished: false,
        basicConditionsStable: false,
        processStable: false,
      },
      expectedPrimary: "SDCA",
    },
    mutations: [
      {
        label: "Standart, temel koşullar ve kararlılık doğrulandı",
        change: { standardWorkEstablished: true, basicConditionsStable: true, processStable: true },
        expectedPrimary: "PDCA_A3",
        why: "Stabilizasyon kapısı geçilince iyileştirme döngüsü ölçülebilir bir taban üzerinde çalışabilir.",
      },
      {
        label: "Standart oturdu ama temel koşullar hâlâ sağlanmıyor",
        change: { standardWorkEstablished: true },
        expectedPrimary: "SDCA",
        why:
          "Stabilizasyon tek bir koşula indirgenmemeli; temel koşullar açıkken iyileştirmenin etkisi gürültüden ayrılamaz.",
      },
    ],
  },

  {
    id: "MF5-risk-to-design-to-reaction",
    title: "Riskten tasarıma, tasarımdan reaksiyona",
    base: {
      label: "Mevcut proseste değişiklik kaynaklı risk",
      answers: {
        defectOccurred: false,
        isNewDesign: false,
        processChanged: true,
        potentialEffectKnown: true,
        controlAdequacyUncertain: true,
      },
      expectedPrimary: "FMEA",
    },
    mutations: [
      {
        label: "Mevcut proses değil, sıfırdan yeni tasarım",
        change: { isNewDesign: true },
        expectedPrimary: "DMADV",
        why: "Tasarım serbestliği kazanıldığında iş, mevcut kontrolleri sınamaktan yeni yapıyı doğru kurmaya kayar.",
      },
      {
        label: "Risk gerçekleşti, hata oluştu",
        change: { defectOccurred: true, rootCauseKnown: false },
        expectedPrimary: "RCA",
        why: "Proaktif risk analizi, olay gerçekleştikten sonra geçmişi açıklayamaz; reaktif analiz devreye girer.",
      },
    ],
  },

  {
    id: "MF6-dispersed-waste-to-constraint",
    title: "Dağınık israftan kanıtlanmış kısıta",
    base: {
      label: "Akış kaybı var, kısıt imzası yok",
      answers: {
        flowOrWaste: true,
        constraintQueue: false,
        downstreamStarvation: false,
        bottleneckThroughput: false,
        hasMeasurementData: true,
      },
      expectedPrimary: "LEAN_VSM",
      expectContested: false,
    },
    mutations: [
      {
        label: "Kısıt imzası ortaya çıktı: kuyruk, açlık ve sayısal doğrulama",
        change: {
          bottleneckThroughput: true,
          constraintQueue: true,
          downstreamStarvation: true,
          constraintMeasured: true,
          constraintLeverageExpected: true,
        },
        expectedPrimary: "TOC",
        why:
          "Aynı akış problemi, kısıt imzası kanıtlandığında uçtan uca haritalamadan kısıt yönetimine döner.",
      },
    ],
  },
];
