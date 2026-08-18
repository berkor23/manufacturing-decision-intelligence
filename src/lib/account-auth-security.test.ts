// Parola saklama ve yönlendirme hedefi — güvenlik kalkanı.
//
// Prisma'ya dokunmayan saf yardımcılar test edilir; account-auth.ts modülü
// "server-only" olduğu için doğrudan içe aktarılamaz, bu yüzden aynı davranışı
// kullanan yardımcılar üzerinden gidilir.

import { afterEach, describe, expect, it } from "vitest";

process.env.ACCOUNT_AUTH_ENABLED = "0";

const { hashPassword, verifyPassword, safeNextPath, requireAccountSystem } = await import("./account-auth");

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

// Kapalı bir özellik "bozuk" değil "kapalı" cevabı vermeli. Bu kapı olmadan
// /api/account/register, ACCOUNT_AUTH_ENABLED kapalıyken ilk satırdaki
// ensureEmailDeliveryConfigured()'a giriyor ve üretimde EMAIL_WEBHOOK_URL
// tanımsız olduğu için yakalanmayan bir hata fırlatıyordu: ziyaretçi kayıt
// formunu doldurduğunda boş gövdeli 500 alıyordu.
describe("hesap sistemi kapısı", () => {
  const original = process.env.ACCOUNT_AUTH_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.ACCOUNT_AUTH_ENABLED;
    else process.env.ACCOUNT_AUTH_ENABLED = original;
  });

  it("hesap sistemi kapalıyken 503 ve açıklama döner", async () => {
    process.env.ACCOUNT_AUTH_ENABLED = "0";
    const response = requireAccountSystem();
    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
    expect((await response!.json()).error).toContain("kapalı");
  });

  it("hesap sistemi açıkken kapı geçirir", () => {
    process.env.ACCOUNT_AUTH_ENABLED = "1";
    expect(requireAccountSystem()).toBeNull();
  });
});
