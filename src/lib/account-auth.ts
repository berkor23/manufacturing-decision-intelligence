import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountService } from "@/application/wiring";
import {
  AccessIdentity,
  canManageMembers as canManageMembersRule,
  canReadRecord,
  canViewOrganization as canViewOrganizationRule,
  canWriteRecord,
  organizationSlug,
  ownershipQuery,
} from "@/domain/access";

// Parola özetleme artık bir altyapı detayı (IPasswordHasher). Mevcut çağrı
// yerleri bozulmasın diye buradan yeniden dışa aktarılır.
export { hashPassword, verifyPassword } from "@/infrastructure/auth/scrypt-password-hasher";

export const USER_SESSION_COOKIE = "mdi_user_session";

export type AccountSession = {
  userId: string;
  email: string;
  name: string;
  accountType: "INDIVIDUAL" | "COMPANY";
  organizationId: string | null;
  organizationName: string | null;
  role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER" | null;
};

export function accountAuthEnabled() {
  return process.env.ACCOUNT_AUTH_ENABLED === "1";
}

/** HTTPS altında mıyız? Çerez `secure` bayrağı için NODE_ENV tek ölçüt olmamalı. */
export function secureCookiesEnabled() {
  return process.env.NODE_ENV === "production" || (process.env.APP_URL ?? "").startsWith("https://");
}

/**
 * Oturum çerezini yazar.
 *
 * Oturumun KENDİSİNİ AccountService açar (jetonu üretir ve depoya yazar);
 * burada yalnız HTTP tarafı kalır. Çerez, uygulama katmanının bilmediği bir
 * taşıma ayrıntısıdır.
 */
export async function setSessionCookie(session: { token: string; expiresAt: Date }) {
  const store = await cookies();
  store.set(USER_SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookiesEnabled(),
    path: "/",
    expires: session.expiresAt,
  });
}

export async function destroyUserSession() {
  const store = await cookies();
  const token = store.get(USER_SESSION_COOKIE)?.value;
  if (token) await getAccountService().closeSession(token);
  store.delete(USER_SESSION_COOKIE);
}

/** İstekteki ham oturum jetonu (parola değişiminde mevcut cihazı korumak için). */
export function sessionTokenFromRequest(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  const item = cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${USER_SESSION_COOKIE}=`));
  return item ? decodeURIComponent(item.slice(USER_SESSION_COOKIE.length + 1)) : undefined;
}

export async function currentAccount(): Promise<AccountSession | null> {
  if (!accountAuthEnabled()) return null;
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  return accountFromToken(token);
}

/**
 * Çerezdeki ham jetondan oturum kimliğini çözer.
 *
 * Sorgunun kendisi repository'dedir (`resolveSession`): süre dolması, pasif
 * kullanıcı ve aktif üyelik seçimi kuralları tek yerde yaşar. Burada yalnız
 * arayüzün kullandığı `AccountSession` biçimine dönüştürülür.
 */
export async function accountFromToken(token: string | undefined): Promise<AccountSession | null> {
  if (!accountAuthEnabled()) return null;
  if (!token) return null;
  const resolved = await getAccountService().resolveSessionToken(token);
  if (!resolved) return null;
  return {
    userId: resolved.user.id,
    email: resolved.user.email,
    name: resolved.user.name,
    accountType: resolved.user.accountType,
    organizationId: resolved.membership?.organizationId ?? null,
    organizationName: resolved.membership?.organization.name ?? null,
    role: resolved.membership?.role ?? null,
  };
}

export async function accountFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const item = cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${USER_SESSION_COOKIE}=`));
  return accountFromToken(item ? decodeURIComponent(item.slice(USER_SESSION_COOKIE.length + 1)) : undefined);
}

/**
 * Oturumun saf erişim kimliğine izdüşümü. Yetki kuralı `@/domain/access`'te
 * yaşar; bu dosya yalnız kaydı DB'den okuyup kuralı uygular.
 */
export function accessIdentity(account: AccountSession): AccessIdentity {
  return { userId: account.userId, organizationId: account.organizationId, role: account.role };
}

export async function canAccessWorkspace(account: AccountSession, workspaceId: string) {
  const record = await prisma.workspaceRecord.findUnique({
    where: { id: workspaceId },
    select: { ownerUserId: true, organizationId: true, archivedAt: true },
  });
  if (!record || record.archivedAt) return false;
  return canReadRecord(accessIdentity(account), record);
}

export async function canEditWorkspace(account: AccountSession, workspaceId: string) {
  const record = await prisma.workspaceRecord.findUnique({
    where: { id: workspaceId },
    select: { ownerUserId: true, organizationId: true, archivedAt: true },
  });
  if (!record || record.archivedAt) return false;
  return canWriteRecord(accessIdentity(account), record);
}

export async function canAccessDiagnosis(account: AccountSession, conversationId: string) {
  const record = await prisma.conversationRecord.findUnique({
    where: { id: conversationId },
    select: { ownerUserId: true, organizationId: true },
  });
  return record ? canReadRecord(accessIdentity(account), record) : false;
}

export async function canAccessRca(account: AccountSession, rcaId: string) {
  const record = await prisma.rcaRecord.findUnique({
    where: { id: rcaId },
    select: { ownerUserId: true, organizationId: true },
  });
  return record ? canReadRecord(accessIdentity(account), record) : false;
}

/**
 * Hesabın görebileceği çalışma kimlikleri — portföy ekranlarının filtresi.
 * WHERE koşulu `ownershipQuery` ile üretilir; tekil erişimle aynı kuraldan
 * türediği testle sabitlenmiştir (domain/access/ownership.test.ts).
 */
export async function allowedWorkspaceIds(account: AccountSession): Promise<Set<string>> {
  const query = ownershipQuery(accessIdentity(account));
  const where =
    query.kind === "personal"
      ? { ownerUserId: query.ownerUserId, organizationId: null, archivedAt: null }
      : query.kind === "organization"
        ? { organizationId: query.organizationId, archivedAt: null }
        : { organizationId: query.organizationId, ownerUserId: query.ownerUserId, archivedAt: null };
  const records = await prisma.workspaceRecord.findMany({ where, select: { id: true } });
  return new Set(records.map((record) => record.id));
}

export function canManageMembers(account: AccountSession) {
  return canManageMembersRule(accessIdentity(account));
}

export function canViewOrganization(account: AccountSession) {
  return canViewOrganizationRule(accessIdentity(account));
}

/**
 * Giriş sonrası yönlendirme hedefi yalnız uygulama içi olabilir.
 *
 * `//` kadar `/\` de dışarı çıkar: tarayıcılar ters eğik çizgiyi normalize
 * ettiği için `/\evil.com` pratikte `//evil.com` gibi davranır. Bu yüzden
 * kontrol karakter dizisi eşleştirmeye değil, çözümlenmiş origin'e bakar.
 */
export function safeNextPath(value: unknown, fallback = "/hesabim") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  try {
    const base = "https://mdi.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

// Normalleştirme ve slug üretimi artık domain kuralıdır (account-policy);
// mevcut çağrı yerleri için buradan yeniden dışa aktarılır.
export { normalizeEmail } from "@/domain/access";

export function slugifyOrganization(value: string) {
  return organizationSlug(value, randomBytes(3).toString("hex"));
}

export async function recordActivity(input: {
  account: AccountSession;
  type: string;
  summary: string;
  workspaceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await prisma.activityEvent.create({
    data: {
      userId: input.account.userId,
      organizationId: input.account.organizationId,
      workspaceId: input.workspaceId,
      type: input.type,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}

export function isAllowedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/**
 * Hesap sistemi kapalıyken hesap uçlarını dürüstçe kapatır.
 *
 * `enforceRateLimit` gibi: kapı açıksa null, kapalıysa hazır yanıt döner.
 *
 * NEDEN: bu uçların hiçbirinde mod kontrolü yoktu. `ACCOUNT_AUTH_ENABLED`
 * kapalıyken /api/account/register çağrısı ilk satırdaki
 * `ensureEmailDeliveryConfigured()`e giriyor ve üretimde EMAIL_WEBHOOK_URL
 * tanımsız olduğu için YAKALANMAYAN bir hata fırlatıyordu — ziyaretçi kayıt
 * formunu doldurduğunda boş gövdeli 500 alıyordu. Kapalı bir özellik
 * "bozuk" değil "kapalı" cevabı vermeli.
 *
 * 503 seçildi (404/400 değil): uç vardır, geçici olarak devre dışıdır.
 */
export function requireAccountSystem(): NextResponse | null {
  if (accountAuthEnabled()) return null;
  return NextResponse.json(
    { error: "Hesap sistemi bu kurulumda kapalı. Uygulamayı hesap açmadan kullanabilirsiniz." },
    { status: 503 },
  );
}
