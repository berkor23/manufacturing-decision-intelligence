// Auth testleri — "parola yoksa auth kapalı" davranışı ve jeton doğrulaması.

import { afterEach, describe, expect, it } from "vitest";
import { adminSessionToken, authEnabled, isValidAdminSession, isValidSession, sessionToken } from "./auth";

const ORIGINAL = process.env.APP_PASSWORD;
const ORIGINAL_ADMIN = process.env.ADMIN_PASSWORD;
const ORIGINAL_ACCOUNT = process.env.ACCOUNT_AUTH_ENABLED;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.APP_PASSWORD;
  else process.env.APP_PASSWORD = ORIGINAL;
  if (ORIGINAL_ADMIN === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIGINAL_ADMIN;
  if (ORIGINAL_ACCOUNT === undefined) delete process.env.ACCOUNT_AUTH_ENABLED;
  else process.env.ACCOUNT_AUTH_ENABLED = ORIGINAL_ACCOUNT;
});

describe("auth", () => {
  it("APP_PASSWORD yoksa auth kapalı ve her istek geçer", async () => {
    delete process.env.APP_PASSWORD;
    expect(authEnabled()).toBe(false);
    expect(await isValidSession(undefined)).toBe(true);
  });

  it("boş APP_PASSWORD auth'u açmaz", () => {
    process.env.APP_PASSWORD = "";
    expect(authEnabled()).toBe(false);
  });

  it("doğru parolanın jetonu geçerli, çerezsiz/yanlış jeton geçersiz", async () => {
    process.env.APP_PASSWORD = "gizli-parola";
    expect(authEnabled()).toBe(true);

    const token = await sessionToken("gizli-parola");
    expect(await isValidSession(token)).toBe(true);
    expect(await isValidSession(undefined)).toBe(false);
    expect(await isValidSession("sahte")).toBe(false);
    expect(await isValidSession(await sessionToken("baska-parola"))).toBe(false);
  });

  it("her oturum farklı jeton alır ve parolayı açık taşımaz", async () => {
    process.env.APP_PASSWORD = "p@rola";
    const a = await sessionToken("p@rola");
    const b = await sessionToken("p@rola");
    // Sabit jeton, tüm kullanıcılarda aynı ve süresiz geçerli olurdu.
    expect(a).not.toBe(b);
    expect(a).not.toContain("p@rola");
    expect(a).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await isValidSession(a)).toBe(true);
    expect(await isValidSession(b)).toBe(true);
  });

  it("süresi geçmiş jeton reddedilir", async () => {
    process.env.APP_PASSWORD = "gizli";
    const token = await sessionToken("gizli");
    const [, nonce, signature] = token.split(".");
    // 31 gün öncesine ait veriliş zamanı (sınır: 30 gün).
    const stale = `${(Date.now() - 31 * 24 * 60 * 60 * 1000).toString(36)}.${nonce}.${signature}`;
    expect(await isValidSession(stale)).toBe(false);
  });

  it("gövdesi kurcalanmış jeton reddedilir", async () => {
    process.env.APP_PASSWORD = "gizli";
    const [issuedAt, , signature] = (await sessionToken("gizli")).split(".");
    expect(await isValidSession(`${issuedAt}.baskaNonce.${signature}`)).toBe(false);
  });

  it("parola değişince eski çerez geçersizleşir", async () => {
    const old = await sessionToken("eski");
    process.env.APP_PASSWORD = "yeni";
    expect(await isValidSession(old)).toBe(false);
  });

  it("ayrı admin parolası tanımlıysa uygulama oturumu admin yetkisi vermez", async () => {
    process.env.APP_PASSWORD = "uygulama";
    process.env.ADMIN_PASSWORD = "yonetici";
    const appToken = await sessionToken("uygulama");
    expect(await isValidAdminSession(undefined, appToken)).toBe(false);
    expect(await isValidAdminSession(await adminSessionToken("yonetici"), appToken)).toBe(true);
  });

  it("admin parolası yoksa geçerli uygulama oturumu yönetici kabul edilir", async () => {
    process.env.APP_PASSWORD = "tek-kiraci";
    delete process.env.ADMIN_PASSWORD;
    expect(await isValidAdminSession(undefined, await sessionToken("tek-kiraci"))).toBe(true);
  });
});

// Regresyon: hesap modunda "parola yoksa auth kapalı" geri düşüşü,
// ADMIN_PASSWORD ve APP_PASSWORD tanımsızken /admin ile /api/admin/* yollarını
// kimlik doğrulamasız açıyordu — çalışma silme (DELETE) dahil.
describe("yönetici kapısı — hesap modu (ACCOUNT_AUTH_ENABLED=1)", () => {
  it("ADMIN_PASSWORD tanımsızsa yönetici erişimini reddeder", async () => {
    process.env.ACCOUNT_AUTH_ENABLED = "1";
    delete process.env.ADMIN_PASSWORD;
    delete process.env.APP_PASSWORD;
    expect(await isValidAdminSession(undefined, undefined)).toBe(false);
  });

  it("uygulama parolası oturumu yönetici yerine geçmez", async () => {
    process.env.ACCOUNT_AUTH_ENABLED = "1";
    delete process.env.ADMIN_PASSWORD;
    process.env.APP_PASSWORD = "ekip-parolasi";
    expect(await isValidAdminSession(undefined, await sessionToken("ekip-parolasi"))).toBe(false);
  });

  it("ADMIN_PASSWORD tanımlıysa yalnız doğru jetonu kabul eder", async () => {
    process.env.ACCOUNT_AUTH_ENABLED = "1";
    process.env.ADMIN_PASSWORD = "yonetici-parolasi";
    expect(await isValidAdminSession(await adminSessionToken("yonetici-parolasi"))).toBe(true);
    expect(await isValidAdminSession(await adminSessionToken("yanlis"))).toBe(false);
    expect(await isValidAdminSession(undefined)).toBe(false);
  });
});
