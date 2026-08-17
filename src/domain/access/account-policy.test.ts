// Hesap akışı karar kuralları — güvenlik golden-case'leri.
// Bu kararlar daha önce route handler'ların içinde gömülüydü ve test edilmiyordu.

import { describe, expect, it } from "vitest";
import {
  CredentialTokenFacts,
  TOKEN_TTL_HOURS,
  credentialTokenUsable,
  invitationAcceptable,
  loginDecision,
  membershipMutable,
  normalizeEmail,
  organizationSlug,
  seatAvailable,
  seatLimitReducible,
  tokenExpiryFrom,
} from "./account-policy";

const NOW = new Date("2026-07-26T12:00:00.000Z");
const saatSonra = (h: number) => new Date(NOW.getTime() + h * 60 * 60 * 1000);

const gecerliJeton: CredentialTokenFacts = {
  kind: "PASSWORD_RESET",
  usedAt: null,
  expiresAt: saatSonra(1),
};

describe("kimlik jetonu geçerliliği", () => {
  it("doğru tür, kullanılmamış ve süresi dolmamış jeton kabul edilir", () => {
    expect(credentialTokenUsable(gecerliJeton, "PASSWORD_RESET", NOW)).toBe(true);
  });

  it("jeton başka bir amaç için kullanılamaz", () => {
    // Parola yenileme jetonuyla e-posta doğrulama yapılamaz ve tersi.
    expect(credentialTokenUsable(gecerliJeton, "EMAIL_VERIFY", NOW)).toBe(false);
    expect(credentialTokenUsable(gecerliJeton, "INVITATION", NOW)).toBe(false);
  });

  it("kullanılmış jeton ikinci kez kabul edilmez", () => {
    expect(
      credentialTokenUsable({ ...gecerliJeton, usedAt: saatSonra(-0.5) }, "PASSWORD_RESET", NOW),
    ).toBe(false);
  });

  it("süresi dolmuş jeton reddedilir; tam sona erme anı da geçersizdir", () => {
    expect(credentialTokenUsable({ ...gecerliJeton, expiresAt: saatSonra(-1) }, "PASSWORD_RESET", NOW)).toBe(false);
    expect(credentialTokenUsable({ ...gecerliJeton, expiresAt: NOW }, "PASSWORD_RESET", NOW)).toBe(false);
  });

  it("yaşam süreleri türe göre sabittir", () => {
    expect(TOKEN_TTL_HOURS).toEqual({ EMAIL_VERIFY: 24, PASSWORD_RESET: 1, INVITATION: 72 });
    expect(tokenExpiryFrom("PASSWORD_RESET", NOW)).toEqual(saatSonra(1));
    expect(tokenExpiryFrom("INVITATION", NOW)).toEqual(saatSonra(72));
  });
});

describe("giriş kararı", () => {
  const gecerli = { userExists: true, active: true, passwordValid: true, emailVerified: true };

  it("tüm koşullar sağlanınca girişe izin verir", () => {
    expect(loginDecision(gecerli)).toBe("ALLOW");
  });

  it("olmayan hesap, pasif hesap ve yanlış parola AYNI sonucu döndürür", () => {
    // Hesap numaralandırmasını önleyen kural: üç durum ayırt edilemez olmalı.
    expect(loginDecision({ ...gecerli, userExists: false })).toBe("INVALID_CREDENTIALS");
    expect(loginDecision({ ...gecerli, active: false })).toBe("INVALID_CREDENTIALS");
    expect(loginDecision({ ...gecerli, passwordValid: false })).toBe("INVALID_CREDENTIALS");
  });

  it("doğrulanmamış e-posta yalnız parola doğruyken ayrı sonuç verir", () => {
    expect(loginDecision({ ...gecerli, emailVerified: false })).toBe("EMAIL_NOT_VERIFIED");
    // Parola yanlışsa doğrulama durumu SIZDIRILMAZ.
    expect(loginDecision({ ...gecerli, emailVerified: false, passwordValid: false })).toBe("INVALID_CREDENTIALS");
    expect(loginDecision({ ...gecerli, emailVerified: false, userExists: false })).toBe("INVALID_CREDENTIALS");
  });
});

describe("koltuk limiti", () => {
  it("sınıra ulaşıldığında yeni davet açılamaz", () => {
    expect(seatAvailable(4, 5)).toBe(true);
    expect(seatAvailable(5, 5)).toBe(false);
    expect(seatAvailable(6, 5)).toBe(false);
  });

  it("sınır, kullanılan koltuk sayısının altına indirilemez", () => {
    expect(seatLimitReducible(5, 5)).toBe(true);
    expect(seatLimitReducible(6, 5)).toBe(true);
    expect(seatLimitReducible(4, 5)).toBe(false);
  });
});

describe("e-posta normalleştirme", () => {
  it("büyük/küçük harf ve boşluk farkını siler", () => {
    expect(normalizeEmail("  Ali.Veli@Ornek.COM ")).toBe("ali.veli@ornek.com");
  });

  it("büyük I harfini NOKTALI i'ye küçültür (Türkçe yerel ayara düşmez)", () => {
    // tr-TR ile küçültme "I" → "ı" verir ve ALI@... adresi alı@... olarak
    // kaydedilirdi; kullanıcı bir daha giriş yapamaz, hatta ikinci bir hesap
    // açılabilirdi. E-posta ASCII'de harf duyarsızdır.
    expect(normalizeEmail("ALI@ornek.com")).toBe("ali@ornek.com");
    expect(normalizeEmail("IREM@ornek.com")).toBe("irem@ornek.com");
    // Aynı adresin farklı yazımları TEK kimliğe düşmeli.
    expect(normalizeEmail("ALI@ornek.com")).toBe(normalizeEmail("ali@ORNEK.com"));
  });
});

describe("organizasyon slug'ı", () => {
  it("Türkçe karakterleri ve boşlukları güvenli biçime indirger", () => {
    expect(organizationSlug("Acme Üretim A.Ş.", "abc123")).toBe("acme-uretim-a-s-abc123");
  });

  it("harf içermeyen adda bile geçerli bir slug üretir", () => {
    expect(organizationSlug("!!!", "abc123")).toBe("sirket-abc123");
  });
});

describe("üyelik işlemleri", () => {
  it("davet yalnız INVITED üyelik için kabul edilir", () => {
    expect(invitationAcceptable("INVITED")).toBe(true);
    expect(invitationAcceptable("ACTIVE")).toBe(false);
    expect(invitationAcceptable("SUSPENDED")).toBe(false);
    expect(invitationAcceptable(null)).toBe(false);
    expect(invitationAcceptable(undefined)).toBe(false);
  });

  it("şirket sahibinin üyeliği değiştirilemez", () => {
    // ADMIN, OWNER'ı çıkararak şirketi sahipsiz bırakamamalı.
    expect(membershipMutable("OWNER")).toBe(false);
    for (const role of ["ADMIN", "MANAGER", "MEMBER", "VIEWER"]) {
      expect(membershipMutable(role), role).toBe(true);
    }
  });
});
