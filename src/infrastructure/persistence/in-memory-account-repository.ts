// IAccountRepository'nin bellek içi uygulaması.
//
// Yalnız testler içindir: kayıt, doğrulama, parola yenileme ve davet akışları
// Postgres olmadan uçtan uca sınanabilsin diye vardır. Üretimde bu depo
// seçilemez (bkz. application/wiring.ts).

import type {
  AccountCredentialToken,
  AccountMembership,
  AccountOrganization,
  AccountUser,
  AccountTypeValue,
  IAccountRepository,
  ResolvedSession,
} from "@/application/ports/account-repository";
import type { AccessRole, CredentialTokenKind } from "@/domain/access";

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${(++counter).toString(36)}`;

export class InMemoryAccountRepository implements IAccountRepository {
  readonly users = new Map<string, AccountUser>();
  readonly organizations = new Map<string, AccountOrganization>();
  readonly memberships = new Map<string, AccountMembership>();
  readonly tokens = new Map<string, AccountCredentialToken & { tokenHash: string }>();
  readonly sessions = new Map<string, { userId: string; expiresAt: Date }>();
  readonly activities: { userId: string; type: string; summary: string }[] = [];

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    accountType: AccountTypeValue;
  }) {
    const user: AccountUser = {
      id: nextId("user"),
      ...input,
      active: true,
      emailVerifiedAt: null,
      lastLoginAt: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async createOwnerWithOrganization(input: {
    name: string;
    email: string;
    passwordHash: string;
    organizationName: string;
    organizationSlug: string;
  }) {
    const user = await this.createUser({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      accountType: "COMPANY",
    });
    const organization: AccountOrganization = {
      id: nextId("org"),
      name: input.organizationName,
      slug: input.organizationSlug,
      seatLimit: 5,
      active: true,
    };
    this.organizations.set(organization.id, organization);
    const membership: AccountMembership = {
      id: nextId("mem"),
      userId: user.id,
      organizationId: organization.id,
      role: "OWNER",
      status: "ACTIVE",
      jobTitle: null,
      department: null,
      createdAt: new Date(),
    };
    this.memberships.set(membership.id, membership);
    return user;
  }

  async updateUser(
    id: string,
    patch: {
      passwordHash?: string;
      active?: boolean;
      emailVerifiedAt?: Date | null;
      lastLoginAt?: Date | null;
    },
  ) {
    const user = this.users.get(id);
    if (user) this.users.set(id, { ...user, ...patch });
  }

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    this.sessions.set(input.tokenHash, { userId: input.userId, expiresAt: input.expiresAt });
  }

  async resolveSession(tokenHash: string): Promise<ResolvedSession | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= new Date()) return null;
    const user = this.users.get(session.userId);
    // Pasif kullanıcının oturumu geçersizdir (Prisma uygulamasıyla aynı kural).
    if (!user || !user.active) return null;
    const membership =
      [...this.memberships.values()]
        .filter((m) => m.userId === user.id && m.status === "ACTIVE")
        .filter((m) => this.organizations.get(m.organizationId)?.active)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null;
    const organization = membership ? this.organizations.get(membership.organizationId) : null;
    return {
      user,
      membership: membership && organization ? { ...membership, organization } : null,
    };
  }

  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }

  async deleteUserSessions(userId: string, exceptTokenHash?: string) {
    for (const [hash, session] of this.sessions) {
      if (session.userId === userId && hash !== exceptTokenHash) this.sessions.delete(hash);
    }
  }

  async issueToken(input: {
    userId: string;
    kind: CredentialTokenKind;
    membershipId?: string | null;
    tokenHash: string;
    expiresAt: Date;
  }) {
    for (const [hash, token] of this.tokens) {
      if (token.userId === input.userId && token.kind === input.kind && !token.usedAt) {
        this.tokens.set(hash, { ...token, usedAt: new Date() });
      }
    }
    this.tokens.set(input.tokenHash, {
      id: nextId("tok"),
      tokenHash: input.tokenHash,
      userId: input.userId,
      membershipId: input.membershipId ?? null,
      kind: input.kind,
      usedAt: null,
      expiresAt: input.expiresAt,
    });
  }

  async findTokenByHash(tokenHash: string) {
    return this.tokens.get(tokenHash) ?? null;
  }

  async consumeToken(id: string) {
    for (const [hash, token] of this.tokens) {
      if (token.id !== id) continue;
      if (token.usedAt || token.expiresAt <= new Date()) return false;
      this.tokens.set(hash, { ...token, usedAt: new Date() });
      return true;
    }
    return false;
  }

  async findOrganization(id: string) {
    return this.organizations.get(id) ?? null;
  }

  async updateOrganization(id: string, patch: { name?: string; seatLimit?: number }) {
    const organization = this.organizations.get(id);
    if (!organization) throw new Error("Organizasyon bulunamadı.");
    const updated = { ...organization, ...patch };
    this.organizations.set(id, updated);
    return updated;
  }

  async countUsedSeats(organizationId: string) {
    return [...this.memberships.values()].filter(
      (m) => m.organizationId === organizationId && (m.status === "ACTIVE" || m.status === "INVITED"),
    ).length;
  }

  async findMembership(id: string, organizationId: string) {
    const membership = this.memberships.get(id);
    if (!membership || membership.organizationId !== organizationId) return null;
    const user = this.users.get(membership.userId);
    return user ? { ...membership, user } : null;
  }

  async findMembershipById(id: string) {
    const membership = this.memberships.get(id);
    if (!membership) return null;
    const user = this.users.get(membership.userId);
    return user ? { ...membership, user } : null;
  }

  async createInvitedMember(input: {
    name: string;
    email: string;
    passwordHash: string;
    organizationId: string;
    role: AccessRole;
    jobTitle: string | null;
    department: string | null;
  }) {
    const user = await this.createUser({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      accountType: "COMPANY",
    });
    const membership: AccountMembership = {
      id: nextId("mem"),
      userId: user.id,
      organizationId: input.organizationId,
      role: input.role,
      status: "INVITED",
      jobTitle: input.jobTitle,
      department: input.department,
      createdAt: new Date(),
    };
    this.memberships.set(membership.id, membership);
    return { ...membership, user };
  }

  async updateMembership(
    id: string,
    patch: Partial<Pick<AccountMembership, "role" | "status" | "jobTitle" | "department">>,
  ) {
    const membership = this.memberships.get(id);
    if (!membership) throw new Error("Üyelik bulunamadı.");
    const updated = { ...membership, ...patch };
    this.memberships.set(id, updated);
    const user = this.users.get(updated.userId)!;
    return { ...updated, user };
  }

  async removeMembership(input: { membershipId: string; userId: string }) {
    this.memberships.delete(input.membershipId);
    await this.deleteUserSessions(input.userId);
    await this.updateUser(input.userId, { active: false });
  }

  async recordActivity(input: { userId: string; type: string; summary: string }) {
    this.activities.push({ userId: input.userId, type: input.type, summary: input.summary });
  }
}
