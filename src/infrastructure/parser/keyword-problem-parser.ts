// Deterministik, LLM'siz parser — Türkçe anahtar kelime eşlemesi.
// Amaç: Ollama olmadan da tüm hattı uçtan uca çalıştırabilmek + testlerde
// deterministik davranış. LLM parser (llm-problem-parser) devreye girince
// bunun yerini alır; ama bu her zaman güvenli bir yedek (fallback) kalır.

import {
  IProblemParser,
  InitialParse,
  InterpretAnswerInput,
} from "@/application/ports/problem-parser";
import { DiagnosticFeatureKey, Ternary } from "@/domain/diagnosis";

type Signal = { key: DiagnosticFeatureKey; value: boolean; patterns: RegExp[] };

// Not: Sıra önemlidir; daha spesifik (false) kalıplar önce denenmelidir.
const SIGNALS: Signal[] = [
  // rootCauseKnown — önce açık "bilinmiyor", sonra "biliniyor"
  { key: "rootCauseKnown", value: false, patterns: [/kök neden.*(bilinmiyor|belirsiz|yok)/, /neden(i|ini)? bilinmiyor/, /sebeb(i|ini)? belirsiz/] },
  { key: "rootCauseKnown", value: true, patterns: [/kök neden.*(biliniyor|belli)/, /neden(i|ini)? belli/] },

  { key: "customerAffected", value: true, patterns: [/müşteri/, /şikayet/, /iade/, /sahadan/, /sevkiyat/] },
  { key: "defectOccurred", value: false, patterns: [/hata yok/, /henüz.*(olmad|yok)/, /sadece risk/, /risk var.*hata yok/] },
  { key: "defectOccurred", value: true, patterns: [/hata/, /kusur/, /çatlak/, /arıza/, /hurda/, /\bred\b/, /kırıl/, /kaçak/, /deform/] },

  { key: "isImprovementInitiative", value: true, patterns: [/iyileştir/, /kaizen/, /optimize/, /geliştir(mek|me)/, /verimlilik/] },

  { key: "previouslyOccurred", value: true, patterns: [/tekrar/, /yine/, /daha önce.*(yaşan|old)/, /geçmişte de/, /sürekli.*(oluyor|yaşan)/] },
  { key: "startedRecently", value: true, patterns: [/yeni başla/, /son.*(hafta|gün|ay)/, /geçen hafta/, /bu hafta/, /aniden/, /\dgün(dür)?/, /haftadır/, /başladı/] },

  { key: "processChanged", value: true, patterns: [/süreç değiş/, /parametre değiş/, /ayar değiş/, /yeni makine/, /revizyon/, /proses değiş/] },
  { key: "operatorChanged", value: true, patterns: [/operatör değiş/, /vardiya değiş/, /yeni personel/, /yeni operatör/] },
  { key: "supplierChanged", value: true, patterns: [/tedarikçi değiş/, /malzeme değiş/, /hammadde değiş/, /yeni parti/, /yeni tedarikçi/] },

  { key: "hasMeasurementData", value: true, patterns: [/ölçüm/, /veri var/, /\bdata\b/, /kayıt(lar)?/, /\bspc\b/, /grafik/, /trend/] },
  { key: "highVariation", value: true, patterns: [/varyasyon/, /değişkenlik/, /salınım/, /dağılım geniş/, /stabil değil/, /oynak/] },

  // Genişletilmiş metodoloji sinyalleri
  { key: "isNewDesign", value: false, patterns: [/yeni (ürün|süreç|proses|tasarım).*(değil|değildir)/, /mevcut (ürün|süreç|proses)/, /seri üretimdeki/] },
  { key: "isNewDesign", value: true, patterns: [/yeni ürün/, /yeni tasarım/, /sıfırdan tasarl/, /tasarl(ıyoruz|anıyor|amak)/, /\bdfss\b/, /\bdmadv\b/] },
  { key: "equipmentBreakdown", value: true, patterns: [/arıza/, /makine durd/, /ekipman/, /duruş/, /\bbakım\b/, /motor yan/, /rulman/, /tezgah durd/] },
  { key: "workplaceDisorganized", value: true, patterns: [/dağınık/, /düzensiz/, /karışık/, /aletler yerinde değil/, /\b5s\b/, /temiz değil/, /organize değil/] },
  { key: "bottleneckThroughput", value: true, patterns: [/dar boğaz/, /darboğaz/, /kapasite/, /throughput/, /çıktı yetersiz/, /yetişmiyor/, /\bkısıt\b/] },
  { key: "flowOrWaste", value: true, patterns: [/israf/, /bekleme/, /\bwip\b/, /ara stok/, /taşıma/, /temin süresi/, /teslim süresi/, /akış (sorun|problem)/, /lead time/] },
  { key: "humanErrorProne", value: true, patterns: [/insan hatası/, /operatör hatası/, /yanlış montaj/, /ters tak/, /unut/, /karıştır/, /poka/] },
  { key: "monitoringNeed", value: true, patterns: [/kontrol kartı/, /sürekli izle/, /sürekli takip/, /monitör/, /kontrol altında tut/] },
  { key: "safetyOrRegulatory", value: true, patterns: [/güvenlik/, /iş güvenliği/, /yaralanma/, /regülasyon/, /yasal/, /\bce\b/, /geri çağır/, /recall/] },
  { key: "intermittent", value: true, patterns: [/ara ara/, /bazen/, /sporadik/, /zaman zaman/, /aralıklı/, /kesintili/] },
  { key: "externalNonconformance", value: true, patterns: [/müşteriye.*(ulaşt|gitti)/, /sahadan iade/, /müşteride.*(hata|kusur|uygunsuz)/] },
  { key: "containmentNeeded", value: true, patterns: [/ayıklama/, /blokaj/, /karantina/, /geçici önlem/, /containment/] },
  { key: "measurementReliable", value: true, patterns: [/ölçüm sistemi.*(güvenilir|doğruland)/, /gage r&r/, /msa.*(uygun|geçti)/, /tekrarlanabilir ölçüm/] },
  { key: "processStable", value: true, patterns: [/istatistiksel.*kararlı/, /proses.*stabil/, /kontrol altında/] },
  { key: "comparisonAvailable", value: true, patterns: [/karşılaştır/, /olan.*olmayan/, /is.?is.not/] },
  { key: "chronicEquipmentLoss", value: true, patterns: [/kronik.*(arıza|duruş|kayıp)/, /tekrar eden.*(arıza|duruş)/, /oee.*düş/] },
  { key: "failureModeKnown", value: true, patterns: [/hata modu.*(belli|biliniyor|tanımlı)/, /yanlış işlem.*tanımlı/] },
  { key: "standardWorkEstablished", value: false, patterns: [/standart iş.*(yok|eksik|uygulanmıyor)/, /vardiya.*farklı yöntem/, /herkes.*farklı yap/] },
  { key: "standardWorkEstablished", value: true, patterns: [/standart iş.*(var|tanımlı|uygulanıyor)/, /standart operasyon.*tanımlı/] },
  { key: "basicConditionsStable", value: false, patterns: [/temel koşul.*(sağlanmıyor|eksik)/, /4m.*(değişken|kararsız)/] },
  { key: "basicConditionsStable", value: true, patterns: [/temel koşul.*(sağlanıyor|kararlı)/, /4m.*(kararlı|kontrol altında)/] },
];

const YES = [/\bevet\b/, /\bvar\b/, /oldu/, /etkilendi/, /değişti/, /biliniyor/, /yüksek/, /\bdoğru\b/, /geçti/, /mevcut/, /\baynen\b/];
const NO = [/\bhayır\b/, /\byok\b/, /olmadı/, /etkilenmedi/, /değişmedi/, /bilinmiyor/, /düşük/, /stabil/, /\bdeğil\b/, /\byanlış\b/];
const UNKNOWN = [/bilmiyorum/, /emin değil/, /belirsiz/, /fikrim yok/];

function normalize(s: string): string {
  return s.toLocaleLowerCase("tr");
}

export class KeywordProblemParser implements IProblemParser {
  readonly name = "keyword";

  async parseInitial(text: string): Promise<InitialParse> {
    const t = normalize(text);
    const features: Partial<Record<DiagnosticFeatureKey, Ternary>> = {};

    for (const sig of SIGNALS) {
      if (features[sig.key] !== undefined) continue; // ilk (en spesifik) eşleşme kazanır
      if (sig.patterns.some((re) => re.test(t))) {
        features[sig.key] = sig.value;
      }
    }

    return {
      processName: null,
      problemDescription: text.trim() || null,
      features,
    };
  }

  async interpretAnswer(input: InterpretAnswerInput): Promise<Ternary> {
    const t = normalize(input.answerText);
    if (UNKNOWN.some((re) => re.test(t))) return null;
    const yes = YES.some((re) => re.test(t));
    const no = NO.some((re) => re.test(t));
    if (yes && !no) return true;
    if (no && !yes) return false;
    return null; // belirsiz -> alan null kalır, tekrar sorulmaz (dışlanır)
  }
}
