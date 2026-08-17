import type {
  Conversation,
  ConversationMessage,
  IConversationRepository,
} from "@/application/ports/conversation-repository";
import type { StructuredProblem } from "@/domain/diagnosis";

/**
 * Tek bir HTTP isteği boyunca yaşayan konuşma deposu.
 *
 * Misafir teşhisinde konuşma kalıcı depoya yazılmaz. İstemciden gelen, şeması
 * doğrulanmış durum bu depoya yüklenir; DiagnosisService aynı kurallarla çalışır
 * ve güncel durum yanıtla birlikte tarayıcıya geri verilir.
 */
export class TransientConversationRepository implements IConversationRepository {
  private conversation: Conversation | null;

  constructor(seed?: Conversation) {
    this.conversation = seed ? structuredClone(seed) : null;
  }

  async create(seed: {
    structuredProblem: StructuredProblem;
    messages?: ConversationMessage[];
    featureSources?: Conversation["featureSources"];
  }): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `local_conv_${crypto.randomUUID()}`,
      status: "ACTIVE",
      structuredProblem: seed.structuredProblem,
      featureSources: seed.featureSources ?? {},
      questionsAsked: 0,
      askedFeatures: [],
      pendingFeature: null,
      messages: seed.messages ?? [],
      result: null,
      informationTasks: [],
      recommendationChanges: [],
      createdAt: now,
      updatedAt: now,
    };
    this.conversation = structuredClone(conversation);
    return conversation;
  }

  async get(id: string): Promise<Conversation | null> {
    return this.conversation?.id === id ? structuredClone(this.conversation) : null;
  }

  async save(conversation: Conversation): Promise<Conversation> {
    const next = { ...conversation, updatedAt: new Date().toISOString() };
    this.conversation = structuredClone(next);
    return next;
  }

  snapshot(): Conversation {
    if (!this.conversation) throw new Error("Geçici teşhis durumu oluşmadı.");
    return structuredClone(this.conversation);
  }
}
