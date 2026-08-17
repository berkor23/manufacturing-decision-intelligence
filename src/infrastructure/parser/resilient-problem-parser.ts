import type {
  InitialParse,
  InterpretAnswerInput,
  IProblemParser,
} from "@/application/ports/problem-parser";
import type { Ternary } from "@/domain/diagnosis";

export interface ParserFallbackMetrics {
  initialFallbacks: number;
  answerFallbacks: number;
  lastFallbackAt: string | null;
}

const fallbackMetrics: ParserFallbackMetrics = { initialFallbacks: 0, answerFallbacks: 0, lastFallbackAt: null };
export function parserFallbackMetrics(): Readonly<ParserFallbackMetrics> { return { ...fallbackMetrics }; }
export function resetParserFallbackMetrics(): void { fallbackMetrics.initialFallbacks = 0; fallbackMetrics.answerFallbacks = 0; fallbackMetrics.lastFallbackAt = null; }

/**
 * Birincil parser erişilemediğinde teşhis akışını kullanılabilir tutar.
 *
 * Özellikle yerel Ollama geliştirme makinesinde kapalıyken veya ağ sağlayıcısı
 * geçici olarak cevap vermiyorken kullanıcı 500 hatası görmemelidir. Yedek
 * parser aynı girdiyi deterministik olarak yorumlar; kalıcı veri yazmaz.
 */
export class ResilientProblemParser implements IProblemParser {
  readonly name: string;

  constructor(
    private readonly primary: IProblemParser,
    private readonly fallback: IProblemParser,
  ) {
    this.name = `${primary.name}+${fallback.name}-fallback`;
  }

  async parseInitial(text: string): Promise<InitialParse> {
    try {
      const [primary, deterministic] = await Promise.all([
        this.primary.parseInitial(text),
        this.fallback.parseInitial(text),
      ]);
      // Deterministik parser açık negasyon ve gelecek zaman gibi güvenlik
      // kurallarında son sözü söyler. LLM onun tanımadığı pozitif bağlamları
      // ekleyebilir; böylece sağlayıcı değişince kritik alan sözleşmesi değişmez.
      return {
        processName: primary.processName ?? deterministic.processName,
        problemDescription: primary.problemDescription ?? deterministic.problemDescription,
        features: { ...primary.features, ...deterministic.features },
      };
    } catch (error) {
      this.reportFallback(error, "ilk problem ayrıştırması", "initial");
      return this.fallback.parseInitial(text);
    }
  }

  async interpretAnswer(input: InterpretAnswerInput): Promise<Ternary> {
    try {
      const [primary, deterministic] = await Promise.all([
        this.primary.interpretAnswer(input),
        this.fallback.interpretAnswer(input),
      ]);
      return deterministic ?? primary;
    } catch (error) {
      this.reportFallback(error, "teşhis cevabı yorumlama", "answer");
      return this.fallback.interpretAnswer(input);
    }
  }

  private reportFallback(error: unknown, operation: string, kind: "initial" | "answer") {
    if (kind === "initial") fallbackMetrics.initialFallbacks += 1;
    else fallbackMetrics.answerFallbacks += 1;
    fallbackMetrics.lastFallbackAt = new Date().toISOString();
    const reason = error instanceof Error ? error.name : "Bilinmeyen hata";
    console.warn(`[problem-parser] ${operation} için yedek parser kullanıldı: ${reason}`);
  }
}
