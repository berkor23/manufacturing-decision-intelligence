import {
  IMethodologyWorkspaceRepository,
  MethodologyWorkspace,
  WorkspacePatch,
} from "@/application/ports/methodology-workspace-repository";

let counter = 0;
function newId(): string {
  counter += 1;
  return `ws_${Date.now().toString(36)}_${counter}`;
}

export class InMemoryMethodologyWorkspaceRepository
  implements IMethodologyWorkspaceRepository
{
  private store = new Map<string, MethodologyWorkspace>();

  async create(
    seed: Omit<MethodologyWorkspace, "id" | "createdAt" | "updatedAt">,
  ): Promise<MethodologyWorkspace> {
    const now = new Date().toISOString();
    const ws: MethodologyWorkspace = { ...seed, id: newId(), createdAt: now, updatedAt: now };
    this.store.set(ws.id, structuredClone(ws));
    return ws;
  }

  async get(id: string): Promise<MethodologyWorkspace | null> {
    const ws = this.store.get(id);
    return ws ? structuredClone(ws) : null;
  }

  async list(): Promise<MethodologyWorkspace[]> {
    return [...this.store.values()]
      .map((ws) => structuredClone(ws))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async update(id: string, patch: WorkspacePatch): Promise<MethodologyWorkspace | null> {
    const ws = this.store.get(id);
    if (!ws) return null;
    const updated: MethodologyWorkspace = {
      ...ws,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, structuredClone(updated));
    return structuredClone(updated);
  }
}
