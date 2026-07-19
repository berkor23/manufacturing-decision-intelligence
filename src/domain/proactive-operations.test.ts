import { describe,expect,it } from "vitest";
import { canTransitionSignal, controlBurdenSummary, kaizenNeedsEscalation, oplCompetencyReady, type KaizenExperiment, type OplLesson } from "./proactive-operations";

describe("proaktif operasyon katmanı",()=>{
  it("zayıf sinyal akışında doğrulama atlanarak kapatma yapılamaz",()=>{ expect(canTransitionSignal("NEW","DISMISSED")).toBe(false); expect(canTransitionSignal("NEW","TRIAGED")).toBe(true); expect(canTransitionSignal("VERIFYING","CASE_OPENED")).toBe(true); });
  it("yüksek riskli Kaizen'i ağır yönteme yükseltir",()=>{ expect(kaizenNeedsEscalation({risk:"HIGH",escalationMethod:null} as KaizenExperiment)).toBe(true); expect(kaizenNeedsEscalation({risk:"LOW",escalationMethod:null} as KaizenExperiment)).toBe(false); });
  it("OPL yetkinliğinde hedef, limit, sınav ve katılımcı ister",()=>{ const opl={objective:"Çapağı tanı",limit:"0.2 mm",quizQuestion:"Limit?",quizAnswer:"0.2 mm",trainee:"Ayşe"} as OplLesson; expect(oplCompetencyReady(opl)).toBe(true); expect(oplCompetencyReady({...opl,limit:""})).toBe(false); });
  it("kontrol yükünde geçici ve kaynak önleme boşluklarını sayar",()=>{ const result=controlBurdenSummary([{temporary:true,status:"ACTIVE",sourcePreventionQuestion:""},{temporary:false,status:"REMOVE_READY",sourcePreventionQuestion:"Kaynakta sensör"}] as never); expect(result).toMatchObject({total:2,temporary:1,sourcePreventionMissing:1,removalReady:1}); });
});
