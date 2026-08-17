import { beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS, consumeRateLimit, enforceRateLimit, resetRateLimits } from "./rate-limit";

const request = (ip: string) => new Request("http://localhost/api/test", { headers: { "x-forwarded-for": ip } });

beforeEach(() => resetRateLimits());

describe("rate limit", () => {
  it("sınıra kadar geçirir, sonrasında engeller", () => {
    const max = RATE_LIMITS["account-login"].max;
    const req = request("10.0.0.1");
    for (let i = 0; i < max; i++) expect(consumeRateLimit(req, "account-login", "a@b.c")).toBeNull();
    expect(consumeRateLimit(req, "account-login", "a@b.c")).toBeGreaterThan(0);
  });

  it("sayaç konuya göre ayrışır — bir hesabın kilidi diğerini kilitlemez", () => {
    const req = request("10.0.0.2");
    for (let i = 0; i < RATE_LIMITS["account-login"].max + 5; i++) consumeRateLimit(req, "account-login", "kurban@x.com");
    expect(consumeRateLimit(req, "account-login", "baska@x.com")).toBeNull();
  });

  it("sayaç istemciye göre ayrışır", () => {
    for (let i = 0; i < RATE_LIMITS["ai-generate"].max + 3; i++) consumeRateLimit(request("10.0.0.3"), "ai-generate");
    expect(consumeRateLimit(request("10.0.0.4"), "ai-generate")).toBeNull();
  });

  it("sınır aşılınca Retry-After başlıklı 429 döner", () => {
    const req = request("10.0.0.5");
    for (let i = 0; i < RATE_LIMITS["admin-login"].max; i++) enforceRateLimit(req, "admin-login");
    const response = enforceRateLimit(req, "admin-login");
    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
