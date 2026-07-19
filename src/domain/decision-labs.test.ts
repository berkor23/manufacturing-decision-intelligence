import {describe,expect,it} from "vitest";
import {calculateCapacity,calculateLineBalance,calculateSop,normalizeBenchmark} from "./decision-labs";
describe("operasyonel karar laboratuvarları",()=>{
  it("benchmark değerlerini ölçeğe göre normalize eder",()=>{expect(normalizeBenchmark({localValue:80,localScale:100,referenceValue:900,referenceScale:1000,capability:"OEE",adaptation:"Aynı ürün ailesi"} as never)).toMatchObject({local:0.8,reference:0.9,gap:0.1,comparable:true})});
  it("darboğaz kapasitesi, verim ve stokla talep açığını hesaplar",()=>{expect(calculateCapacity({demand:1000,availableMinutes:480,bottleneckCycleSeconds:30,yieldRate:95,mixFactor:1,inventory:100,channelMargin:2,investment:0} as never)).toMatchObject({throughput:912,gap:12,feasible:true})});
  it("S&OP senaryosunda backlog ve hizmet seviyesini hesaplar",()=>{const x=calculateSop({demandExpected:120,demandHigh:140,regularCapacity:80,overtimeCapacity:20,subcontractCapacity:0,openingInventory:0,serviceTarget:95,unitRegularCost:1,unitOvertimeCost:2,unitSubcontractCost:3,unitInventoryCost:1,unitBacklogCost:5} as never);expect(x).toMatchObject({backlog:20,service:83.33,meetsTarget:false})});
  it("hat dengelemede takt aşan istasyonu ve kapasiteyi bulur",()=>{const x=calculateLineBalance({demand:100,availableSeconds:1000,mode:"LINE",operations:[{seconds:6,station:1,ergonomicRisk:"LOW"},{seconds:12,station:2,ergonomicRisk:"HIGH"}]} as never);expect(x.takt).toBe(10);expect(x.overloaded).toEqual([2]);expect(x.capacity).toBe(83)});
});
