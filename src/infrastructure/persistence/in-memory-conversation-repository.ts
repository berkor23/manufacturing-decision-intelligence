// In-memory conversation repository — Postgres olmadan çalışır (dev/test/demo).
// Prisma uygulaması (Postgres) devreye girince yerini alır; port aynı kalır.

import {
  IConversationRepository,
  Conversation,
  ConversationMessage,
} from "@/application/ports/conversation-repository";
import { StructuredProblem } from "@/domain/diagnosis";
import { newResourceId } from "./resource-id";

function newId(): string {
  return newResourceId("conv");
}

export class InMemoryConversationRepository implements IConversationRepository {
  private store = new Map<string, Conversation>();

  async create(seed: {
    structuredProblem: StructuredProblem;
    messages?: ConversationMessage[];
    featureSources?: Conversation["featureSources"];
  }): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: newId(),
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
    this.store.set(conversation.id, structuredClone(conversation));
    return conversation;
  }

  async get(id: string): Promise<Conversation | null> {
    const c = this.store.get(id);
    return c ? structuredClone(c) : null;
  }

  async save(conversation: Conversation): Promise<Conversation> {
    conversation.updatedAt = new Date().toISOString();
    this.store.set(conversation.id, structuredClone(conversation));
    return conversation;
  }
}
