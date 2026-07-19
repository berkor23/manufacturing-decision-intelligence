// "none" sağlayıcısı — LLM yok. IAIProvider uygulaması.
// Kural motoru + keyword parser ile sistem LLM'siz de çalışır.

import { IAIProvider } from "@/application/ports/ai-provider";

export class NoneProvider implements IAIProvider {
  readonly name = "none";
  readonly available = false;

  async complete(): Promise<string> {
    throw new Error(
      "AI sağlayıcı 'none'. LLM gerektiren bir işlem çağrıldı; kural motoru / keyword parser yolunu kullanın veya AI_PROVIDER=ollama yapın.",
    );
  }
}
