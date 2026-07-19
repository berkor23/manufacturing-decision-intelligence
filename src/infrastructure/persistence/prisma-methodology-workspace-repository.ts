import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  IMethodologyWorkspaceRepository,
  MethodologyWorkspace,
  WorkspacePatch,
} from "@/application/ports/methodology-workspace-repository";

function newId(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const asJson = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export class PrismaMethodologyWorkspaceRepository
  implements IMethodologyWorkspaceRepository
{
  async create(
    seed: Omit<MethodologyWorkspace, "id" | "createdAt" | "updatedAt">,
  ): Promise<MethodologyWorkspace> {
    const now = new Date().toISOString();
    const ws: MethodologyWorkspace = { ...seed, id: newId(), createdAt: now, updatedAt: now };
    await prisma.workspaceRecord.create({
      data: { id: ws.id, methodology: ws.methodology, data: asJson(ws) },
    });
    return ws;
  }

  async get(id: string): Promise<MethodologyWorkspace | null> {
    const row = await prisma.workspaceRecord.findUnique({ where: { id } });
    return row ? (row.data as unknown as MethodologyWorkspace) : null;
  }

  async list(): Promise<MethodologyWorkspace[]> {
    const rows = await prisma.workspaceRecord.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((r) => r.data as unknown as MethodologyWorkspace);
  }

  async delete(id: string): Promise<boolean> {
    const result = await prisma.workspaceRecord.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async update(id: string, patch: WorkspacePatch): Promise<MethodologyWorkspace | null> {
    const current = await this.get(id);
    if (!current) return null;
    const updated: MethodologyWorkspace = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await prisma.workspaceRecord.update({ where: { id }, data: { data: asJson(updated) } });
    return updated;
  }
}
