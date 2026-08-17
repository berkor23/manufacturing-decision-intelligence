// Playbook kataloğu yapısal doğrulama — her metodolojinin profesyonel
// şablonunun tutarlı olduğunu garanti eder (UI ve AI taslağı buna güvenir).

import { describe, expect, it } from "vitest";
import { METHODOLOGIES } from "../diagnosis";
import { PLAYBOOKS, getPlaybook } from "./playbooks";
import {
  FISHBONE_COLUMNS,
  FIVE_WHY_COLUMNS,
  emptyStepState,
  fieldFilled,
  fieldImportance,
  fieldQualityIssue,
  isCellMarked,
  isTabular,
  normalizeFishboneCategory,
  stepIsComplete,
} from "./types";

describe("playbook kataloğu", () => {
  it("tüm metodolojiler için playbook tanımlı", () => {
    for (const m of METHODOLOGIES) {
      const pb = getPlaybook(m);
      expect(pb.methodology).toBe(m);
      expect(pb.intro.length).toBeGreaterThan(20);
      expect(pb.steps.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("adım ve alan anahtarları benzersiz; her adımın amacı ve rehberi var", () => {
    for (const pb of Object.values(PLAYBOOKS)) {
      const stepKeys = pb.steps.map((s) => s.key);
      expect(new Set(stepKeys).size).toBe(stepKeys.length);
      for (const step of pb.steps) {
        expect(step.objective.length).toBeGreaterThan(10);
        expect(step.guidance.length).toBeGreaterThan(30);
        expect(step.fields.length).toBeGreaterThan(0);
        const fieldKeys = step.fields.map((f) => f.key);
        expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
      }
    }
  });

  it("satır-tabanlı alanların sütunları tanımlı ve benzersiz", () => {
    for (const pb of Object.values(PLAYBOOKS)) {
      for (const step of pb.steps) {
        for (const f of step.fields) {
          if (!isTabular(f)) continue;
          expect(f.columns && f.columns.length).toBeGreaterThanOrEqual(2);
          const colKeys = f.columns!.map((c) => c.key);
          expect(new Set(colKeys).size).toBe(colKeys.length);
        }
      }
    }
  });

  it("5 Neden / balık kılçığı alanları standart sütun sözleşmesini kullanır", () => {
    const tools = Object.values(PLAYBOOKS)
      .flatMap((pb) => pb.steps)
      .flatMap((s) => s.fields)
      .filter((f) => f.type === "fivewhy" || f.type === "fishbone");

    // RCA (kılçık + 5 neden) ve 8D D4 (5 neden) en azından var.
    expect(tools.length).toBeGreaterThanOrEqual(3);
    for (const f of tools) {
      expect(f.columns).toEqual(f.type === "fivewhy" ? FIVE_WHY_COLUMNS : FISHBONE_COLUMNS);
    }
  });

  it("emptyStepState: metin alanı '' , satır alanı [] ile başlar ve boş sayılır", () => {
    const step = PLAYBOOKS.EIGHT_D.steps[2]; // D3 — containment (tablo + textarea)
    const state = emptyStepState(step);
    expect(state.status).toBe("PENDING");
    for (const f of step.fields) {
      expect(state.values[f.key]).toEqual(isTabular(f) ? [] : "");
      expect(fieldFilled(state.values[f.key])).toBe(false);
    }
  });

  it("yalnız doğrulanmış, gerekçeli atlanmış ve eski tamamlanmış adımlar ilerlemeye girer", () => {
    expect(stepIsComplete("PENDING")).toBe(false);
    expect(stepIsComplete("IN_PROGRESS")).toBe(false);
    expect(stepIsComplete("READY")).toBe(false);
    expect(stepIsComplete("VERIFIED")).toBe(true);
    expect(stepIsComplete("SKIPPED")).toBe(true);
    expect(stepIsComplete("DONE")).toBe(true);
  });

  it("her alan zorunlu, koşullu veya isteğe bağlı olarak sınıflanır", () => {
    for (const field of Object.values(PLAYBOOKS).flatMap((pb) => pb.steps).flatMap((step) => step.fields)) {
      expect(["REQUIRED", "CONDITIONAL", "OPTIONAL"]).toContain(fieldImportance(field));
    }
  });

  it("anlamsız kısa metni ve göstermelik tablo satırını kalite kapısından geçirmez", () => {
    const textField = { key: "finding", label: "Bulgu", type: "textarea" as const };
    const tableField = { key: "actions", label: "Aksiyonlar", type: "table" as const, columns: [{ key: "what", label: "Ne" }, { key: "why", label: "Neden" }] };
    expect(fieldQualityIssue(textField, "tamam")).toContain("genel ifade");
    expect(fieldQualityIssue(textField, "kısa")).toContain("20 karakter");
    expect(fieldQualityIssue(textField, "Vardiya B ölçümünde çatlak oranı %4,2 bulundu.")).toBeNull();
    expect(fieldQualityIssue(tableField, [{ what: "Kontrol et", why: "" }])).toContain("iki ilişkili");
    expect(fieldQualityIssue(tableField, [{ what: "Torku ölç", why: "Sapmayı doğrula" }])).toBeNull();
  });
});

describe("RCA araçları (playbook içine gömülü)", () => {
  it("isCellMarked: kök neden işaretini toleranslı okur", () => {
    for (const v of ["evet", "Evet", " TRUE ", "1", "x", "✓"]) {
      expect(isCellMarked(v)).toBe(true);
    }
    for (const v of [undefined, "", "  ", "hayır", "belki"]) {
      expect(isCellMarked(v)).toBe(false);
    }
  });

  it("normalizeFishboneCategory: TR/EN ve bileşik yazımları 6M'ye eşler", () => {
    expect(normalizeFishboneCategory("Makine")).toBe("MACHINE");
    expect(normalizeFishboneCategory("machine")).toBe("MACHINE");
    expect(normalizeFishboneCategory("Makine / Ekipman")).toBe("MACHINE");
    expect(normalizeFishboneCategory("İnsan")).toBe("MAN");
    expect(normalizeFishboneCategory("Ölçüm")).toBe("MEASUREMENT");
    expect(normalizeFishboneCategory("Çevre")).toBe("ENVIRONMENT");
    expect(normalizeFishboneCategory("Malzeme")).toBe("MATERIAL");
    expect(normalizeFishboneCategory("Metot")).toBe("METHOD");
  });

  it("normalizeFishboneCategory: tanınmayan kategori null döner (UI 'sınıflandırılmamış'a düşürür)", () => {
    expect(normalizeFishboneCategory("Bütçe")).toBeNull();
    expect(normalizeFishboneCategory("")).toBeNull();
    expect(normalizeFishboneCategory(undefined)).toBeNull();
  });
});

describe("FMEA gelecek odaklı risk disiplini", () => {
  it("puanlamadan önce değişim, varsayım ve kontrol kırılma senaryosu ister", () => {
    const fmea = PLAYBOOKS.FMEA;
    const scenarioIndex = fmea.steps.findIndex((step) => step.key === "futureScenarios");
    const analysisIndex = fmea.steps.findIndex((step) => step.key === "analysis");
    expect(scenarioIndex).toBeGreaterThan(-1);
    expect(scenarioIndex).toBeLessThan(analysisIndex);

    const scenario = fmea.steps[scenarioIndex].fields.find((field) => field.key === "scenarioTable");
    expect(scenario?.columns?.map((column) => column.key)).toEqual(expect.arrayContaining([
      "changingElement",
      "assumption",
      "scenario",
      "failureMode",
      "breakCondition",
      "evidence",
    ]));
  });

  it("FMEA satırında risk kaynağı ile önleyici ve tespit kontrollerini ayırır", () => {
    const analysis = PLAYBOOKS.FMEA.steps.find((step) => step.key === "analysis")!;
    const table = analysis.fields.find((field) => field.key === "fmeaTable")!;
    expect(table.columns?.map((column) => column.key)).toEqual(expect.arrayContaining([
      "riskSource",
      "scenario",
      "preventionControl",
      "detectionControl",
      "controlEvidence",
    ]));
  });
});
