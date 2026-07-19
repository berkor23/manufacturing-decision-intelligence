// Teşhis değişkenleri (DiagnosticFeature) kataloğu — projenin ortak dili.
// Her değişken üç değerlidir: true | false | null (null = bilinmiyor -> soru).
// Bu dosya SAFtır: LLM/DB/framework bağımlılığı yoktur.

export type Ternary = boolean | null;

export const FEATURE_KEYS = [
  "defectOccurred",
  "customerAffected",
  "rootCauseKnown",
  "startedRecently",
  "previouslyOccurred",
  "processChanged",
  "operatorChanged",
  "supplierChanged",
  "hasMeasurementData",
  "highVariation",
  "isImprovementInitiative",
  "workplaceDisorganized",
  "equipmentBreakdown",
  "flowOrWaste",
  "isNewDesign",
  "monitoringNeed",
  "humanErrorProne",
  "bottleneckThroughput",
  "safetyOrRegulatory",
  "intermittent",
  "externalNonconformance",
  "containmentNeeded",
  "measurementReliable",
  "processStable",
  "comparisonAvailable",
  "chronicEquipmentLoss",
  "failureModeKnown",
  "standardWorkEstablished",
  "basicConditionsStable",
] as const;

export type DiagnosticFeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureMeta {
  key: DiagnosticFeatureKey;
  /** Kısa Türkçe etiket (görüntüleme). */
  label: string;
  /** LLM'in doğal soru üretmesi için tema (Faz 2). */
  questionTheme: string;
  /** Decision trace metni: değer true iken. */
  traceWhenTrue: string;
  /** Decision trace metni: değer false iken. */
  traceWhenFalse: string;
}

export const FEATURE_META: Record<DiagnosticFeatureKey, FeatureMeta> = {
  defectOccurred: {
    key: "defectOccurred",
    label: "Hata oluştu mu",
    questionTheme: "Ürün, proses veya ekipmanda fiilen gerçekleşmiş bir hata, kusur, arıza ya da performans kaybı var mı?",
    traceWhenTrue: "Gerçek bir hata oluştu",
    traceWhenFalse: "Henüz hata yok (yalnızca risk)",
  },
  customerAffected: {
    key: "customerAffected",
    label: "Müşteri etkilendi mi",
    questionTheme: "Problem müşterinin teslimat, kullanım veya hizmet deneyimini etkiledi mi?",
    traceWhenTrue: "Müşteri etkilendi",
    traceWhenFalse: "Müşteri etkilenmedi",
  },
  rootCauseKnown: {
    key: "rootCauseKnown",
    label: "Kök neden biliniyor mu",
    questionTheme: "Kök neden ölçüm, kontrollü deney veya tekrar üretme testiyle doğrulandı mı?",
    traceWhenTrue: "Kök neden biliniyor",
    traceWhenFalse: "Kök neden bilinmiyor",
  },
  startedRecently: {
    key: "startedRecently",
    label: "Yeni mi başladı",
    questionTheme: "Problem yakın zamanda, belirlenebilir bir tarihten sonra mı başladı?",
    traceWhenTrue: "Problem yeni başladı",
    traceWhenFalse: "Problem kronik / uzun süredir var",
  },
  previouslyOccurred: {
    key: "previouslyOccurred",
    label: "Daha önce yaşandı mı",
    questionTheme: "Aynı hata tanımı, konum ve oluşma koşullarıyla eşleşen benzer kayıtlar var mı?",
    traceWhenTrue: "Daha önce de yaşandı (tekrar eden)",
    traceWhenFalse: "İlk kez yaşanıyor",
  },
  processChanged: {
    key: "processChanged",
    label: "Süreç değişti mi",
    questionTheme: "Problem başlamadan kısa süre önce proses, parametre veya ekipmanda değişiklik yapıldı mı?",
    traceWhenTrue: "Süreç yakın zamanda değişti",
    traceWhenFalse: "Süreç değişmedi",
  },
  operatorChanged: {
    key: "operatorChanged",
    label: "Operatör değişti mi",
    questionTheme: "Problem başlangıcı vardiya, ekip veya operatör değişimiyle çakışıyor mu?",
    traceWhenTrue: "Operatör değişti",
    traceWhenFalse: "Operatör değişmedi",
  },
  supplierChanged: {
    key: "supplierChanged",
    label: "Tedarikçi değişti mi",
    questionTheme: "Problem başlangıcı malzeme, parti veya tedarikçi değişimiyle çakışıyor mu?",
    traceWhenTrue: "Tedarikçi değişti",
    traceWhenFalse: "Tedarikçi değişmedi",
  },
  hasMeasurementData: {
    key: "hasMeasurementData",
    label: "Ölçüm verisi var mı",
    questionTheme: "Problemin büyüklüğünü ve zaman içindeki davranışını gösteren sayısal veri var mı?",
    traceWhenTrue: "Ölçüm verisi mevcut",
    traceWhenFalse: "Ölçüm verisi yok",
  },
  highVariation: {
    key: "highVariation",
    label: "Varyasyon yüksek mi",
    questionTheme: "Proses çıktısının dağılımı müşteri veya spesifikasyon toleransına göre gereğinden geniş mi?",
    traceWhenTrue: "Varyasyon yüksek/sürekli",
    traceWhenFalse: "Varyasyon düşük/stabil",
  },
  isImprovementInitiative: {
    key: "isImprovementInitiative",
    label: "İyileştirme çalışması mı",
    questionTheme: "Bu çalışma gerçekleşmiş bir hatadan bağımsız, planlı bir performans iyileştirmesi mi?",
    traceWhenTrue: "Akut hata değil, iyileştirme çalışması",
    traceWhenFalse: "İyileştirme değil, akut problem",
  },
  workplaceDisorganized: {
    key: "workplaceDisorganized",
    label: "İş yeri düzensiz mi",
    questionTheme: "Kayıpların temel nedeni malzeme, araç, doküman veya çalışma alanı için sürdürülen standart yerlerin bulunmaması mı?",
    traceWhenTrue: "İş yeri düzensiz/organizasyonsuz",
    traceWhenFalse: "İş yeri düzenli",
  },
  equipmentBreakdown: {
    key: "equipmentBreakdown",
    label: "Ekipman arızası var mı",
    questionTheme: "Temel problem ekipman arızası, plansız duruş veya güvenilirlik kaybı mı?",
    traceWhenTrue: "Ekipman arızası/duruşu var",
    traceWhenFalse: "Ekipman sorunu yok",
  },
  flowOrWaste: {
    key: "flowOrWaste",
    label: "Akış/israf sorunu mu",
    questionTheme: "Bekleme, ara stok, taşıma veya uzun akış süresi temel problem mi?",
    traceWhenTrue: "Akış/israf/temin süresi sorunu",
    traceWhenFalse: "Akış/israf sorunu değil",
  },
  isNewDesign: {
    key: "isNewDesign",
    label: "Yeni tasarım mı",
    questionTheme: "Mevcut çözümü iyileştirmek yerine yeni veya temelden yeniden tasarlanmış bir ürün ya da proses mi geliştiriliyor?",
    traceWhenTrue: "Yeni ürün/süreç tasarımı",
    traceWhenFalse: "Mevcut problemi çözme (yeni tasarım değil)",
  },
  monitoringNeed: {
    key: "monitoringNeed",
    label: "Sürekli izleme mi",
    questionTheme: "Asıl ihtiyaç gelecekte oluşabilecek özel nedenli sapmaları erken tespit etmek mi?",
    traceWhenTrue: "Süreci sürekli izleme/kontrol ihtiyacı",
    traceWhenFalse: "Sürekli izleme ihtiyacı değil",
  },
  humanErrorProne: {
    key: "humanErrorProne",
    label: "Hata sistemden kaçabilir mi",
    questionTheme: "Yanlış veya eksik işlem sistem tarafından engellenmeden sonraki aşamaya geçebiliyor mu?",
    traceWhenTrue: "Yanlış işlem sistem tarafından önlenmiyor",
    traceWhenFalse: "Yanlış işlem sistem tarafından önleniyor",
  },
  bottleneckThroughput: {
    key: "bottleneckThroughput",
    label: "Dar boğaz mı",
    questionTheme: "Belirli bir kaynak, proses adımı veya yönetim kuralı sistemin toplam çıktısını sürekli sınırlıyor mu?",
    traceWhenTrue: "Dar boğaz/kapasite/çıktı kısıtı",
    traceWhenFalse: "Dar boğaz/kapasite sorunu değil",
  },
  safetyOrRegulatory: {
    key: "safetyOrRegulatory",
    label: "Güvenlik/yasal mı",
    questionTheme: "Problem güvenlik, zorunlu uygunluk veya geri çağırma riski oluşturuyor mu?",
    traceWhenTrue: "Güvenlik/regülasyon etkisi var",
    traceWhenFalse: "Güvenlik/regülasyon etkisi yok",
  },
  intermittent: {
    key: "intermittent",
    label: "Aralıklı mı",
    questionTheme: "Problem düzensiz aralıklarla ortaya çıkıp sonra kayboluyor mu?",
    traceWhenTrue: "Aralıklı/sporadik ortaya çıkıyor",
    traceWhenFalse: "Sürekli/istikrarlı ortaya çıkıyor",
  },
  externalNonconformance: {
    key: "externalNonconformance",
    label: "Uygunsuzluk müşteriye ulaştı mı",
    questionTheme: "Uygunsuz ürün, hizmet veya doğrulanmış kalite kusuru müşteriye ulaştı mı?",
    traceWhenTrue: "Doğrulanmış uygunsuzluk müşteriye ulaştı",
    traceWhenFalse: "Müşteriye ulaşmış uygunsuzluk yok",
  },
  containmentNeeded: {
    key: "containmentNeeded",
    label: "Acil koruma gerekli mi",
    questionTheme: "Etkilenen müşteriyi veya sonraki prosesi korumak için ayıklama, blokaj ya da geçici önlem gerekiyor mu?",
    traceWhenTrue: "Acil containment/geçici koruma gerekli",
    traceWhenFalse: "Acil containment ihtiyacı yok",
  },
  measurementReliable: {
    key: "measurementReliable",
    label: "Ölçüm güvenilir mi",
    questionTheme: "Ölçüm yöntemi tanımlı, tekrarlanabilir ve karar vermek için yeterince güvenilir mi?",
    traceWhenTrue: "Ölçüm sistemi karar vermek için güvenilir",
    traceWhenFalse: "Ölçüm sistemi henüz güvenilir değil",
  },
  processStable: {
    key: "processStable",
    label: "Proses kararlı mı",
    questionTheme: "Prosesin zaman içinde istatistiksel olarak kararlı olduğu verilerle doğrulandı mı?",
    traceWhenTrue: "Prosesin istatistiksel kararlılığı doğrulandı",
    traceWhenFalse: "Proses kararlı değil veya kararlılığı doğrulanmadı",
  },
  comparisonAvailable: {
    key: "comparisonAvailable",
    label: "Karşılaştırma yapılabilir mi",
    questionTheme: "Problemin görüldüğü ve görülmediği ürün, makine, vardiya veya dönemler karşılaştırılabiliyor mu?",
    traceWhenTrue: "Problemli ve problemsiz koşullar karşılaştırılabiliyor",
    traceWhenFalse: "Ayırıcı karşılaştırma henüz yapılamıyor",
  },
  chronicEquipmentLoss: {
    key: "chronicEquipmentLoss",
    label: "Ekipman kaybı kronik mi",
    questionTheme: "Ekipman sorunu tekrar eden duruş, hız kaybı veya kullanılabilirlik düşüşü şeklinde kronikleşmiş mi?",
    traceWhenTrue: "Ekipman kaybı kronik ve tekrar eden nitelikte",
    traceWhenFalse: "Ekipman sorunu tekil veya akut nitelikte",
  },
  failureModeKnown: {
    key: "failureModeKnown",
    label: "Hata modu tanımlı mı",
    questionTheme: "Önlenmek istenen yanlış işlem veya hata modu açık ve gözlemlenebilir biçimde tanımlandı mı?",
    traceWhenTrue: "Önlenecek hata modu açıkça tanımlı",
    traceWhenFalse: "Önlenecek hata modu henüz net değil",
  },
  standardWorkEstablished: {
    key: "standardWorkEstablished",
    label: "Standart iş yerleşik mi",
    questionTheme: "İşin mevcut en iyi yapılış biçimi tanımlı ve vardiyalar arasında aynı şekilde uygulanıyor mu?",
    traceWhenTrue: "Standart iş tanımlı ve tutarlı uygulanıyor",
    traceWhenFalse: "Standart iş eksik veya uygulama vardiyalar arasında değişiyor",
  },
  basicConditionsStable: {
    key: "basicConditionsStable",
    label: "Temel koşullar sağlanıyor mu",
    questionTheme: "İnsan, makine, malzeme ve yöntem için tanımlı asgari çalışma koşulları düzenli olarak sağlanıyor mu?",
    traceWhenTrue: "Temel çalışma koşulları tanımlı ve sağlanıyor",
    traceWhenFalse: "Temel çalışma koşullarında eksik veya değişkenlik var",
  },
};

export interface StructuredProblem {
  processName: string | null;
  problemDescription: string | null;
  features: Record<DiagnosticFeatureKey, Ternary>;
}

export function createEmptyProblem(): StructuredProblem {
  const features = {} as Record<DiagnosticFeatureKey, Ternary>;
  for (const key of FEATURE_KEYS) features[key] = null;
  return { processName: null, problemDescription: null, features };
}

/** Verilen alanları doldurarak bir StructuredProblem üretir (test/kolaylık). */
export function problemWith(
  overrides: Partial<Record<DiagnosticFeatureKey, Ternary>>,
  meta: Partial<Pick<StructuredProblem, "processName" | "problemDescription">> = {},
): StructuredProblem {
  const p = createEmptyProblem();
  Object.assign(p.features, overrides);
  if (meta.processName !== undefined) p.processName = meta.processName;
  if (meta.problemDescription !== undefined) p.problemDescription = meta.problemDescription;
  return p;
}

export function unknownFeatures(p: StructuredProblem): DiagnosticFeatureKey[] {
  return FEATURE_KEYS.filter((k) => p.features[k] === null);
}

export function knownFeatures(p: StructuredProblem): DiagnosticFeatureKey[] {
  return FEATURE_KEYS.filter((k) => p.features[k] !== null);
}

/** Türetilmiş: süreç/operatör/tedarikçi değişikliklerinden herhangi biri. */
export function anyChange(p: StructuredProblem): Ternary {
  const vals = [
    p.features.processChanged,
    p.features.operatorChanged,
    p.features.supplierChanged,
  ];
  if (vals.some((v) => v === true)) return true;
  if (vals.every((v) => v === false)) return false;
  return null;
}

/** Bir alanı değiştirip yeni (kopya) problem döndürür — saf/immutable. */
export function withFeature(
  p: StructuredProblem,
  key: DiagnosticFeatureKey,
  value: Ternary,
): StructuredProblem {
  return { ...p, features: { ...p.features, [key]: value } };
}
