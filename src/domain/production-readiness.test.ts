import {describe,expect,it} from "vitest";
import {taskTemporalStatus} from "./production-readiness";
describe("taskTemporalStatus",()=>{const now=new Date("2026-07-19T12:00:00Z");it("tamamlanan işi tarihinden bağımsız kapatır",()=>expect(taskTemporalStatus(true,"2020-01-01",now)).toBe("DONE"));it("gecikmiş ve yaklaşan tarihleri ayırır",()=>{expect(taskTemporalStatus(false,"2026-07-18",now)).toBe("OVERDUE");expect(taskTemporalStatus(false,"2026-07-21",now)).toBe("DUE_SOON");expect(taskTemporalStatus(false,"2026-08-01",now)).toBe("OPEN")})});
