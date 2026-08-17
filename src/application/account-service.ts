// Account Service — hesap akışlarının orkestrasyonu.
//
// KARAR domain'dedir (`domain/access/account-policy.ts`), I/O port arkasındadır
// (`IAccountRepository`, `IPasswordHasher`, `IEmailSender`). Bu servis ikisini
// birleştirir ve HTTP bilmez: çerez yazmaz, istek/yanıt nesnesi görmez.
// Oturum jetonunu ÜRETİR ve döndürür; çereze yazmak route'un işidir.

import { createHash, randomBytes } from "node:crypto";
import type {
  AccountMembership,
  AccountOrganization,
  AccountUser,
  IAccountRepository,
} from "./ports/account-repository";
import type { IPasswordHasher } from "./ports/password-hasher";
import type { IEmailSender } from "./ports/email-sender";
import {
  type AccessRole,
  type CredentialTokenKind,
  credentialTokenUsable,
  invitationAcceptable,
  loginDecision,
  membershipMutable,
  normalizeEmail,
  organizationSlug,
  seatAvailable,
  seatLimitReducible,
  tokenExpiryFrom,
} from "@/domain/access";

const SESSION_DAYS = 14;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Oturum jetonu: ham değer çağırana döner, depoda yalnız sha256'sı durur. */
export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

export type RegisterResult = {
  /** Numaralandırmayı önlemek için var olan adres de "ok" döner. */
  redirectTo: string;
  previewUrl: string | null;
};

export type LoginResult =
  | { outcome: "ALLOW"; session: IssuedSession; accountType: AccountUser["accountType"] }
  | { outcome: "INVALID_CREDENTIALS" }
  | { outcome: "EMAIL_NOT_VERIFIED" };

export type TokenFlowResult =
  | { ok: true; session: IssuedSession; accountType: AccountUser["accountType"] }
  | { ok: false };

export class AccountService {
  constructor(
    private readonly repo: IAccountRepository,
    private readonly hasher: IPasswordHasher,
    private readonly email: IEmailSender,
  ) {}

  // ── oturum ────────────────────────────────────────────────────────────
  private async openSession(userId: string): Promise<IssuedSession> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await this.repo.createSession({ userId, tokenHash: digest(token), expiresAt });
    return { token, expiresAt };
  }

  async closeSession(token: string): Promise<void> {
    await this.repo.deleteSession(digest(token));
  }

  /** Ham oturum jetonunu çözer (süre, pasif kullanıcı, aktif üyelik kuralları repo'da). */
  async resolveSessionToken(token: string) {
    return this.repo.resolveSession(digest(token));
  }

  /** Kimlik jetonu üretir ve ham değerini döndürür (depoda yalnız özeti durur). */
  private async issueToken(input: {
    userId: string;
    kind: CredentialTokenKind;
    membershipId?: string | null;
  }): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.repo.issueToken({
      userId: input.userId,
      kind: input.kind,
      membershipId: input.membershipId ?? null,
      tokenHash: digest(token),
      expiresAt: tokenExpiryFrom(input.kind, new Date()),
    });
    return token;
  }

  /** Jetonu bulur, domain kuralıyla doğrular ve ATOMİK olarak tüketir. */
  private async consumeUsableToken(rawToken: string, kind: CredentialTokenKind) {
    const record = await this.repo.findTokenByHash(digest(rawToken));
    if (!record) return null;
    if (!credentialTokenUsable(record, kind, new Date())) return null;
    return (await this.repo.consumeToken(record.id)) ? record : null;
  }

  // ── kayıt ve doğrulama ────────────────────────────────────────────────
  async register(input: {
    name: string;
    email: string;
    password: string;
    accountType: AccountUser["accountType"];
    companyName?: string;
  }): Promise<RegisterResult> {
    const email = normalizeEmail(input.email);
    const redirectTo = `/dogrulama-bekliyor?email=${encodeURIComponent(email)}`;
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      // Kayıt formu "bu adres sistemde mi?" sorgusuna dönüşmesin diye yanıt
      // aynıdır; durumu yalnız adresin SAHİBİ e-postayla öğrenir.
      await this.email
        .send({
          to: email,
          subject: "MDI kayıt denemesi",
          title: "Bu adres zaten kayıtlı",
          message:
            "Bu e-posta adresiyle yeni bir hesap açılmaya çalışıldı. Hesap zaten mevcut; parolanızı hatırlamıyorsanız yenileyebilirsiniz.",
          actionLabel: "Parolamı yenile",
          actionUrl: `${this.email.baseUrl()}/sifremi-unuttum`,
        })
        .catch((error) => console.error("[register] existing-account notice failed", error));
      return { redirectTo, previewUrl: null };
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user =
      input.accountType === "COMPANY"
        ? await this.repo.createOwnerWithOrganization({
            name: input.name,
            email,
            passwordHash,
            organizationName: input.companyName!,
            organizationSlug: organizationSlug(input.companyName!, randomBytes(3).toString("hex")),
          })
        : await this.repo.createUser({ name: input.name, email, passwordHash, accountType: "INDIVIDUAL" });

    const token = await this.issueToken({ userId: user.id, kind: "EMAIL_VERIFY" });
    const delivery = await this.email.send({
      to: user.email,
      subject: "MDI hesabınızı doğrulayın",
      title: "Hesabınız hazır",
      message: "E-posta adresinizi doğruladıktan sonra çalışma alanınıza giriş yapabilirsiniz.",
      actionLabel: "E-posta adresimi doğrula",
      actionUrl: `${this.email.baseUrl()}/dogrula?token=${encodeURIComponent(token)}`,
    });
    return { redirectTo, previewUrl: delivery.previewUrl };
  }

  async verifyEmail(rawToken: string): Promise<TokenFlowResult> {
    const record = await this.consumeUsableToken(rawToken, "EMAIL_VERIFY");
    if (!record) return { ok: false };
    await this.repo.updateUser(record.userId, { emailVerifiedAt: new Date(), active: true });
    const user = await this.repo.findUserById(record.userId);
    if (!user) return { ok: false };
    return { ok: true, session: await this.openSession(user.id), accountType: user.accountType };
  }

  /** Yanıt her zaman aynıdır: adresin kayıtlı olup olmadığı sızdırılmaz. */
  async resendVerification(rawEmail: string): Promise<{ previewUrl: string | null }> {
    const user = await this.repo.findUserByEmail(normalizeEmail(rawEmail));
    if (!user || user.emailVerifiedAt || !user.active) return { previewUrl: null };
    const token = await this.issueToken({ userId: user.id, kind: "EMAIL_VERIFY" });
    const delivery = await this.email.send({
      to: user.email,
      subject: "MDI e-posta doğrulama bağlantınız",
      title: "E-posta adresinizi doğrulayın",
      message: "Yeni doğrulama bağlantınız 24 saat geçerlidir.",
      actionLabel: "E-postamı doğrula",
      actionUrl: `${this.email.baseUrl()}/dogrula?token=${encodeURIComponent(token)}`,
    });
    return { previewUrl: delivery.previewUrl };
  }

  // ── giriş ─────────────────────────────────────────────────────────────
  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const user = await this.repo.findUserByEmail(normalizeEmail(input.email));
    const passwordValid = user?.active ? await this.hasher.verify(input.password, user.passwordHash) : false;
    const decision = loginDecision({
      userExists: user !== null,
      active: user?.active ?? false,
      passwordValid,
      emailVerified: user?.emailVerifiedAt != null,
    });
    if (!user || decision === "INVALID_CREDENTIALS") return { outcome: "INVALID_CREDENTIALS" };
    if (decision === "EMAIL_NOT_VERIFIED") return { outcome: "EMAIL_NOT_VERIFIED" };
    await this.repo.updateUser(user.id, { lastLoginAt: new Date() });
    return { outcome: "ALLOW", session: await this.openSession(user.id), accountType: user.accountType };
  }

  // ── parola ────────────────────────────────────────────────────────────
  /** Yanıt her zaman aynıdır: adresin kayıtlı olup olmadığı sızdırılmaz. */
  async requestPasswordReset(rawEmail: string): Promise<{ previewUrl: string | null }> {
    const user = await this.repo.findUserByEmail(normalizeEmail(rawEmail));
    if (!user?.active || !user.emailVerifiedAt) return { previewUrl: null };
    const token = await this.issueToken({ userId: user.id, kind: "PASSWORD_RESET" });
    const delivery = await this.email.send({
      to: user.email,
      subject: "MDI parola yenileme",
      title: "Parolanızı yenileyin",
      message:
        "Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz. Bağlantı bir saat geçerlidir.",
      actionLabel: "Yeni parola belirle",
      actionUrl: `${this.email.baseUrl()}/sifre-yenile?token=${encodeURIComponent(token)}`,
    });
    return { previewUrl: delivery.previewUrl };
  }

  async resetPassword(rawToken: string, password: string): Promise<TokenFlowResult> {
    const record = await this.consumeUsableToken(rawToken, "PASSWORD_RESET");
    if (!record) return { ok: false };
    await this.repo.updateUser(record.userId, { passwordHash: await this.hasher.hash(password) });
    // Parola yenilendiğinde TÜM oturumlar düşer: hesabı ele geçiren taraf
    // varsa erişimi burada kesilir.
    await this.repo.deleteUserSessions(record.userId);
    const user = await this.repo.findUserById(record.userId);
    if (!user) return { ok: false };
    return { ok: true, session: await this.openSession(user.id), accountType: user.accountType };
  }

  /**
   * Oturum içi parola değişimi. Mevcut oturum korunur, diğer tüm oturumlar
   * düşer — kullanıcı "diğer cihazlardan çık" beklentisiyle parola değiştirir.
   */
  async changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    currentSessionToken?: string;
  }): Promise<{ ok: boolean }> {
    const user = await this.repo.findUserById(input.userId);
    if (!user || !(await this.hasher.verify(input.currentPassword, user.passwordHash))) {
      return { ok: false };
    }
    await this.repo.updateUser(user.id, { passwordHash: await this.hasher.hash(input.newPassword) });
    await this.repo.deleteUserSessions(
      user.id,
      input.currentSessionToken ? digest(input.currentSessionToken) : undefined,
    );
    return { ok: true };
  }

  // ── davet ─────────────────────────────────────────────────────────────
  async acceptInvitation(rawToken: string, password: string): Promise<TokenFlowResult> {
    const record = await this.repo.findTokenByHash(digest(rawToken));
    if (!record?.membershipId || !credentialTokenUsable(record, "INVITATION", new Date())) return { ok: false };
    // Üyelik kimliği jetonun kendisinden gelir; hangi şirkete ait olduğunu
    // çağıran belirlemez (davet bağlantısı tek başına yetkilendirir).
    const membership = await this.repo.findMembershipById(record.membershipId);
    if (!membership || !invitationAcceptable(membership.status)) return { ok: false };
    if (!(await this.repo.consumeToken(record.id))) return { ok: false };

    await this.repo.updateUser(record.userId, {
      passwordHash: await this.hasher.hash(password),
      emailVerifiedAt: new Date(),
      active: true,
    });
    await this.repo.updateMembership(membership.id, { status: "ACTIVE" });
    const user = await this.repo.findUserById(record.userId);
    if (!user) return { ok: false };
    return { ok: true, session: await this.openSession(user.id), accountType: user.accountType };
  }

  // ── şirket yönetimi ───────────────────────────────────────────────────
  async inviteMember(input: {
    organizationId: string;
    actor: { userId: string; organizationId: string | null };
    name: string;
    email: string;
    role: AccessRole;
    jobTitle?: string;
    department?: string;
  }): Promise<
    | { ok: true; membership: AccountMembership & { user: AccountUser }; previewUrl: string | null }
    | { ok: false; reason: "SEAT_LIMIT" | "EMAIL_TAKEN" | "NO_ORGANIZATION" }
  > {
    const organization = await this.repo.findOrganization(input.organizationId);
    if (!organization) return { ok: false, reason: "NO_ORGANIZATION" };
    const used = await this.repo.countUsedSeats(organization.id);
    if (!seatAvailable(used, organization.seatLimit)) return { ok: false, reason: "SEAT_LIMIT" };

    const email = normalizeEmail(input.email);
    if (await this.repo.findUserByEmail(email)) return { ok: false, reason: "EMAIL_TAKEN" };

    // Davet edilen kullanıcı parolasını daveti kabul ederken belirler; şimdilik
    // tahmin edilemez bir değer konur ki hesap parolasız kalmasın.
    const membership = await this.repo.createInvitedMember({
      name: input.name,
      email,
      passwordHash: await this.hasher.hash(randomBytes(32).toString("base64url")),
      organizationId: organization.id,
      role: input.role,
      jobTitle: input.jobTitle || null,
      department: input.department || null,
    });
    const previewUrl = await this.sendInvitation(membership, organization);
    await this.repo.recordActivity({
      userId: input.actor.userId,
      organizationId: input.actor.organizationId,
      type: "MEMBER_ADDED",
      summary: `${membership.user.name} şirkete eklendi.`,
    });
    return { ok: true, membership, previewUrl };
  }

  private async sendInvitation(
    membership: AccountMembership & { user: AccountUser },
    organization: AccountOrganization,
  ): Promise<string | null> {
    const token = await this.issueToken({
      userId: membership.userId,
      kind: "INVITATION",
      membershipId: membership.id,
    });
    const delivery = await this.email.send({
      to: membership.user.email,
      subject: `${organization.name} sizi MDI çalışma alanına davet etti`,
      title: `${organization.name} ekibine katılın`,
      message:
        "Parolanızı belirleyip daveti kabul ettiğinizde şirket çalışma alanına erişebilirsiniz.",
      actionLabel: "Daveti kabul et",
      actionUrl: `${this.email.baseUrl()}/davet?token=${encodeURIComponent(token)}`,
    });
    return delivery.previewUrl;
  }

  async resendInvitation(input: {
    membershipId: string;
    organizationId: string;
  }): Promise<{ ok: boolean; previewUrl: string | null }> {
    const membership = await this.repo.findMembership(input.membershipId, input.organizationId);
    if (!membership || !invitationAcceptable(membership.status)) return { ok: false, previewUrl: null };
    const organization = await this.repo.findOrganization(input.organizationId);
    if (!organization) return { ok: false, previewUrl: null };
    return { ok: true, previewUrl: await this.sendInvitation(membership, organization) };
  }

  async updateMember(input: {
    membershipId: string;
    organizationId: string;
    actor: { userId: string; organizationId: string | null };
    patch: Partial<Pick<AccountMembership, "role" | "status" | "jobTitle" | "department">>;
  }): Promise<{ ok: true; membership: AccountMembership & { user: AccountUser } } | { ok: false }> {
    const existing = await this.repo.findMembership(input.membershipId, input.organizationId);
    if (!existing || !membershipMutable(existing.role)) return { ok: false };
    const membership = await this.repo.updateMembership(existing.id, input.patch);
    await this.repo.recordActivity({
      userId: input.actor.userId,
      organizationId: input.actor.organizationId,
      type: "MEMBER_UPDATED",
      summary: `${membership.user.name} kullanıcısının erişimi güncellendi.`,
    });
    return { ok: true, membership };
  }

  async removeMember(input: {
    membershipId: string;
    organizationId: string;
    actor: { userId: string; organizationId: string | null };
  }): Promise<{ ok: boolean }> {
    const existing = await this.repo.findMembership(input.membershipId, input.organizationId);
    if (!existing || !membershipMutable(existing.role)) return { ok: false };
    await this.repo.removeMembership({ membershipId: existing.id, userId: existing.userId });
    await this.repo.recordActivity({
      userId: input.actor.userId,
      organizationId: input.actor.organizationId,
      type: "MEMBER_REMOVED",
      summary: `${existing.user.name} şirketten çıkarıldı.`,
    });
    return { ok: true };
  }

  async updateOrganization(input: {
    organizationId: string;
    actor: { userId: string; organizationId: string | null };
    name: string;
    seatLimit: number;
  }): Promise<
    { ok: true; organization: AccountOrganization } | { ok: false; reason: "SEAT_BELOW_USED"; used: number }
  > {
    const used = await this.repo.countUsedSeats(input.organizationId);
    if (!seatLimitReducible(input.seatLimit, used)) return { ok: false, reason: "SEAT_BELOW_USED", used };
    const organization = await this.repo.updateOrganization(input.organizationId, {
      name: input.name,
      seatLimit: input.seatLimit,
    });
    await this.repo.recordActivity({
      userId: input.actor.userId,
      organizationId: input.actor.organizationId,
      type: "ORGANIZATION_UPDATED",
      summary: "Şirket ayarları güncellendi.",
    });
    return { ok: true, organization };
  }
}
