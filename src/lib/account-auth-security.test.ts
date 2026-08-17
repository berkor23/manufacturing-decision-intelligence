// Parola saklama ve yönlendirme hedefi — güvenlik kalkanı.
//
// Prisma'ya dokunmayan saf yardımcılar test edilir; account-auth.ts modülü
// "server-only" olduğu için doğrudan içe aktarılamaz, bu yüzden aynı davranışı
// kullanan yardımcılar üzerinden gidilir.

import { describe, expect, it } from "vitest";

process.env.ACCOUNT_AUTH_ENABLED = "0";

const { hashPassword, verifyPassword, safeNextPath } = await import("./account-auth");

describe("parola saklama", () => {
  it("yeni hash açık parolayı taşımaz ve doğrulanır", async () => {
    const stored = await hashPassword("Guvenli12345");
    expect(stored).not.toContain("Guvenli12345");
    expect(stored.startsWith("scrypt2:")).toBe(true);
    expect(await verifyPassword("Guvenli12345", stored)).toBe(true);
    expect(await verifyPassword("Guvenli12346", stored)).toBe(false);
  });

  it("aynı parola her seferinde farklı hash üretir (tuz)", async () => {
    expect(await hashPassword("Guvenli12345")).not.toBe(await hashPassword("Guvenli12345"));
  });

  it("bozuk biçim reddedilir", async () => {
    expect(await verifyPassword("x", "duz-metin")).toBe(false);
    expect(await verifyPassword("x", "scrypt2:eksik")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("uygulama içi yolu korur", () => {
    expect(safeNextPath("/calismalar")).toBe("/calismalar");
    expect(safeNextPath("/workspace/ws_1?tab=actions")).toBe("/workspace/ws_1?tab=actions");
  });

  it("dış siteye yönlendirmeyi engeller", () => {
    // `/\evil.com` tarayıcıda `//evil.com` gibi çözülür — açık yönlendirme.
    expect(safeNextPath("/\\evil.com")).toBe("/hesabim");
    expect(safeNextPath("//evil.com")).toBe("/hesabim");
    expect(safeNextPath("https://evil.com")).toBe("/hesabim");
    expect(safeNextPath("javascript:alert(1)")).toBe("/hesabim");
    expect(safeNextPath(undefined)).toBe("/hesabim");
  });
});
