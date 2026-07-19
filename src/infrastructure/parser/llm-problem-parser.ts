// LLM tabanlı parser — IAIProvider (Ollama) kullanır. KATI: çıktı zod ile
// doğrulanır, uydurma alan atılır, delil yoksa alan yok sayılır (=> null => sorulur).

import { z } from "zod";
import {
  IProblemParser,
  InitialParse,
  InterpretAnswerInput,
} from "@/application/ports/problem-parser";
import { IAIProvider } from "@/application/ports/ai-provider";
import {
  DiagnosticFeatureKey,
  Ternary,
  FEATURE_KEYS,
  FEATURE_META,
} from "@/domain/diagnosis";

const featureSchema = z.object(
  Object.fromEntries(FEATURE_KEYS.map((k) => [k, z.boolean().optional()])),
) as z.ZodType<Partial<Record<DiagnosticFeatureKey, boolean>>>;

function featureCatalog(): string {
  return FEATURE_KEYS.map((k) => `- ${k}: ${FEATURE_META[k].questionTheme}`).join("\n");
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return {};
  }
}

export class LlmProblemParser implements IProblemParser {
  readonly name = "llm";

  constructor(private readonly ai: IAIProvider) {}

  async parseInitial(text: string): Promise<InitialParse> {
    const system = [
      "Sen bir üretim problemi analiz asistanısın. Görevin, kullanıcının serbest",
      "metnini yapılandırmaktır — TEŞHİS ETMEK DEĞİL.",
      "",
      "KURAL (çok önemli): SADECE metinde AÇIKÇA doğrulanan durumları işaretle ve",
      "değeri HER ZAMAN true yaz. Bir durum metinde geçmiyorsa VEYA 'olmadığı/yok'",
      "deniyorsa, o alanı JSON'a HİÇ YAZMA. Tahmin/çıkarım yapma; emin değilsen yazma.",
      "false değeri ASLA yazma. Sadece geçerli JSON döndür, başka metin yazma.",
      "",
      "Alanlar (yalnızca DOĞRULANAN olanları true olarak yaz):",
      featureCatalog(),
      "",
      "Örnek 1:",
      'Metin: "Müşteri şikayet etti, üründe çatlak var."',
      'JSON: {"customerAffected": true, "defectOccurred": true}',
      "(Diğer alanlardan bahsedilmediği için YAZILMADI.)",
      "",
      "Örnek 2:",
      'Metin: "İki haftadır ölçümlerde varyasyon yüksek."',
      'JSON: {"startedRecently": true, "hasMeasurementData": true, "highVariation": true}',
    ].join("\n");

    const raw = await this.ai.complete({
      system,
      prompt: `Metin: """${text}"""\nJSON:`,
      temperature: 0.1,
      maxTokens: 400,
    });

    const parsed = featureSchema.safeParse(extractJson(raw));
    const features: Partial<Record<DiagnosticFeatureKey, Ternary>> = {};
    if (parsed.success) {
      for (const [k, v] of Object.entries(parsed.data)) {
        // YALNIZCA pozitif kanıt kabul edilir. Zayıf yerel model, bahsedilmeyen
        // alanlar için güvenilmez şekilde false üretebiliyor; bu da adaptif
        // soru-cevabı atlatıp yanlış değer enjekte ediyordu. false'ları düşürüp
        // alanı null bırakıyoruz → motor soruyor ("delil yoksa sor" ilkesi).
        if (v === true) features[k as DiagnosticFeatureKey] = true;
      }
    }

    return { processName: null, problemDescription: text.trim() || null, features };
  }

  async interpretAnswer(input: InterpretAnswerInput): Promise<Ternary> {
    // Soru temaları çoğu zaman çift kutupludur ("...mı, yoksa ...mı?"). Böyle bir
    // temayı doğrudan EVET/HAYIR'a indirmek yerel modeli şaşırtıp cevabı yanlışlıkla
    // BILINMIYOR'a düşürüyordu (ör. "aylardır böyle" → kronik → HAYIR beklenirken
    // BILINMIYOR). Bu yüzden modele feature'ın TRUE ve FALSE anlamını açıkça verip
    // cevabı bu duruma göre sınıflandırtıyoruz; EVET = TRUE anlamı, HAYIR = FALSE anlamı.
    const meta = FEATURE_META[input.featureKey];
    const system = [
      "Bir kullanıcı, üretim problemine dair bir soruya serbest metinle cevap verdi.",
      "Görevin: cevabın aşağıdaki DURUMU doğrulayıp doğrulamadığına karar vermek.",
      "- Cevap DURUMU doğruluyorsa yalnızca 'EVET' yaz.",
      "- Cevap DURUMUN TERSİNİ söylüyorsa yalnızca 'HAYIR' yaz.",
      "- Cevap gerçekten belirsiz/kararsızsa yalnızca 'BILINMIYOR' yaz.",
      "Önemli: Cevabın başındaki net 'evet/hayır/var/yok' polaritesine öncelik ver.",
      "Koşul/varsayım ifadeleri ('olabilirdi', 'edebilirdi', 'riski var') gerçekleşmiş",
      "saymaz; bunlar cevabın net polaritesini DEĞİŞTİRMEZ.",
      "Sadece bu tek kelimeyi yaz, başka hiçbir şey yazma.",
      "",
      "Örnek — DURUM: 'Müşteri etkilendi' / Cevap: 'hayır ama etkilenebilirdi' -> HAYIR",
      "Örnek — DURUM: 'Problem yeni başladı' / Cevap: 'yok, aylardır böyle' -> HAYIR",
      "Örnek — DURUM: 'Ölçüm verisi mevcut' / Cevap: 'evet birkaç ölçümümüz var' -> EVET",
    ].join("\n");

    const prompt = [
      `Soru: ${input.questionTheme}`,
      `DURUM (EVET bunu doğrular): ${meta.traceWhenTrue}`,
      `Tersi (HAYIR bunu doğrular): ${meta.traceWhenFalse}`,
      `Cevap: """${input.answerText}"""`,
      "Sonuç:",
    ].join("\n");

    const raw = await this.ai.complete({
      system,
      prompt,
      temperature: 0,
      maxTokens: 8,
    });

    const t = raw.toLocaleLowerCase("tr");
    if (t.includes("evet")) return true;
    if (t.includes("hayır") || t.includes("hayir")) return false;
    return null;
  }
}
