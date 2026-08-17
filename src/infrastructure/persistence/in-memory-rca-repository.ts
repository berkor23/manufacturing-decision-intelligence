// In-memory RCA repository — Postgres olmadan çalışır (Prisma repo sonra).

import {
  IRcaRepository,
  RcaWorkspace,
  RcaPatch,
} from "@/application/ports/rca-repository";
import { newResourceId } from "./resource-id";

function newId(): string {
  return newResourceId("rca");
}

export class InMemoryRcaRepository implements IRcaRepository {
  private store = new Map<string, RcaWorkspace>();

  async create(seed: {
    conversationId?: string | null;
    problemDescription: string;
  }): Promise<RcaWorkspace> {
    const now = new Date().toISOString();
    const ws: RcaWorkspace = {
      id: newId(),
      conversationId: seed.conversationId ?? null,
      problemDescription: seed.problemDescription,
      whySteps: [],
      fishbone: [],
      actions: [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(ws.id, structuredClone(ws));
    return ws;
  }

  async get(id: string): Promise<RcaWorkspace | null> {
    const ws = this.store.get(id);
    return ws ? structuredClone(ws) : null;
  }

  async update(id: string, patch: RcaPatch): Promise<RcaWorkspace | null> {
    const ws = this.store.get(id);
    if (!ws) return null;
    const updated: RcaWorkspace = {
      ...ws,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, structuredClone(updated));
    return structuredClone(updated);
  }
}
