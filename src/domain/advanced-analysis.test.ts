import {describe,expect,it} from "vitest";import {evaluateAdvancedAnalysis,type AdvancedAnalysis} from "./advanced-analysis";
const base=(tool:AdvancedAnalysis["tool"],fields:Record<string,string>,rows:Record<string,string>[])=>({id:"1",tool,title:"x",status:"IN_PROGRESS",decisionPoint:"x",hypothesis:"x",fields,rows,conclusion:"sonuç",evidenceIds:[]} as AdvancedAnalysis);
describe("gelişmiş destek analizleri",()=>{
 it("MSA tekrar edilebilirlik payını ve kabul aşımını bulur",()=>{const r=evaluateAdvancedAnalysis(base("MSA",{tolerance:"1",acceptance:"10"},[{part:"1",appraiser:"A",value:"10"},{part:"1",appraiser:"A",value:"12"},{part:"2",appraiser:"A",value:"20"}]));expect(r.metric).toContain("%20.0");expect(r.warning).toContain("kabul")});
 it("DOE iki seviyeli ana etkileri hesaplar",()=>{const r=evaluateAdvancedAnalysis(base("DOE",{response:"dayanım",objective:"artır"},[{factorA:"-1",factorB:"-1",response:"10"},{factorA:"1",factorB:"-1",response:"14"},{factorA:"-1",factorB:"1",response:"12"},{factorA:"1",factorB:"1",response:"16"}]));expect(r.metric).toContain("A=4.00");expect(r.metric).toContain("B=2.00")});
 it("FTA AND kapısında olasılıkları çarpar",()=>{const r=evaluateAdvancedAnalysis(base("FAULT_TREE",{topEvent:"Duruş",targetProbability:"0.01"},[{gate:"AND",probability:"0.1"},{gate:"AND",probability:"0.2"}]));expect(r.metric).toContain("2.000%")});
 it("Bowtie zayıf bariyeri uyarır",()=>{const r=evaluateAdvancedAnalysis(base("BOWTIE",{hazard:"Basınç",topEvent:"Kaçak"},[{status:"EFFECTIVE"},{status:"WEAK"}]));expect(r.warning).toContain("1 zayıf")});
});
