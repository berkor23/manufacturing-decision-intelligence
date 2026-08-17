// Hesap / kiracılık kalıcılık PORTU.
//
// Hesap akışlarının KARARLARI zaten domain'de (`domain/access/account-policy.ts`).
// Bu port, o kararların ihtiyaç duyduğu OLGULARI okuyup sonuçlarını yazan I/O
// sözleşmesidir. Amaç mimari simetriyi tamamlamak kadar test edilebilirliktir:
// kayıt, doğrulama, parola yenileme ve davet akışları bellek içi bir uygulama
// ile Postgres olmadan uçtan uca sınanabilir.
//
// Prisma tipleri BİLİNÇLİ olarak sızdırılmaz; buradaki arayüzler uygulamanın
// kendi dilidir.

import type { AccessRole, CredentialTokenKind } from "@/domain/access";

export type AccountTypeValue = "INDIVIDUAL" | "COMPANY";
export type MembershipStatusValue = "INVITED" | "ACTIVE" | "SUSPENDED";

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  accountType: AccountTypeValue;
  active: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
}

export interface AccountOrganization {
  id: string;
  name: string;
  slug: string;
  seatLimit: number;
  active: boolean;
}

export interface AccountMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: AccessRole;
  status: MembershipStatusValue;
  jobTitle: string | null;
  department: string | null;
  createdAt: Date;
}

export interface AccountCredentialToken {
  id: string;
  userId: string;
  membershipId: string | null;
  kind: CredentialTokenKind;
  usedAt: Date | null;
  expiresAt: Date;
}

/** Oturum çözümlemesi için kullanıcı + (varsa) ilk aktif üyeliği birlikte döner. */
export interface ResolvedSession {
  user: AccountUser;
  membership: (AccountMembership & { organization: AccountOrganization }) | null;
}

export interface IAccountRepository {
  // — kullanıcı —
  findUserByEmail(email: string): Promise<AccountUser | null>;
  findUserById(id: string): Promise<AccountUser | null>;
  /** Bireysel hesap; şirket hesabı için `createOwnerWithOrganization`. */
  createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    accountType: AccountTypeValue;
  }): Promise<AccountUser>;
  /**
   * Şirket hesabı açılışı: kullanıcı + organizasyon + OWNER üyeliği TEK işlemde.
   * Parça parça yazım, sahibi olmayan bir organizasyon bırakabilirdi.
   */
  createOwnerWithOrganization(input: {
    name: string;
    email: string;
    passwordHash: string;
    organizationName: string;
    organizationSlug: string;
  }): Promise<AccountUser>;
  updateUser(
    id: string,
    patch: Partial<Pick<AccountUser, "passwordHash" | "active">> & {
      emailVerifiedAt?: Date | null;
      lastLoginAt?: Date | null;
    },
  ): Promise<void>;

  // — oturum —
  createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  resolveSession(tokenHash: string): Promise<ResolvedSession | null>;
  deleteSession(tokenHash: string): Promise<void>;
  /** `exceptTokenHash` verilirse o oturum korunur (parola değişiminde mevcut cihaz). */
  deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void>;

  // — kimlik jetonları —
  /** Aynı türdeki kullanılmamış jetonları geçersizler ve yenisini yazar (tek işlem). */
  issueToken(input: {
    userId: string;
    kind: CredentialTokenKind;
    membershipId?: string | null;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<AccountCredentialToken | null>;
  /**
   * Jetonu ATOMİK olarak tüketir: yalnız hâlâ kullanılmamış ve süresi dolmamışsa
   * true. Yarışan iki isteğin aynı daveti/sıfırlamayı iki kez kullanmasını önler.
   */
  consumeToken(id: string): Promise<boolean>;

  // — organizasyon ve üyelik —
  findOrganization(id: string): Promise<AccountOrganization | null>;
  updateOrganization(id: string, patch: { name?: string; seatLimit?: number }): Promise<AccountOrganization>;
  /** Aktif + davetli üyelik sayısı: davet de koltuk rezerve eder. */
  countUsedSeats(organizationId: string): Promise<number>;
  findMembership(id: string, organizationId: string): Promise<(AccountMembership & { user: AccountUser }) | null>;
  /**
   * Şirket kısıtı olmadan üyelik araması — YALNIZ davet jetonu akışı için.
   * Jeton üyeliği kendisi işaret ettiği için ayrıca organizasyon doğrulaması
   * gerekmez; diğer tüm yollar `findMembership` ile şirkete bağlı arar.
   */
  findMembershipById(id: string): Promise<(AccountMembership & { user: AccountUser }) | null>;
  /** Şirkete çalışan ekleme: kullanıcı + INVITED üyelik tek işlemde. */
  createInvitedMember(input: {
    name: string;
    email: string;
    passwordHash: string;
    organizationId: string;
    role: AccessRole;
    jobTitle: string | null;
    department: string | null;
  }): Promise<AccountMembership & { user: AccountUser }>;
  updateMembership(
    id: string,
    patch: Partial<Pick<AccountMembership, "role" | "status" | "jobTitle" | "department">>,
  ): Promise<AccountMembership & { user: AccountUser }>;
  /**
   * Üyeliği kaldırır, kullanıcıyı pasifleştirir ve oturumlarını siler (tek işlem).
   * Üçü ayrı yazılırsa çıkarılan kişi hâlâ oturumlu kalabilirdi.
   */
  removeMembership(input: { membershipId: string; userId: string }): Promise<void>;

  // — etkinlik —
  recordActivity(input: {
    userId: string;
    organizationId: string | null;
    workspaceId?: string;
    type: string;
    summary: string;
    metadata?: Record<string, string | number | boolean | null>;
  }): Promise<void>;
}
