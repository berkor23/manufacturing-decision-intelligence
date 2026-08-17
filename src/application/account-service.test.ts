// Hesap akışlarının uçtan uca testleri.
//
// Bu akışlar (kayıt, doğrulama, giriş, parola yenileme, davet) daha önce
// route handler'ların içinde yaşıyordu ve HİÇ test edilmiyordu. Port'lar
// sayesinde artık Postgres ve gerçek e-posta olmadan koşuyorlar.
//
// Parola özetleyici olarak hızlı bir sahte kullanılır: gerçek scrypt bilinçli
// olarak ~0,5 sn sürer ve bu suit onlarca kez parola özetler.

import { beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "./account-service";
import { InMemoryAccountRepository } from "@/infrastructure/persistence/in-memory-account-repository";
import type { IPasswordHasher } from "./ports/password-hasher";
import type { AccountEmail, IEmailSender } from "./ports/email-sender";

const fastHasher: IPasswordHasher = {
  async hash(password) {
    return `fake:${password}`;
  },
  async verify(password, stored) {
    return stored === `fake:${password}`;
  },
};

class RecordingEmailSender implements IEmailSender {
  readonly sent: AccountEmail[] = [];
  async send(email: AccountEmail) {
    this.sent.push(email);
    return { delivered: true, previewUrl: null };
  }
  baseUrl() {
    return "https://mdi.test";
  }
  /** Son e-postadaki bağlantıdan jetonu çıkarır (kullanıcının tıkladığı şey). */
  lastToken() {
    const url = this.sent.at(-1)?.actionUrl ?? "";
    return decodeURIComponent(new URL(url).searchParams.get("token") ?? "");
  }
}

let repo: InMemoryAccountRepository;
let email: RecordingEmailSender;
let service: AccountService;

beforeEach(() => {
  repo = new InMemoryAccountRepository();
  email = new RecordingEmailSender();
  service = new AccountService(repo, fastHasher, email);
});

/** Doğrulanmış, giriş yapabilir bireysel hesap. */
async function verifiedUser(address = "ali@ornek.com", password = "Parola12345") {
  await service.register({ name: "Ali Veli", email: address, password, accountType: "INDIVIDUAL" });
  const result = await service.verifyEmail(email.lastToken());
  expect(result.ok).toBe(true);
  return { address, password };
}

describe("kayıt", () => {
  it("bireysel hesabı oluşturur ve doğrulama bağlantısı gönderir", async () => {
    const result = await service.register({
      name: "Ali Veli",
      email: "  ALI@Ornek.com ",
      password: "Parola12345",
      accountType: "INDIVIDUAL",
    });
    expect(result.redirectTo).toContain("dogrulama-bekliyor");
    // E-posta normalleştirilerek saklanır.
    expect(await repo.findUserByEmail("ali@ornek.com")).not.toBeNull();
    expect(email.sent.at(-1)?.subject).toBe("MDI hesabınızı doğrulayın");
  });

  it("şirket hesabında organizasyon ve OWNER üyeliği birlikte oluşur", async () => {
    await service.register({
      name: "Ayşe Yıldız",
      email: "ayse@acme.com",
      password: "Parola12345",
      accountType: "COMPANY",
      companyName: "Acme Üretim",
    });
    expect(repo.organizations.size).toBe(1);
    const membership = [...repo.memberships.values()][0];
    expect(membership.role).toBe("OWNER");
    expect(membership.status).toBe("ACTIVE");
    expect([...repo.organizations.values()][0].slug).toMatch(/^acme-uretim-[0-9a-f]{6}$/);
  });

  it("var olan adres için hesap açmaz ama yanıtı ayırt edilemez tutar", async () => {
    await service.register({ name: "Ali", email: "ali@ornek.com", password: "Parola12345", accountType: "INDIVIDUAL" });
    const before = repo.users.size;
    const result = await service.register({
      name: "Saldırgan",
      email: "ali@ornek.com",
      password: "BaskaParola9",
      accountType: "INDIVIDUAL",
    });
    // Numaralandırma yok: aynı yönlendirme, yeni kullanıcı yok, parola değişmedi.
    expect(result.redirectTo).toContain("dogrulama-bekliyor");
    expect(repo.users.size).toBe(before);
    expect(email.sent.at(-1)?.title).toBe("Bu adres zaten kayıtlı");
  });
});

describe("e-posta doğrulama", () => {
  it("geçerli jeton hesabı doğrular ve oturum açar", async () => {
    await service.register({ name: "Ali", email: "ali@ornek.com", password: "Parola12345", accountType: "INDIVIDUAL" });
    const result = await service.verifyEmail(email.lastToken());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await repo.resolveSession(hashOf(result.session.token))).not.toBeNull();
    expect((await repo.findUserByEmail("ali@ornek.com"))?.emailVerifiedAt).not.toBeNull();
  });

  it("aynı jeton ikinci kez kullanılamaz", async () => {
    await service.register({ name: "Ali", email: "ali@ornek.com", password: "Parola12345", accountType: "INDIVIDUAL" });
    const token = email.lastToken();
    expect((await service.verifyEmail(token)).ok).toBe(true);
    expect((await service.verifyEmail(token)).ok).toBe(false);
  });

  it("parola yenileme jetonu doğrulama yerine geçmez", async () => {
    const { address } = await verifiedUser();
    await service.requestPasswordReset(address);
    expect((await service.verifyEmail(email.lastToken())).ok).toBe(false);
  });
});

describe("giriş", () => {
  it("doğrulanmış hesap giriş yapar", async () => {
    const { address, password } = await verifiedUser();
    const result = await service.login({ email: address, password });
    expect(result.outcome).toBe("ALLOW");
  });

  it("doğrulanmamış hesap girişte engellenir", async () => {
    await service.register({ name: "Ali", email: "ali@ornek.com", password: "Parola12345", accountType: "INDIVIDUAL" });
    expect((await service.login({ email: "ali@ornek.com", password: "Parola12345" })).outcome).toBe(
      "EMAIL_NOT_VERIFIED",
    );
  });

  it("yanlış parola, doğrulama durumunu SIZDIRMAZ", async () => {
    await service.register({ name: "Ali", email: "ali@ornek.com", password: "Parola12345", accountType: "INDIVIDUAL" });
    // Hesap doğrulanmamış ama parola da yanlış: yanıt "geçersiz kimlik" olmalı,
    // "önce doğrulayın" değil. Aksi hâlde parola bilmeyen biri hesabın
    // varlığını ve durumunu öğrenirdi.
    expect((await service.login({ email: "ali@ornek.com", password: "YanlisParola" })).outcome).toBe(
      "INVALID_CREDENTIALS",
    );
  });

  it("olmayan hesap ve pasif hesap aynı sonucu verir", async () => {
    expect((await service.login({ email: "yok@ornek.com", password: "Parola12345" })).outcome).toBe(
      "INVALID_CREDENTIALS",
    );
    const { address, password } = await verifiedUser();
    const user = await repo.findUserByEmail(address);
    await repo.updateUser(user!.id, { active: false });
    expect((await service.login({ email: address, password })).outcome).toBe("INVALID_CREDENTIALS");
  });
});

describe("parola yenileme", () => {
  it("bağlantı yalnız doğrulanmış ve aktif hesaba gider", async () => {
    await service.register({ name: "Ali", email: "ali@ornek.com", password: "Parola12345", accountType: "INDIVIDUAL" });
    // Henüz doğrulanmamış: sıfırlama bağlantısı üretilmez.
    const before = email.sent.length;
    expect((await service.requestPasswordReset("ali@ornek.com")).previewUrl).toBeNull();
    expect(email.sent.length).toBe(before);
    // Kayıtlı olmayan adres de aynı sessiz yanıtı verir.
    expect((await service.requestPasswordReset("yok@ornek.com")).previewUrl).toBeNull();
  });

  it("yenileme sonrası yeni parola geçerlidir ve tüm eski oturumlar düşer", async () => {
    const { address, password } = await verifiedUser();
    const first = await service.login({ email: address, password });
    expect(first.outcome).toBe("ALLOW");
    if (first.outcome !== "ALLOW") return;

    await service.requestPasswordReset(address);
    const reset = await service.resetPassword(email.lastToken(), "YeniParola123");
    expect(reset.ok).toBe(true);

    // Eski oturum geçersiz, eski parola çalışmıyor, yeni parola çalışıyor.
    expect(await repo.resolveSession(hashOf(first.session.token))).toBeNull();
    expect((await service.login({ email: address, password })).outcome).toBe("INVALID_CREDENTIALS");
    expect((await service.login({ email: address, password: "YeniParola123" })).outcome).toBe("ALLOW");
  });
});

describe("oturum içi parola değişimi", () => {
  it("mevcut oturumu korur, diğerlerini düşürür", async () => {
    const { address, password } = await verifiedUser();
    const telefon = await service.login({ email: address, password });
    const masaustu = await service.login({ email: address, password });
    if (telefon.outcome !== "ALLOW" || masaustu.outcome !== "ALLOW") throw new Error("giriş başarısız");

    const result = await service.changePassword({
      userId: (await repo.findUserByEmail(address))!.id,
      currentPassword: password,
      newPassword: "YeniParola123",
      currentSessionToken: masaustu.session.token,
    });
    expect(result.ok).toBe(true);
    expect(await repo.resolveSession(hashOf(masaustu.session.token))).not.toBeNull();
    expect(await repo.resolveSession(hashOf(telefon.session.token))).toBeNull();
  });

  it("mevcut parola yanlışsa değişiklik yapılmaz", async () => {
    const { address, password } = await verifiedUser();
    const result = await service.changePassword({
      userId: (await repo.findUserByEmail(address))!.id,
      currentPassword: "YanlisParola",
      newPassword: "YeniParola123",
    });
    expect(result.ok).toBe(false);
    expect((await service.login({ email: address, password })).outcome).toBe("ALLOW");
  });
});

describe("şirket daveti", () => {
  async function company() {
    await service.register({
      name: "Ayşe",
      email: "ayse@acme.com",
      password: "Parola12345",
      accountType: "COMPANY",
      companyName: "Acme",
    });
    const organization = [...repo.organizations.values()][0];
    const owner = (await repo.findUserByEmail("ayse@acme.com"))!;
    return { organization, actor: { userId: owner.id, organizationId: organization.id } };
  }

  it("davet edilen kullanıcı parolasını belirleyip aktifleşir", async () => {
    const { organization, actor } = await company();
    const invite = await service.inviteMember({
      organizationId: organization.id,
      actor,
      name: "Mehmet",
      email: "mehmet@acme.com",
      role: "MEMBER",
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;
    expect(invite.membership.status).toBe("INVITED");

    const accepted = await service.acceptInvitation(email.lastToken(), "UyeParola123");
    expect(accepted.ok).toBe(true);
    expect([...repo.memberships.values()].find((m) => m.userId === invite.membership.userId)?.status).toBe("ACTIVE");
    expect((await service.login({ email: "mehmet@acme.com", password: "UyeParola123" })).outcome).toBe("ALLOW");
  });

  it("davet ikinci kez kabul edilemez", async () => {
    const { organization, actor } = await company();
    await service.inviteMember({ organizationId: organization.id, actor, name: "Mehmet", email: "mehmet@acme.com", role: "MEMBER" });
    const token = email.lastToken();
    expect((await service.acceptInvitation(token, "UyeParola123")).ok).toBe(true);
    expect((await service.acceptInvitation(token, "BaskaParola9")).ok).toBe(false);
  });

  it("koltuk sınırı dolduğunda davet açılmaz", async () => {
    const { organization, actor } = await company();
    await repo.updateOrganization(organization.id, { seatLimit: 2 });
    const ilk = await service.inviteMember({ organizationId: organization.id, actor, name: "Mehmet", email: "m@acme.com", role: "MEMBER" });
    expect(ilk.ok).toBe(true);
    // OWNER + davetli = 2 koltuk dolu; davet de koltuk rezerve eder.
    const ikinci = await service.inviteMember({ organizationId: organization.id, actor, name: "Zeynep", email: "z@acme.com", role: "MEMBER" });
    expect(ikinci).toEqual({ ok: false, reason: "SEAT_LIMIT" });
  });

  it("başka hesapta kullanılan e-posta ile davet açılmaz", async () => {
    const { organization, actor } = await company();
    await service.register({ name: "Dış", email: "dis@ornek.com", password: "Parola12345", accountType: "INDIVIDUAL" });
    const invite = await service.inviteMember({ organizationId: organization.id, actor, name: "Dış", email: "dis@ornek.com", role: "MEMBER" });
    expect(invite).toEqual({ ok: false, reason: "EMAIL_TAKEN" });
  });

  it("OWNER üyeliği değiştirilemez ve çıkarılamaz", async () => {
    const { organization, actor } = await company();
    const ownerMembership = [...repo.memberships.values()][0];
    expect(
      await service.updateMember({
        membershipId: ownerMembership.id,
        organizationId: organization.id,
        actor,
        patch: { role: "VIEWER" },
      }),
    ).toEqual({ ok: false });
    expect(
      await service.removeMember({ membershipId: ownerMembership.id, organizationId: organization.id, actor }),
    ).toEqual({ ok: false });
  });

  it("çıkarılan üyenin oturumları düşer ve hesabı pasifleşir", async () => {
    const { organization, actor } = await company();
    const invite = await service.inviteMember({ organizationId: organization.id, actor, name: "Mehmet", email: "m@acme.com", role: "MEMBER" });
    if (!invite.ok) throw new Error("davet açılamadı");
    await service.acceptInvitation(email.lastToken(), "UyeParola123");
    const session = await service.login({ email: "m@acme.com", password: "UyeParola123" });
    if (session.outcome !== "ALLOW") throw new Error("giriş başarısız");

    expect(await service.removeMember({ membershipId: invite.membership.id, organizationId: organization.id, actor })).toEqual({ ok: true });
    expect(await repo.resolveSession(hashOf(session.session.token))).toBeNull();
    expect((await repo.findUserById(invite.membership.userId))?.active).toBe(false);
    expect((await service.login({ email: "m@acme.com", password: "UyeParola123" })).outcome).toBe("INVALID_CREDENTIALS");
  });

  it("koltuk sınırı kullanılan koltuğun altına indirilemez", async () => {
    const { organization, actor } = await company();
    const result = await service.updateOrganization({ organizationId: organization.id, actor, name: "Acme", seatLimit: 0 });
    expect(result).toMatchObject({ ok: false, reason: "SEAT_BELOW_USED", used: 1 });
  });
});

/** Servisin depoya yazdığı biçim: jetonun sha256'sı. */
function hashOf(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

import { createHash } from "node:crypto";
