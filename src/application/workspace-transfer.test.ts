import { describe, expect, it } from "vitest";
import { transferWorkspace } from "./workspace-transfer";
import { WorkspaceService } from "./workspace-service";
import { InMemoryMethodologyWorkspaceRepository } from "@/infrastructure/persistence/in-memory-methodology-workspace-repository";
import type { IKnowledgeRepository } from "./ports/knowledge-repository";
import type { IAIProvider } from "./ports/ai-provider";

const knowledge: IKnowledgeRepository = { async getByMethodology(){ return null; } };
const ai: IAIProvider = { name:"none", available:false, async complete(){ return ""; } };
describe("workspace transfer",()=>{
  it("RCA kanıt, kök neden ve aksiyonlarını 8D alanlarına taşır",async()=>{
    const service = new WorkspaceService(new InMemoryMethodologyWorkspaceRepository(),knowledge,ai);
    const source = await service.create({methodology:"RCA",problemDescription:"Kaynak çatlağı"});
    source.evidence=[{id:"e1",title:"Kesit",source:"Lab",finding:"Gözenek",recordedAt:"2026-01-01"}];
    source.claims=[{id:"c1",statement:"Gaz debisi düşük",kind:"ROOT_CAUSE",status:"VERIFIED",evidenceIds:["e1"]}];
    source.actions=[{action:"Debi interlock",owner:"Bakım",status:"EFFECTIVE"}];
    const target = await service.create({methodology:"EIGHT_D",problemDescription:"Kaynak çatlağı"});
    const result=transferWorkspace(source,target);
    expect(result.evidence).toHaveLength(1);
    expect(result.steps.find(s=>s.key==="d4")?.values.occurrenceRoot).toContain("Gaz debisi");
    expect(result.steps.find(s=>s.key==="d5")?.values.correctiveActions).toHaveLength(1);
  });
});
