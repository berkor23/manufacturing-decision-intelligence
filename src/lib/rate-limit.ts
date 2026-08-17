import "server-only";

import { NextResponse } from "next/server";

/**
 * Süreç-içi sabit pencere hız sınırlayıcı.
 *
 * Kapsam ve sınır: sayaç tek Node süreci içinde tutulur. Tek örnekli iç araç
 * kurulumunda (bu projenin hedefi) doğru çalışır; yatay ölçekli veya serverless
 * bir dağıtımda her örnek kendi sayacını tutar ve etkin sınır örnek sayısıyla
 * çarpılır. Böyle bir kuruluma geçilirse sayaç paylaşımlı bir depoya
 * (Redis/Postgres) taşınmalıdır. Yine de kaba-kuvvet ve e-posta bombardımanına
 * karşı hiç korumasız kalmaktan belirgin biçimde iyidir.
 */

type Bucket = { count: number; resetAt: number };

const BUCKETS = new Map<string, Bucket>();
let lastSweep = Date.now();

/** İşlem başına pencere (ms) ve pencere içindeki üst sınır. */
export const RATE_LIMITS = {
  "account-login": { windowMs: 15 * 60_000, max: 10 },
  "account-register": { windowMs: 60 * 60_000, max: 5 },
  "account-token": { windowMs: 15 * 60_000, max: 20 },
  "email-dispatch": { windowMs: 60 * 60_000, max: 5 },
  "password-change": { windowMs: 15 * 60_000, max: 10 },
  "app-login": { windowMs: 15 * 60_000, max: 10 },
  "admin-login": { windowMs: 15 * 60_000, max: 5 },
  "member-invite": { windowMs: 60 * 60_000, max: 30 },
  "ai-generate": { windowMs: 60_000, max: 12 },
  "diagnosis-start": { windowMs: 60_000, max: 20 },
  "guest-diagnosis": { windowMs: 60_000, max: 45 },
  "workspace-import": { windowMs: 60 * 60_000, max: 20 },
  "local-workspace-import": { windowMs: 60 * 60_000, max: 30 },
  "attachment-upload": { windowMs: 60 * 60_000, max: 60 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/** Ters proxy arkasında istemci adresi. Güvenilir bir kimlik değil; kaba filtre. */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of BUCKETS) if (bucket.resetAt <= now) BUCKETS.delete(key);
}

/**
 * Sayacı artırır. Sınır aşıldıysa kalan saniyeyi döndürür, aşılmadıysa null.
 * `subject` verilirse (ör. normalize e-posta) sayaç IP+konu ikilisine bağlanır.
 */
export function consumeRateLimit(request: Request, action: RateLimitAction, subject?: string): number | null {
  const { windowMs, max } = RATE_LIMITS[action];
  const now = Date.now();
  sweep(now);
  const key = `${action}:${clientKey(request)}:${subject ?? ""}`;
  const bucket = BUCKETS.get(key);
  if (!bucket || bucket.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > max) return Math.ceil((bucket.resetAt - now) / 1000);
  return null;
}

/** Sınır aşıldıysa hazır 429 yanıtı, aşılmadıysa null. */
export function enforceRateLimit(request: Request, action: RateLimitAction, subject?: string): NextResponse | null {
  const retryAfter = consumeRateLimit(request, action, subject);
  if (retryAfter === null) return null;
  return NextResponse.json(
    { error: "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Testler için sayaçları sıfırlar. */
export function resetRateLimits() {
  BUCKETS.clear();
}
