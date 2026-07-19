// Auth testleri — "parola yoksa auth kapalı" davranışı ve jeton doğrulaması.

import { afterEach, describe, expect, it } from "vitest";
import { adminSessionToken, authEnabled, isValidAdminSession, isValidSession, sessionToken } from "./auth";

const ORIGINAL = process.env.APP_PASSWORD;
const ORIGINAL_ADMIN = process.env.ADMIN_PASSWORD;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.APP_PASSWORD;
  else process.env.APP_PASSWORD = ORIGINAL;
  if (ORIGINAL_ADMIN === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIGINAL_ADMIN;
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

  it("jeton deterministik ve parolayı açık taşımaz", async () => {
    const a = await sessionToken("p@rola");
    const b = await sessionToken("p@rola");
    expect(a).toBe(b);
    expect(a).not.toContain("p@rola");
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
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
