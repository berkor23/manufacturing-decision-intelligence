import { describe, expect, it } from "vitest";
import { diagnosisCounterfactuals, problemWith } from ".";

describe("diagnosis counterfactuals", () => {
  it("yalnız metodoloji liderini gerçekten değiştiren varsayımları döndürür", () => {
    const problem = problemWith({ defectOccurred: true, customerAffected: false, rootCauseKnown: false, previouslyOccurred: true });
    const alternatives = diagnosisCounterfactuals(problem);
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.every((x)=>x.from !== x.to)).toBe(true);
  });
});
