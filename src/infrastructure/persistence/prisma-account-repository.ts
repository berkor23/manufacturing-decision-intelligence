import "server-only";

// IAccountRepository'nin Postgres uygulaması.
//
// Tek sorumluluğu eşleme ve işlem (transaction) sınırlarıdır; hiçbir karar
// burada verilmez. Birden çok tabloyu birlikte tutarlı bırakması gereken
// akışlar ($transaction) bilinçli olarak bu katmanda toplanır.

import { prisma } from "@/lib/prisma";
import type {
  AccountCredentialToken,
  AccountMembership,
  AccountOrganization,
  AccountUser,
  IAccountRepository,
  ResolvedSession,
} from "@/application/ports/account-repository";
import type { AccessRole, CredentialTokenKind } from "@/domain/access";

type PrismaUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  accountType: "INDIVIDUAL" | "COMPANY";
  active: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
};

const toUser = (row: PrismaUser): AccountUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.passwordHash,
  accountType: row.accountType,
  active: row.active,
  emailVerifiedAt: row.emailVerifiedAt,
  lastLoginAt: row.lastLoginAt,
});

type PrismaMembership = {
  id: string;
  userId: string;
  organizationId: string;
  role: AccessRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  jobTitle: string | null;
  department: string | null;
  createdAt: Date;
};

const toMembership = (row: PrismaMembership): AccountMembership => ({
  id: row.id,
  userId: row.userId,
  organizationId: row.organizationId,
  role: row.role,
  status: row.status,
  jobTitle: row.jobTitle,
  department: row.department,
  createdAt: row.createdAt,
});

const toOrganization = (row: {
  id: string;
  name: string;
  slug: string;
  seatLimit: number;
  active: boolean;
}): AccountOrganization => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  seatLimit: row.seatLimit,
  active: row.active,
});

export class PrismaAccountRepository implements IAccountRepository {
  async findUserByEmail(email: string): Promise<AccountUser | null> {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? toUser(row) : null;
  }

  async findUserById(id: string): Promise<AccountUser | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    accountType: "INDIVIDUAL" | "COMPANY";
  }): Promise<AccountUser> {
    return toUser(await prisma.user.create({ data: input }));
  }

  async createOwnerWithOrganization(input: {
    name: string;
    email: string;
    passwordHash: string;
    organizationName: string;
    organizationSlug: string;
  }): Promise<AccountUser> {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          accountType: "COMPANY",
        },
      });
      const organization = await tx.organization.create({
        data: { name: input.organizationName, slug: input.organizationSlug },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: "OWNER", status: "ACTIVE" },
      });
      return user;
    });
    return toUser(created);
  }

  async updateUser(
    id: string,
    patch: {
      passwordHash?: string;
      active?: boolean;
      emailVerifiedAt?: Date | null;
      lastLoginAt?: Date | null;
    },
  ): Promise<void> {
    await prisma.user.update({ where: { id }, data: patch });
  }

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await prisma.userSession.create({ data: input });
  }

  async resolveSession(tokenHash: string): Promise<ResolvedSession | null> {
    const session = await prisma.userSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: "ACTIVE", organization: { active: true } },
              include: { organization: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });
    // Pasifleştirilmiş kullanıcının oturumu geçersizdir: şirketten çıkarılan
    // biri elindeki çerezle içeride kalmamalı.
    if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
    const membership = session.user.memberships[0] ?? null;
    return {
      user: toUser(session.user),
      membership: membership
        ? { ...toMembership(membership), organization: toOrganization(membership.organization) }
        : null,
    };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await prisma.userSession.deleteMany({ where: { tokenHash } });
  }

  async deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: exceptTokenHash ? { userId, tokenHash: { not: exceptTokenHash } } : { userId },
    });
  }

  async issueToken(input: {
    userId: string;
    kind: CredentialTokenKind;
    membershipId?: string | null;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.$transaction([
      // Aynı türdeki önceki bağlantılar geçersizleşir: iki geçerli sıfırlama
      // bağlantısının aynı anda dolaşımda olmasını istemiyoruz.
      prisma.credentialToken.updateMany({
        where: { userId: input.userId, type: input.kind, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.credentialToken.create({
        data: {
          tokenHash: input.tokenHash,
          type: input.kind,
          userId: input.userId,
          membershipId: input.membershipId ?? undefined,
          expiresAt: input.expiresAt,
        },
      }),
    ]);
  }

  async findTokenByHash(tokenHash: string): Promise<AccountCredentialToken | null> {
    const row = await prisma.credentialToken.findUnique({ where: { tokenHash } });
    return row
      ? {
          id: row.id,
          userId: row.userId,
          membershipId: row.membershipId,
          kind: row.type,
          usedAt: row.usedAt,
          expiresAt: row.expiresAt,
        }
      : null;
  }

  async consumeToken(id: string): Promise<boolean> {
    const result = await prisma.credentialToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return result.count === 1;
  }

  async findOrganization(id: string): Promise<AccountOrganization | null> {
    const row = await prisma.organization.findUnique({ where: { id } });
    return row ? toOrganization(row) : null;
  }

  async updateOrganization(id: string, patch: { name?: string; seatLimit?: number }): Promise<AccountOrganization> {
    return toOrganization(await prisma.organization.update({ where: { id }, data: patch }));
  }

  async countUsedSeats(organizationId: string): Promise<number> {
    return prisma.membership.count({
      where: { organizationId, status: { in: ["ACTIVE", "INVITED"] } },
    });
  }

  async findMembership(
    id: string,
    organizationId: string,
  ): Promise<(AccountMembership & { user: AccountUser }) | null> {
    const row = await prisma.membership.findFirst({
      where: { id, organizationId },
      include: { user: true },
    });
    return row ? { ...toMembership(row), user: toUser(row.user) } : null;
  }

  async findMembershipById(id: string): Promise<(AccountMembership & { user: AccountUser }) | null> {
    const row = await prisma.membership.findUnique({ where: { id }, include: { user: true } });
    return row ? { ...toMembership(row), user: toUser(row.user) } : null;
  }

  async createInvitedMember(input: {
    name: string;
    email: string;
    passwordHash: string;
    organizationId: string;
    role: AccessRole;
    jobTitle: string | null;
    department: string | null;
  }): Promise<AccountMembership & { user: AccountUser }> {
    const row = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          accountType: "COMPANY",
        },
      });
      return tx.membership.create({
        data: {
          userId: user.id,
          organizationId: input.organizationId,
          role: input.role,
          status: "INVITED",
          jobTitle: input.jobTitle,
          department: input.department,
        },
        include: { user: true },
      });
    });
    return { ...toMembership(row), user: toUser(row.user) };
  }

  async updateMembership(
    id: string,
    patch: Partial<Pick<AccountMembership, "role" | "status" | "jobTitle" | "department">>,
  ): Promise<AccountMembership & { user: AccountUser }> {
    const row = await prisma.membership.update({ where: { id }, data: patch, include: { user: true } });
    return { ...toMembership(row), user: toUser(row.user) };
  }

  async removeMembership(input: { membershipId: string; userId: string }): Promise<void> {
    await prisma.$transaction([
      prisma.userSession.deleteMany({ where: { userId: input.userId } }),
      prisma.membership.delete({ where: { id: input.membershipId } }),
      prisma.user.update({ where: { id: input.userId }, data: { active: false } }),
    ]);
  }

  async recordActivity(input: {
    userId: string;
    organizationId: string | null;
    workspaceId?: string;
    type: string;
    summary: string;
    metadata?: Record<string, string | number | boolean | null>;
  }): Promise<void> {
    await prisma.activityEvent.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        type: input.type,
        summary: input.summary,
        metadata: input.metadata,
      },
    });
  }
}
