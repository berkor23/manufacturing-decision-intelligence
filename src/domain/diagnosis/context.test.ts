import { describe, it, expect } from "vitest";
import { detectProcessName, contextualizeQuestion } from "./context";

describe("detectProcessName", () => {
  it("çekimli süreç adını yakalar ve 'hattı' ekler", () => {
    expect(detectProcessName("Kaynak hattında çatlak oluştu")).toBe("kaynak hattı");
  });

  it("temel süreç adını yakalar", () => {
    expect(detectProcessName("Montajda bir sorun var")).toBe("montaj");
  });

  it("presleme gibi çekimli biçimi yakalar", () => {
    expect(detectProcessName("Presleme sırasında deformasyon")).toBe("pres");
  });

  it("süreç adı yoksa null döner", () => {
    expect(detectProcessName("Genel bir problem yaşıyoruz")).toBeNull();
  });

  it("kısmi kelime eşleşmesi yapmaz (yanlış pozitif yok)", () => {
    // 'ambalaj' terimi 'lambalar' içinde geçmemeli
    expect(detectProcessName("Lambalar yanıp sönüyor")).toBeNull();
  });
});

describe("contextualizeQuestion", () => {
  it("süreç adı varsa bağlam ekler, anlamı korur", () => {
    const q = "Müşteri etkilendi mi?";
    const out = contextualizeQuestion(q, "kaynak hattı");
    expect(out).toContain("kaynak hattı");
    expect(out).toContain(q);
  });

  it("süreç adı yoksa soruyu olduğu gibi döner", () => {
    const q = "Müşteri etkilendi mi?";
    expect(contextualizeQuestion(q, null)).toBe(q);
  });
});
