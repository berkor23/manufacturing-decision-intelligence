// Knowledge PORTU — metodoloji bilgi tabanına (knowledge/*.md) erişim.
// Karar için DEĞİL; rapor üretimi ve (ileride) RAG için.

import { Methodology } from "@/domain/diagnosis";

export interface MethodologyKnowledge {
  code: string;
  name: string;
  whenToUse: string;
  tools: string[];
  phases: string[];
  /** Frontmatter sonrası markdown gövde. */
  body: string;
}

export interface IKnowledgeRepository {
  getByMethodology(m: Methodology): Promise<MethodologyKnowledge | null>;
}
