import { describe, expect, it } from "vitest";
import { closureChecks, dnaSimilarity, problemDNA } from "./workspace-intelligence";
import type { MethodologyWorkspace } from "@/application/ports/methodology-workspace-repository";

describe("workspace intelligence", () => {
  it("benzer üretim problemlerinin DNA skorunu ilgisiz vakadan yüksek verir", () => {
    const source = problemDNA("Kaynak hattında gece vardiyasında çatlak oluşuyor");
    expect(dnaSimilarity(source, problemDNA("Kaynak hattında tekrar çatlak görüldü")))
      .toBeGreaterThan(dnaSimilarity(source, problemDNA("Depoda etiket düzeni bozuk")));
  });

  it("kanıt ve etkinlik olmadan kapanışa izin vermez", () => {
    const ws = {
      steps: [{ key: "x", status: "DONE", values: { x: "dolu" } }], actions: [], evidence: [], claims: [], approvals: [], monitoring: null,
    } as unknown as MethodologyWorkspace;
    expect(closureChecks(ws).every((x) => x.passed)).toBe(false);
  });

  it("aktif containment ve bağlantısız öğrenim kararı kapanışı engeller", () => {
    const ws = {
      steps: [], actions: [], evidence: [], claims: [], approvals: [], monitoring: null,
      horizontalTargets: [], redTeamReviews: [], systemDocuments: [],
      containmentControls: [{ status: "ACTIVE" }],
      learningDecision: { decision: "PENDING", documentIds: [], rationale: "", approvedBy: "" },
    } as unknown as MethodologyWorkspace;
    const checks = closureChecks(ws);
    expect(checks.find((item) => item.key === "containment")?.passed).toBe(false);
    expect(checks.find((item) => item.key === "learning-output")?.passed).toBe(false);
  });

  it("onaylı dokümana bağlı öğrenim ve kaldırılmış containment kapıları geçer", () => {
    const ws = {
      steps: [], actions: [], evidence: [], claims: [], approvals: [], monitoring: null,
      horizontalTargets: [], redTeamReviews: [],
      systemDocuments: [{ id: "doc_1", status: "APPROVED" }],
      containmentControls: [{ status: "REMOVED" }],
      learningDecision: { decision: "DOCUMENT_UPDATED", documentIds: ["doc_1"], rationale: "", approvedBy: "Kalite" },
    } as unknown as MethodologyWorkspace;
    const checks = closureChecks(ws);
    expect(checks.find((item) => item.key === "containment")?.passed).toBe(true);
    expect(checks.find((item) => item.key === "learning-output")?.passed).toBe(true);
  });
});
