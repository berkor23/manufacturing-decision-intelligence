import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  IRcaRepository,
  RcaWorkspace,
  RcaPatch,
} from "@/application/ports/rca-repository";
import type { RecordOwner } from "@/domain/access";
import { newResourceId } from "./resource-id";

const newId = () => newResourceId("rca");

const asJson = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export class PrismaRcaRepository implements IRcaRepository {
  async create(
    seed: { conversationId?: string | null; problemDescription: string },
    owner?: RecordOwner,
  ): Promise<RcaWorkspace> {
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
    await prisma.rcaRecord.create({
      data: {
        id: ws.id,
        data: asJson(ws),
        ownerUserId: owner?.ownerUserId ?? null,
        organizationId: owner?.organizationId ?? null,
      },
    });
    return ws;
  }

  async get(id: string): Promise<RcaWorkspace | null> {
    const row = await prisma.rcaRecord.findUnique({ where: { id } });
    return row ? (row.data as unknown as RcaWorkspace) : null;
  }

  async update(id: string, patch: RcaPatch): Promise<RcaWorkspace | null> {
    const current = await this.get(id);
    if (!current) return null;
    const updated: RcaWorkspace = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await prisma.rcaRecord.update({ where: { id }, data: { data: asJson(updated) } });
    return updated;
  }
}
