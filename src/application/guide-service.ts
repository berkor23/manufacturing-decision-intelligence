// Guide Service — seçilen metodoloji hakkında "nasıl uygularım?" sorularını
// yanıtlar (Part B). Cevap, o metodolojinin knowledge'ına DAYANIR (grounded);
// LLM yoksa deterministik özet döner.

import { Methodology, METHODOLOGY_META } from "@/domain/diagnosis";
import { IAIProvider } from "./ports/ai-provider";
import { IKnowledgeRepository } from "./ports/knowledge-repository";

export class GuideService {
  constructor(
    private readonly ai: IAIProvider,
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async ask(input: {
    methodology: Methodology;
    question: string;
    problemDescription?: string;
  }): Promise<string> {
    const meta = METHODOLOGY_META[input.methodology];
    const k = await this.knowledge.getByMethodology(input.methodology);

    if (!this.ai.available) {
      // Deterministik yedek: knowledge özetini döndür.
      const parts = [
        `**${meta.name}**`,
        k?.whenToUse ? `Ne zaman: ${k.whenToUse}` : "",
        k?.phases.length ? `Aşamalar: ${k.phases.join(" → ")}` : "",
        k?.tools.length ? `Araçlar: ${k.tools.join(", ")}` : "",
        "",
        "(Daha ayrıntılı, soruya özel yanıt için AI sağlayıcı (Ollama) gerekir.)",
      ];
      return parts.filter(Boolean).join("\n");
    }

    const system = [
      "Sen deneyimli bir kalite/üretim mühendisliği koçusun.",
      `Kullanıcı '${meta.name}' metodolojisini seçti ve nasıl uygulayacağını soruyor.`,
      "Yanıtı YALNIZCA aşağıdaki bilgi tabanına ve kullanıcının problemine dayandır.",
      "Uydurma; bilmediğini söyle. KISA, somut ve uygulanabilir Türkçe yanıt ver.",
      "Mümkünse madde madde ve bu metodolojinin aşama/araçlarına atıfla.",
    ].join("\n");

    const prompt = [
      k?.whenToUse ? `Ne zaman kullanılır: ${k.whenToUse}` : "",
      k?.phases.length ? `Aşamalar: ${k.phases.join(", ")}` : "",
      k?.tools.length ? `Araçlar: ${k.tools.join(", ")}` : "",
      k?.body ? `Bilgi tabanı:\n${k.body}` : "",
      input.problemDescription ? `Kullanıcının problemi: ${input.problemDescription}` : "",
      "",
      `Soru: ${input.question}`,
    ]
      .filter(Boolean)
      .join("\n");

    return this.ai.complete({ system, prompt, temperature: 0.3, maxTokens: 700 });
  }
}
