// knowledge/*.md dosyalarını okuyan IKnowledgeRepository uygulaması.
// Basit frontmatter parser (bizim tuttuğumuz format için yeterli).

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  IKnowledgeRepository,
  MethodologyKnowledge,
} from "@/application/ports/knowledge-repository";
import { Methodology, METHODOLOGY_META } from "@/domain/diagnosis";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

function parseFrontmatter(raw: string): { data: Record<string, string | string[]>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };

  const data: Record<string, string | string[]> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      data[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { data, body: m[2].trim() };
}

function asArray(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) return [v];
  return [];
}

export class FileKnowledgeRepository implements IKnowledgeRepository {
  async getByMethodology(m: Methodology): Promise<MethodologyKnowledge | null> {
    const file = METHODOLOGY_META[m].knowledgeFile;
    try {
      const raw = await readFile(path.join(KNOWLEDGE_DIR, file), "utf8");
      const { data, body } = parseFrontmatter(raw);
      return {
        code: (data.code as string) ?? m,
        name: (data.name as string) ?? METHODOLOGY_META[m].name,
        whenToUse: (data.whenToUse as string) ?? "",
        tools: asArray(data.tools),
        phases: asArray(data.phases),
        body,
      };
    } catch {
      return null;
    }
  }
}
