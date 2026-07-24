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
  "decisionBetweenOptions",
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
    questionTheme: "Şu an gerçekleşmiş bir hata mı var, yoksa henüz oluşmamış olası bir risk mi?",
    traceWhenTrue: "Gerçek bir hata oluştu",
    traceWhenFalse: "Henüz hata yok (yalnızca risk)",
  },
  customerAffected: {
    key: "customerAffected",
    label: "Müşteri etkilendi mi",
    questionTheme: "Bu durum müşteriye yansıdı mı; teslimatını ya da kullanımını etkiledi mi?",
    traceWhenTrue: "Müşteri etkilendi",
    traceWhenFalse: "Müşteri etkilenmedi",
  },
  rootCauseKnown: {
    key: "rootCauseKnown",
    label: "Kök neden biliniyor mu",
    questionTheme: "Kök nedeni gerçekten biliyor muyuz; ölçüm ya da denemeyle doğrulandı mı, yoksa henüz tahmin mi?",
    traceWhenTrue: "Kök neden biliniyor",
    traceWhenFalse: "Kök neden bilinmiyor",
  },
  startedRecently: {
    key: "startedRecently",
    label: "Yeni mi başladı",
    questionTheme: "Sorun yakın zamanda mı başladı, yoksa uzun zamandır mı sürüyor?",
    traceWhenTrue: "Problem yeni başladı",
    traceWhenFalse: "Problem kronik / uzun süredir var",
  },
  previouslyOccurred: {
    key: "previouslyOccurred",
    label: "Daha önce yaşandı mı",
    questionTheme: "Aynı sorun daha önce de yaşandı mı?",
    traceWhenTrue: "Daha önce de yaşandı (tekrar eden)",
    traceWhenFalse: "İlk kez yaşanıyor",
  },
  processChanged: {
    key: "processChanged",
    label: "Süreç değişti mi",
    questionTheme: "Sorun başlamadan hemen önce süreçte, ayarlarda ya da ekipmanda bir değişiklik oldu mu?",
    traceWhenTrue: "Süreç yakın zamanda değişti",
    traceWhenFalse: "Süreç değişmedi",
  },
  operatorChanged: {
    key: "operatorChanged",
    label: "Operatör değişti mi",
    questionTheme: "Sorunun başladığı zaman bir vardiya ya da operatör değişimine denk geliyor mu?",
    traceWhenTrue: "Operatör değişti",
    traceWhenFalse: "Operatör değişmedi",
  },
  supplierChanged: {
    key: "supplierChanged",
    label: "Tedarikçi değişti mi",
    questionTheme: "O sıralarda malzeme, parti ya da tedarikçi değişti mi?",
    traceWhenTrue: "Tedarikçi değişti",
    traceWhenFalse: "Tedarikçi değişmedi",
  },
  hasMeasurementData: {
    key: "hasMeasurementData",
    label: "Ölçüm verisi var mı",
    questionTheme: "Elinizde bu sorunla ilgili ölçüm ya da sayısal veri var mı?",
    traceWhenTrue: "Ölçüm verisi mevcut",
    traceWhenFalse: "Ölçüm verisi yok",
  },
  highVariation: {
    key: "highVariation",
    label: "Varyasyon yüksek mi",
    questionTheme: "Sonuçlar sürekli oynuyor mu; ölçümler arasında büyük dalgalanma var mı?",
    traceWhenTrue: "Varyasyon yüksek/sürekli",
    traceWhenFalse: "Varyasyon düşük/stabil",
  },
  isImprovementInitiative: {
    key: "isImprovementInitiative",
    label: "İyileştirme çalışması mı",
    questionTheme: "Ortada acil bir hata mı var, yoksa mevcut durumu daha iyiye götürme çalışması mı?",
    traceWhenTrue: "Akut hata değil, iyileştirme çalışması",
    traceWhenFalse: "İyileştirme değil, akut problem",
  },
  workplaceDisorganized: {
    key: "workplaceDisorganized",
    label: "İş yeri düzensiz mi",
    questionTheme: "Kayıpların asıl nedeni çalışma alanının dağınıklığı, her şeyin belirli bir yerinin olmaması mı?",
    traceWhenTrue: "İş yeri düzensiz/organizasyonsuz",
    traceWhenFalse: "İş yeri düzenli",
  },
  equipmentBreakdown: {
    key: "equipmentBreakdown",
    label: "Ekipman arızası var mı",
    questionTheme: "Sorunun merkezinde makine arızası ya da beklenmedik duruş mu var?",
    traceWhenTrue: "Ekipman arızası/duruşu var",
    traceWhenFalse: "Ekipman sorunu yok",
  },
  flowOrWaste: {
    key: "flowOrWaste",
    label: "Akış/israf sorunu mu",
    questionTheme: "Asıl sıkıntı beklemeler, ara stoklar ya da işin gereğinden uzun sürmesi mi?",
    traceWhenTrue: "Akış/israf/temin süresi sorunu",
    traceWhenFalse: "Akış/israf sorunu değil",
  },
  isNewDesign: {
    key: "isNewDesign",
    label: "Yeni tasarım mı",
    questionTheme: "Var olan bir sorunu mu çözüyoruz, yoksa sıfırdan yeni bir ürün ya da süreç mi tasarlıyoruz?",
    traceWhenTrue: "Yeni ürün/süreç tasarımı",
    traceWhenFalse: "Mevcut problemi çözme (yeni tasarım değil)",
  },
  monitoringNeed: {
    key: "monitoringNeed",
    label: "Sürekli izleme mi",
    questionTheme: "Asıl ihtiyaç, süreci sürekli takip edip bir şeyler bozulduğunda erken görmek mi?",
    traceWhenTrue: "Süreci sürekli izleme/kontrol ihtiyacı",
    traceWhenFalse: "Sürekli izleme ihtiyacı değil",
  },
  humanErrorProne: {
    key: "humanErrorProne",
    label: "Hata sistemden kaçabilir mi",
    questionTheme: "Biri yanlış yaptığında onu durduran bir engel var mı, yoksa hata öylece sonraki adıma geçebiliyor mu?",
    traceWhenTrue: "Yanlış işlem sistem tarafından önlenmiyor",
    traceWhenFalse: "Yanlış işlem sistem tarafından önleniyor",
  },
  bottleneckThroughput: {
    key: "bottleneckThroughput",
    label: "Dar boğaz mı",
    questionTheme: "Tek bir nokta —bir tezgâh ya da adım— tüm hattın çıktısını sürekli sınırlıyor mu?",
    traceWhenTrue: "Dar boğaz/kapasite/çıktı kısıtı",
    traceWhenFalse: "Dar boğaz/kapasite sorunu değil",
  },
  safetyOrRegulatory: {
    key: "safetyOrRegulatory",
    label: "Güvenlik/yasal mı",
    questionTheme: "Bu sorunun güvenlik ya da yasal uygunluk açısından bir riski var mı?",
    traceWhenTrue: "Güvenlik/regülasyon etkisi var",
    traceWhenFalse: "Güvenlik/regülasyon etkisi yok",
  },
  intermittent: {
    key: "intermittent",
    label: "Aralıklı mı",
    questionTheme: "Sorun bir çıkıp bir kayboluyor mu, yoksa sürekli mi görülüyor?",
    traceWhenTrue: "Aralıklı/sporadik ortaya çıkıyor",
    traceWhenFalse: "Sürekli/istikrarlı ortaya çıkıyor",
  },
  externalNonconformance: {
    key: "externalNonconformance",
    label: "Uygunsuzluk müşteriye ulaştı mı",
    questionTheme: "Hatalı ürün fiilen müşteriye kadar ulaştı mı?",
    traceWhenTrue: "Doğrulanmış uygunsuzluk müşteriye ulaştı",
    traceWhenFalse: "Müşteriye ulaşmış uygunsuzluk yok",
  },
  containmentNeeded: {
    key: "containmentNeeded",
    label: "Acil koruma gerekli mi",
    questionTheme: "Şu an müşteriyi ya da bir sonraki adımı korumak için acil bir önlem (ayıklama, bloke etme) gerekiyor mu?",
    traceWhenTrue: "Acil containment/geçici koruma gerekli",
    traceWhenFalse: "Acil containment ihtiyacı yok",
  },
  measurementReliable: {
    key: "measurementReliable",
    label: "Ölçüm güvenilir mi",
    questionTheme: "Ölçümlerinize güveniyor musunuz; aynı şeyi ölçtüğünüzde tutarlı sonuç veriyor mu?",
    traceWhenTrue: "Ölçüm sistemi karar vermek için güvenilir",
    traceWhenFalse: "Ölçüm sistemi henüz güvenilir değil",
  },
  processStable: {
    key: "processStable",
    label: "Proses kararlı mı",
    questionTheme: "Süreç zaman içinde kararlı mı, yoksa ara ara ani sıçramalar oluyor mu?",
    traceWhenTrue: "Prosesin istatistiksel kararlılığı doğrulandı",
    traceWhenFalse: "Proses kararlı değil veya kararlılığı doğrulanmadı",
  },
  comparisonAvailable: {
    key: "comparisonAvailable",
    label: "Karşılaştırma yapılabilir mi",
    questionTheme: "Sorunun olduğu ve olmadığı durumları —makine, vardiya, dönem— karşılaştırabiliyor musunuz?",
    traceWhenTrue: "Problemli ve problemsiz koşullar karşılaştırılabiliyor",
    traceWhenFalse: "Ayırıcı karşılaştırma henüz yapılamıyor",
  },
  chronicEquipmentLoss: {
    key: "chronicEquipmentLoss",
    label: "Ekipman kaybı kronik mi",
    questionTheme: "Makine sorunu tek seferlik mi, yoksa sürekli tekrarlayan bir duruş ya da hız kaybı mı?",
    traceWhenTrue: "Ekipman kaybı kronik ve tekrar eden nitelikte",
    traceWhenFalse: "Ekipman sorunu tekil veya akut nitelikte",
  },
  failureModeKnown: {
    key: "failureModeKnown",
    label: "Hata modu tanımlı mı",
    questionTheme: "Önlemek istediğiniz hata tam olarak belli mi; ne olduğunu net tarif edebiliyor musunuz?",
    traceWhenTrue: "Önlenecek hata modu açıkça tanımlı",
    traceWhenFalse: "Önlenecek hata modu henüz net değil",
  },
  standardWorkEstablished: {
    key: "standardWorkEstablished",
    label: "Standart iş yerleşik mi",
    questionTheme: "İşin tanımlı bir standart yapılış biçimi var mı ve herkes aynı şekilde mi uyguluyor?",
    traceWhenTrue: "Standart iş tanımlı ve tutarlı uygulanıyor",
    traceWhenFalse: "Standart iş eksik veya uygulama vardiyalar arasında değişiyor",
  },
  basicConditionsStable: {
    key: "basicConditionsStable",
    label: "Temel koşullar sağlanıyor mu",
    questionTheme: "Temel çalışma koşulları —insan, makine, malzeme, yöntem— düzenli olarak sağlanıyor mu?",
    traceWhenTrue: "Temel çalışma koşulları tanımlı ve sağlanıyor",
    traceWhenFalse: "Temel çalışma koşullarında eksik veya değişkenlik var",
  },
  decisionBetweenOptions: {
    key: "decisionBetweenOptions",
    label: "Alternatif arası seçim mi",
    questionTheme: "Bu bir hata/arıza problemi mi, yoksa tanımlı seçenekler arasından en iyisini seçme kararı mı?",
    traceWhenTrue: "Tanımlı alternatifler arasından yapılacak bir seçim kararı",
    traceWhenFalse: "Alternatif seçimi değil, çözülmesi gereken bir problem/olay",
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
