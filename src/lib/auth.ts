// Basit tek-kiracılı auth — iç araç için "kapıda parola".
//
// İlke: `APP_PASSWORD` tanımlı DEĞİLSE auth tamamen kapalıdır (out-of-box
// kurulum bozulmaz). Tanımlıysa her sayfa/istek oturum çerezi ister.
//
// Oturum çerezi = `<verilişZamanı>.<nonce>.<HMAC-SHA256(parola, mesaj|gövde)>`.
// Parola çereze yazılmaz; çerez tek başına parolayı ele vermez ve sunucuda
// yeniden hesaplanarak sabit-zamanlı karşılaştırılır. Web Crypto kullanır —
// hem Node hem Edge runtime'da çalışır.
//
// Nonce ve veriliş zamanı bilinçlidir: jeton eskiden yalnız paroladan türeyen
// SABİT bir değerdi; tüm kullanıcılarda aynıydı, süresi dolmuyordu ve sızması
// hâlinde parola değişene dek süresiz erişim veriyordu. Artık her oturum farklı
// bir jeton alır ve yaş sunucuda doğrulanır (çerezin maxAge'ine güvenilmez).

export const SESSION_COOKIE = "mdi_session";
export const ADMIN_SESSION_COOKIE = "mdi_admin_session";
const SESSION_MESSAGE = "mdi-session-v2";
const ADMIN_SESSION_MESSAGE = "mdi-admin-session-v2";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export function appPassword(): string | null {
  const p = process.env.APP_PASSWORD;
  return p && p.length > 0 ? p : null;
}

/** Auth açık mı? (APP_PASSWORD yoksa kapalı) */
export function authEnabled(): boolean {
  return appPassword() !== null;
}

export function adminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length > 0 ? password : null;
}

/** Parolaya bağlı, oturuma özgü ve süreli jeton üretir. */
export async function sessionToken(password: string): Promise<string> {
  return issueToken(password, SESSION_MESSAGE);
}

export async function adminSessionToken(password: string): Promise<string> {
  return issueToken(password, ADMIN_SESSION_MESSAGE);
}

async function issueToken(password: string, message: string): Promise<string> {
  const issuedAt = Date.now().toString(36);
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const body = `${issuedAt}.${nonce}`;
  return `${body}.${await sign(password, `${message}|${body}`)}`;
}

/** Jeton imzası geçerli ve yaşı sınır içinde mi? */
async function verifyToken(token: string, password: string, message: string, maxAgeSeconds: number): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, nonce, signature] = parts;
  const issuedMs = Number.parseInt(issuedAt, 36);
  if (!Number.isFinite(issuedMs)) return false;
  const age = Date.now() - issuedMs;
  // Gelecek tarihli jeton (saat kayması payı dışında) kabul edilmez.
  if (age < -60_000 || age > maxAgeSeconds * 1000) return false;
  return timingSafeEqual(signature, await sign(password, `${message}|${issuedAt}.${nonce}`));
}

async function sign(password: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64url(new Uint8Array(sig));
}

/**
 * Ayrı admin parolası yoksa mevcut uygulama oturumu tek-kiracılı yönetici kabul edilir.
 *
 * GÜVENLİK: Hesap modunda (ACCOUNT_AUTH_ENABLED=1) bu geri düşüş KULLANILMAZ.
 * Aksi hâlde APP_PASSWORD de tanımlı değilken `isValidSession` "auth kapalı"
 * varsayıp true döner ve /admin ile /api/admin/* kimlik doğrulamasız açılırdı —
 * çalışma silme dahil. Çok kiracılı kurulumda yönetici paneli, açıkça
 * ADMIN_PASSWORD tanımlanmasını şart koşar.
 */
export async function isValidAdminSession(adminToken: string | undefined, appToken?: string): Promise<boolean> {
  const password = adminPassword();
  if (!password) return accountAuthMode() ? false : isValidSession(appToken);
  if (!adminToken) return false;
  return verifyToken(adminToken, password, ADMIN_SESSION_MESSAGE, ADMIN_SESSION_MAX_AGE_SECONDS);
}

/** account-auth.ts'i import etmeden (server-only + Prisma) aynı bayrağı okur. */
function accountAuthMode(): boolean {
  return process.env.ACCOUNT_AUTH_ENABLED === "1";
}

/** Çerezdeki jeton geçerli mi? */
export async function isValidSession(token: string | undefined): Promise<boolean> {
  const password = appPassword();
  if (!password) return true; // auth kapalı
  if (!token) return false;
  return verifyToken(token, password, SESSION_MESSAGE, SESSION_MAX_AGE_SECONDS);
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Parola/jeton karşılaştırmaları için sabit-zamanlı eşitlik. */
export function constantTimeEquals(a: string, b: string): boolean {
  return timingSafeEqual(a, b);
}

/** Uzunluk sızdırmayan, erken çıkışsız karşılaştırma. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
