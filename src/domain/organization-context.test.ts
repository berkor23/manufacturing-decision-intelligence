import {describe,expect,it} from "vitest";
import {contextCompleteness,gembaOpportunityCount,isPersonBlaming,qmsHealthScore,type ContextContract,type GembaBehaviorItem,type QmsHealthItem} from "./organization-context";
describe("organizasyon ve bağlam zekâsı",()=>{
  it("bağlam sözleşmesinde tüm karar alanlarını ister",()=>{const empty={purpose:"",scope:"",outOfScope:"",successMetric:"",methodRole:"",pivotCondition:"",misuseRisk:"",undesiredBehavior:"",owner:"",approvedBy:""};expect(contextCompleteness(empty).ready).toBe(false);expect(contextCompleteness(Object.fromEntries(Object.keys(empty).map(k=>[k,"dolu"])) as unknown as ContextContract).ready).toBe(true)});
  it("çıplak kişi suçlayan ifadeyi sistem açıklamasından ayırır",()=>{expect(isPersonBlaming("Operatör dikkatsiz davrandı")).toBe(true);expect(isPersonBlaming("Sistem tasarımı operatör hatasına neden izin verdi?")).toBe(false)});
  it("QMS sağlık seviyesini ve kritik boyutları hesaplar",()=>{const result=qmsHealthScore([{dimension:"QUALITY_CAPACITY",score:2},{dimension:"DATA_RELIABILITY",score:4}] as QmsHealthItem[]);expect(result.level).toBe("FRAGILE");expect(result.critical).toEqual(["QUALITY_CAPACITY"])});
  it("Gemba'daki hata ve telafi fırsatlarını sayar",()=>{expect(gembaOpportunityCount([{errorOpportunity:"Ters takma",compensationBehavior:"",pokaYokeIdea:""},{}] as GembaBehaviorItem[])).toBe(1)});
});
