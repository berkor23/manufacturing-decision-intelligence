// AI sağlayıcı PORTU (sözleşme). Somut uygulamalar infrastructure/ai altında.
// Provider "aptaldır": metin girer, metin çıkar. Parsing/soru/rapor promptları
// bu portu KULLANAN servislerdedir, burada DEĞİL.

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompleteParams {
  system?: string;
  prompt: string;
  maxTokens?: number;
  /** Düşük değer = daha deterministik (parsing için). */
  temperature?: number;
}

export interface IAIProvider {
  readonly name: string;
  /** LLM kullanılabilir mi? (none sağlayıcısında false) */
  readonly available: boolean;
  complete(params: CompleteParams): Promise<string>;
}
