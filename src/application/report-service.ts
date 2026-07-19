// Report Service — sonuçlanmış bir teşhisten Türkçe rapor üretir.
// LLM varsa (Ollama) akıcı rapor; yoksa karar zinciri + knowledge'tan
// DETERMİNİSTİK rapor. Her iki durumda da içerik yalnızca elimizdeki
// verilere dayanır (uydurma yok).

import {
  METHODOLOGY_META,
  DecisionTrace,
  Methodology,
  MethodologyConfidence,
  nextMethodologies,
  closeAlternatives,
  composeMethodologyPlan,
} from "@/domain/diagnosis";
import { IAIProvider } from "./ports/ai-provider";
import { IKnowledgeRepository, MethodologyKnowledge } from "./ports/knowledge-repository";
import { IConversationRepository } from "./ports/conversation-repository";

export class ReportService {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly knowledge: IKnowledgeRepository,
    private readonly ai: IAIProvider,
  ) {}

  async generate(conversationId: string): Promise<string> {
    const conv = await this.repo.get(conversationId);
    if (!conv) throw new Error(`Conversation bulunamadı: ${conversationId}`);
    if (!conv.result) throw new Error("Teşhis henüz sonuçlanmadı; rapor üretilemez.");

    const { methodology, confidence, trace, ranking, evidenceStatus } = conv.result;
    const methodPlan = conv.result.methodPlan ?? composeMethodologyPlan(ranking);
    const stabilization = conv.result.stabilization;
    const meta = METHODOLOGY_META[methodology];
    const knowledge = await this.knowledge.getByMethodology(methodology);
    const problem = conv.structuredProblem.problemDescription ?? "(belirtilmemiş)";

    const body = this.ai.available
      ? await this.llmReport(problem, meta.name, confidence, trace, knowledge)
      : this.deterministicReport(problem, meta.name, confidence, trace, knowledge);

    // Rapor gövdesi LLM'li olsa bile diziyi DETERMİNİSTİK ekle (uydurma yok):
    // hangi yöntemler yarışıyor + liderden sonra hangileri gelir.
    const evidenceNotice = evidenceStatus === "CONFIRMED"
      ? "\n\n> Karar durumu: En az üç bağımsız destek ve dört doğrulanmış cevapla doğrulandı.\n"
      : "\n\n> Karar durumu: Bu metodoloji mevcut bilgilerle ön adaydır; eksik saha bilgileri doğrulanmadan kesin seçim olarak değerlendirilmemelidir.\n";
    const methodPlanSection = [methodPlan.primary, ...methodPlan.supporting]
      .map((entry) => `- **${entry.layerLabel}:** ${METHODOLOGY_META[entry.methodology].shortName} — ${entry.roleLabel}`)
      .join("\n");
    const stabilizationNotice = stabilization
      ? `\n\n## Stabilizasyon Kapısı\nDurum: **${stabilization.status}**${stabilization.blockers.length ? `\n${stabilization.blockers.map((item) => `- ${item.reason}`).join("\n")}` : ""}\n`
      : "";
    const report = evidenceNotice + body + stabilizationNotice + `\n\n## Yöntem Bileşimi\n${methodPlanSection}\n` + this.sequenceSection(methodology, ranking);

    conv.messages.push({
      role: "ASSISTANT",
      kind: "REPORT",
      content: report,
      featureKey: null,
      createdAt: new Date().toISOString(),
    });
    await this.repo.save(conv);

    return report;
  }

  private async llmReport(
    problem: string,
    methodologyName: string,
    confidence: number,
    trace: DecisionTrace,
    knowledge: MethodologyKnowledge | null,
  ): Promise<string> {
    const chain = trace.steps.map((s) => `- ${s.because}`).join("\n");
    const system = [
      "Sen bir kalite/üretim mühendisliği raporlama asistanısın.",
      "Verilen bilgilere dayanarak KISA, profesyonel bir Türkçe teşhis raporu yaz.",
      "SADECE verilen bilgileri kullan; yeni veri/varsayım UYDURMA.",
      "Şu başlıkları kullan: 'Problem Özeti', 'Önerilen Metodoloji ve Gerekçe', 'Önerilen İlk Adımlar'.",
    ].join("\n");
    const prompt = [
      `Problem: ${problem}`,
      `Önerilen metodoloji: ${methodologyName} (göreli kural desteği ${Math.round(confidence * 100)}/100; kalibre olasılık değildir)`,
      knowledge ? `Ne zaman kullanılır: ${knowledge.whenToUse}` : "",
      knowledge && knowledge.tools.length ? `Araçlar: ${knowledge.tools.join(", ")}` : "",
      knowledge && knowledge.phases.length ? `Aşamalar: ${knowledge.phases.join(", ")}` : "",
      "Karar gerekçeleri (sistemin çıkardığı):",
      chain,
    ]
      .filter(Boolean)
      .join("\n");

    return this.ai.complete({ system, prompt, temperature: 0.3, maxTokens: 900 });
  }

  /**
   * Deterministik "dizi" bölümü: yakın alternatifler (ranking'ten) + sonraki
   * tamamlayıcı adımlar (statik yaşam döngüsü haritası). LLM'e bırakılmaz —
   * yöntem adları/gerekçeleri uydurulmasın diye saf domain verisinden üretilir.
   */
  private sequenceSection(methodology: Methodology, ranking: MethodologyConfidence[]): string {
    const alts = closeAlternatives(ranking);
    const next = nextMethodologies(methodology);
    if (alts.length === 0 && next.length === 0) return "";

    const lines: string[] = ["", "## Tamamlayıcı Yaklaşımlar ve Sonraki Adımlar"];
    if (alts.length) {
      lines.push("", "**Yakın alternatifler** (asıl mesele farklıysa değerlendir):");
      for (const a of alts) {
        const m = METHODOLOGY_META[a.methodology];
        lines.push(`- **${m.shortName}** (%${Math.round(a.confidence * 100)}) — ${m.description}`);
      }
    }
    if (next.length) {
      lines.push("", "**Sonraki / tamamlayıcı adımlar:**");
      for (const n of next) {
        lines.push(`- **${METHODOLOGY_META[n.code].shortName}** — ${n.reason}`);
      }
    }
    return "\n" + lines.join("\n") + "\n";
  }

  private deterministicReport(
    problem: string,
    methodologyName: string,
    confidence: number,
    trace: DecisionTrace,
    knowledge: MethodologyKnowledge | null,
  ): string {
    const lines: string[] = [];
    lines.push("## Problem Özeti", problem, "");
    lines.push(
      "## Önerilen Metodoloji ve Gerekçe",
      `**${methodologyName}** (göreli kural desteği ${Math.round(confidence * 100)}/100; kalibre olasılık değildir)`,
      "",
      "Karar gerekçeleri:",
      ...trace.steps.map((s) => `- ${s.because}`),
      "",
    );
    lines.push("## Önerilen İlk Adımlar");
    if (knowledge && knowledge.phases.length) {
      lines.push(...knowledge.phases.map((p, i) => `${i + 1}. ${p}`));
    } else {
      lines.push("- İlgili metodoloji adımlarını uygula.");
    }
    if (knowledge && knowledge.tools.length) {
      lines.push("", `Araçlar: ${knowledge.tools.join(", ")}`);
    }
    return lines.join("\n");
  }
}
