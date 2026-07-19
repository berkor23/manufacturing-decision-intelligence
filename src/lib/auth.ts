// Basit tek-kiracılı auth — iç araç için "kapıda parola".
//
// İlke: `APP_PASSWORD` tanımlı DEĞİLSE auth tamamen kapalıdır (out-of-box
// kurulum bozulmaz). Tanımlıysa her sayfa/istek oturum çerezi ister.
//
// Oturum çerezi = HMAC-SHA256(APP_PASSWORD, sabit mesaj). Parola çereze
// yazılmaz; çerez tek başına parolayı ele vermez ve sunucuda yeniden
// hesaplanarak sabit-zamanlı karşılaştırılır. Web Crypto kullanır —
// hem Node hem Edge runtime'da çalışır.

export const SESSION_COOKIE = "mdi_session";
export const ADMIN_SESSION_COOKIE = "mdi_admin_session";
const SESSION_MESSAGE = "mdi-session-v1";
const ADMIN_SESSION_MESSAGE = "mdi-admin-session-v1";

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

/** Parolaya karşılık gelen oturum jetonu. */
export async function sessionToken(password: string): Promise<string> {
  return signedToken(password, SESSION_MESSAGE);
}

export async function adminSessionToken(password: string): Promise<string> {
  return signedToken(password, ADMIN_SESSION_MESSAGE);
}

async function signedToken(password: string, message: string): Promise<string> {
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

/** Ayrı admin parolası yoksa mevcut uygulama oturumu tek-kiracılı yönetici kabul edilir. */
export async function isValidAdminSession(adminToken: string | undefined, appToken?: string): Promise<boolean> {
  const password = adminPassword();
  if (!password) return isValidSession(appToken);
  if (!adminToken) return false;
  return timingSafeEqual(adminToken, await adminSessionToken(password));
}

/** Çerezdeki jeton geçerli mi? */
export async function isValidSession(token: string | undefined): Promise<boolean> {
  const password = appPassword();
  if (!password) return true; // auth kapalı
  if (!token) return false;
  return timingSafeEqual(token, await sessionToken(password));
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Uzunluk sızdırmayan, erken çıkışsız karşılaştırma. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
