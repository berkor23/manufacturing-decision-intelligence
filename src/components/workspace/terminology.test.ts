import { describe, expect, it } from "vitest";
import { PLAYBOOKS } from "@/domain/playbook";
import { friendlyStepName, terminologyFor } from "./terminology";

describe("çalışma alanı terminolojisi", () => {
  it("bütün playbook adımlarını tek biçimli, numara tekrarından arındırılmış kullanıcı adıyla gösterir", () => {
    for (const playbook of Object.values(PLAYBOOKS)) {
      for (const step of playbook.steps) {
        const label = friendlyStepName(step.key, step.name);
        expect(label.trim().length).toBeGreaterThan(2);
        expect(label).not.toMatch(/^\d+\s*[—.-]/);
      }
    }
  });

  it("uzman kısaltmalarını ekrandaki doğal açıklamalarla birlikte döndürür", () => {
    const entries = terminologyFor("CTQ, MSA, OEE, MTBF, MTTR, throughput ve containment");
    expect(entries.map((entry) => entry.term)).toEqual(expect.arrayContaining(["CTQ", "MSA", "OEE", "MTBF", "MTTR", "throughput", "containment"]));
    for (const entry of entries) expect(entry.meaning.length).toBeGreaterThan(30);
  });
});
