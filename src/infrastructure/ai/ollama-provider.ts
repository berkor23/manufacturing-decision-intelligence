// Ollama sağlayıcısı — yerel, ücretsiz LLM. IAIProvider uygulaması.

import { IAIProvider, CompleteParams, ChatMessage } from "@/application/ports/ai-provider";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

export class OllamaProvider implements IAIProvider {
  readonly name = `ollama:${OLLAMA_MODEL}`;
  readonly available = true;

  constructor(
    private readonly url: string = OLLAMA_URL,
    private readonly model: string = OLLAMA_MODEL,
  ) {}

  async complete(params: CompleteParams): Promise<string> {
    const messages: ChatMessage[] = [];
    if (params.system) messages.push({ role: "system", content: params.system });
    messages.push({ role: "user", content: params.prompt });

    const res = await fetch(`${this.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: params.temperature ?? 0.2,
          ...(params.maxTokens ? { num_predict: params.maxTokens } : {}),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Ollama isteği başarısız (${res.status}). Ollama çalışıyor mu ve "${this.model}" modeli çekildi mi? ${body}`,
      );
    }

    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }
}
