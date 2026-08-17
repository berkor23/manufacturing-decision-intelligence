// Kiracı izolasyonu — golden-case matrisi.
//
// Bu suit, karar motorundaki `diagnose.test.ts` ile aynı işi görür: veri
// sızıntısını önleyen kural değişirse burada kırılır. Kiracılar arası erişim
// bu projenin en yüksek riskli mantığıdır; her rol için ayrı ayrı sabitlenir.

import { describe, expect, it } from "vitest";
import {
  AccessIdentity,
  AccessRole,
  RecordOwner,
  canManageMembers,
  canReadRecord,
  canViewOrganization,
  canWriteRecord,
  isUnowned,
  ownershipQuery,
} from "./ownership";

const ACME = "org_acme";
const RAKIP = "org_rakip";
const ALI = "user_ali";
const AYSE = "user_ayse";

const individual = (userId: string): AccessIdentity => ({ userId, organizationId: null, role: null });
const member = (userId: string, role: AccessRole, organizationId = ACME): AccessIdentity => ({
  userId,
  organizationId,
  role,
});

/** Kayıtlar */
const aliKisisel: RecordOwner = { ownerUserId: ALI, organizationId: null };
const ayseKisisel: RecordOwner = { ownerUserId: AYSE, organizationId: null };
const acmeAli: RecordOwner = { ownerUserId: ALI, organizationId: ACME };
const acmeAyse: RecordOwner = { ownerUserId: AYSE, organizationId: ACME };
const rakipAyse: RecordOwner = { ownerUserId: AYSE, organizationId: RAKIP };
const sahipsiz: RecordOwner = { ownerUserId: null, organizationId: null };

const YONETIM_ROLLERI: AccessRole[] = ["OWNER", "ADMIN", "MANAGER"];
const TUM_ROLLER: AccessRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];

describe("kiracı izolasyonu — şirketler arası", () => {
  it("hiçbir rol başka şirketin kaydını okuyamaz", () => {
    for (const role of TUM_ROLLER) {
      expect(canReadRecord(member(ALI, role), rakipAyse), `${role} rakip şirketi okuyamamalı`).toBe(false);
      expect(canWriteRecord(member(ALI, role), rakipAyse), `${role} rakip şirkete yazamamalı`).toBe(false);
    }
  });

  it("şirket kaydı, aynı kullanıcının bireysel hesabına sızmaz", () => {
    // Üyelik düşerse (ör. şirket pasifleştirilir) hesap bireysele döner.
    // Kendi oluşturduğu şirket kaydı ona geri AÇILMAMALIDIR.
    expect(canReadRecord(individual(ALI), acmeAli)).toBe(false);
    expect(canWriteRecord(individual(ALI), acmeAli)).toBe(false);
  });

  it("bireysel hesap yalnız kendi kişisel kaydına erişir", () => {
    expect(canReadRecord(individual(ALI), aliKisisel)).toBe(true);
    expect(canWriteRecord(individual(ALI), aliKisisel)).toBe(true);
    expect(canReadRecord(individual(ALI), ayseKisisel)).toBe(false);
  });
});

describe("şirket içi rol matrisi", () => {
  it("yönetim rolleri şirketin tüm kayıtlarını okur ve yazar", () => {
    for (const role of YONETIM_ROLLERI) {
      expect(canReadRecord(member(ALI, role), acmeAyse), `${role} okumalı`).toBe(true);
      expect(canWriteRecord(member(ALI, role), acmeAyse), `${role} yazmalı`).toBe(true);
    }
  });

  it("MEMBER yalnız kendi kaydını görür", () => {
    expect(canReadRecord(member(ALI, "MEMBER"), acmeAli)).toBe(true);
    expect(canWriteRecord(member(ALI, "MEMBER"), acmeAli)).toBe(true);
    expect(canReadRecord(member(ALI, "MEMBER"), acmeAyse)).toBe(false);
    expect(canWriteRecord(member(ALI, "MEMBER"), acmeAyse)).toBe(false);
  });

  it("VIEWER şirket genelini okur ama hiçbir şeye yazamaz", () => {
    expect(canReadRecord(member(ALI, "VIEWER"), acmeAyse)).toBe(true);
    expect(canWriteRecord(member(ALI, "VIEWER"), acmeAyse)).toBe(false);
    // Kendi kaydına bile yazamaz — salt-okunur rol budur.
    expect(canReadRecord(member(ALI, "VIEWER"), acmeAli)).toBe(true);
    expect(canWriteRecord(member(ALI, "VIEWER"), acmeAli)).toBe(false);
  });
});

describe("sahipsiz kayıt", () => {
  it("hesap sistemi açıkken sahipsiz kayıt kimseye görünmez", () => {
    expect(isUnowned(sahipsiz)).toBe(true);
    expect(canReadRecord(individual(ALI), sahipsiz)).toBe(false);
    for (const role of TUM_ROLLER) {
      expect(canReadRecord(member(ALI, role), sahipsiz), `${role} sahipsizi görmemeli`).toBe(false);
    }
  });
});

describe("liste kapsamı tekil erişimle aynı kuralı uygular", () => {
  const TUM_KAYITLAR: { ad: string; kayit: RecordOwner }[] = [
    { ad: "aliKisisel", kayit: aliKisisel },
    { ad: "ayseKisisel", kayit: ayseKisisel },
    { ad: "acmeAli", kayit: acmeAli },
    { ad: "acmeAyse", kayit: acmeAyse },
    { ad: "rakipAyse", kayit: rakipAyse },
    { ad: "sahipsiz", kayit: sahipsiz },
  ];

  /** `ownershipQuery`yi bellek içi bir "WHERE" gibi uygular. */
  function sorguylaFiltrele(identity: AccessIdentity, kayit: RecordOwner): boolean {
    const q = ownershipQuery(identity);
    if (q.kind === "personal") return kayit.organizationId === null && kayit.ownerUserId === q.ownerUserId;
    if (q.kind === "organization") return kayit.organizationId === q.organizationId;
    return kayit.organizationId === q.organizationId && kayit.ownerUserId === q.ownerUserId;
  }

  it("her kimlik için sorgu filtresi ile canReadRecord aynı sonucu verir", () => {
    const kimlikler: AccessIdentity[] = [
      individual(ALI),
      individual(AYSE),
      ...TUM_ROLLER.map((role) => member(ALI, role)),
      ...TUM_ROLLER.map((role) => member(AYSE, role)),
      member(ALI, "ADMIN", RAKIP),
    ];
    for (const identity of kimlikler) {
      for (const { ad, kayit } of TUM_KAYITLAR) {
        expect(
          sorguylaFiltrele(identity, kayit),
          `${identity.userId}/${identity.role ?? "bireysel"}/${identity.organizationId ?? "-"} × ${ad}`,
        ).toBe(canReadRecord(identity, kayit));
      }
    }
  });
});

describe("yönetim yetkileri", () => {
  it("üye yönetimi yalnız OWNER ve ADMIN'de", () => {
    expect(canManageMembers(member(ALI, "OWNER"))).toBe(true);
    expect(canManageMembers(member(ALI, "ADMIN"))).toBe(true);
    expect(canManageMembers(member(ALI, "MANAGER"))).toBe(false);
    expect(canManageMembers(member(ALI, "MEMBER"))).toBe(false);
    expect(canManageMembers(member(ALI, "VIEWER"))).toBe(false);
    expect(canManageMembers(individual(ALI))).toBe(false);
  });

  it("şirket panosunu OWNER/ADMIN/MANAGER görür", () => {
    for (const role of YONETIM_ROLLERI) expect(canViewOrganization(member(ALI, role))).toBe(true);
    expect(canViewOrganization(member(ALI, "MEMBER"))).toBe(false);
    expect(canViewOrganization(member(ALI, "VIEWER"))).toBe(false);
    expect(canViewOrganization(individual(ALI))).toBe(false);
  });

  it("rolü olmayan bir şirket kimliği yönetim yetkisi kazanmaz", () => {
    const rolsuz: AccessIdentity = { userId: ALI, organizationId: ACME, role: null };
    expect(canManageMembers(rolsuz)).toBe(false);
    expect(canViewOrganization(rolsuz)).toBe(false);
  });
});
