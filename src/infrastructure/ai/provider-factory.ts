// AI sağlayıcı fabrikası. AI_PROVIDER env: ollama (varsayılan) | none.

import { IAIProvider } from "@/application/ports/ai-provider";
import { OllamaProvider } from "./ollama-provider";
import { NoneProvider } from "./none-provider";

export function createAIProvider(): IAIProvider {
  const kind = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();
  switch (kind) {
    case "none":
      return new NoneProvider();
    case "ollama":
    default:
      return new OllamaProvider();
  }
}
