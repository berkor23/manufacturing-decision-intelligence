import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  IConversationRepository,
  Conversation,
  ConversationMessage,
} from "@/application/ports/conversation-repository";
import { StructuredProblem } from "@/domain/diagnosis";

function newId(): string {
  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const asJson = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export class PrismaConversationRepository implements IConversationRepository {
  async create(seed: {
    structuredProblem: StructuredProblem;
    messages?: ConversationMessage[];
  }): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: newId(),
      status: "ACTIVE",
      structuredProblem: seed.structuredProblem,
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
    await prisma.conversationRecord.create({
      data: { id: conversation.id, status: conversation.status, data: asJson(conversation) },
    });
    return conversation;
  }

  async get(id: string): Promise<Conversation | null> {
    const row = await prisma.conversationRecord.findUnique({ where: { id } });
    return row ? (row.data as unknown as Conversation) : null;
  }

  async save(conversation: Conversation): Promise<Conversation> {
    conversation.updatedAt = new Date().toISOString();
    await prisma.conversationRecord.update({
      where: { id: conversation.id },
      data: { status: conversation.status, data: asJson(conversation) },
    });
    return conversation;
  }
}
