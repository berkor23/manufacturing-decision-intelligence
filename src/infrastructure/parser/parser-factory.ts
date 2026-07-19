// Parser fabrikası. PARSER env: keyword (varsayılan) | llm | auto.
// Varsayılan keyword'tür: Ollama kurulu olmadan da sistem uçtan uca çalışsın.
// Ollama'yı kurunca PARSER=llm (veya auto) ile LLM parser'a geç.

import { IProblemParser } from "@/application/ports/problem-parser";
import { IAIProvider } from "@/application/ports/ai-provider";
import { KeywordProblemParser } from "./keyword-problem-parser";
import { LlmProblemParser } from "./llm-problem-parser";

export function createProblemParser(ai: IAIProvider): IProblemParser {
  const kind = (process.env.PARSER ?? "keyword").toLowerCase();
  if (kind === "llm") return new LlmProblemParser(ai);
  if (kind === "auto") return ai.available ? new LlmProblemParser(ai) : new KeywordProblemParser();
  return new KeywordProblemParser();
}
