// Hesap akışlarının KARAR kuralları — SAF çekirdek.
//
// Giriş uygunluğu, jeton geçerliliği, koltuk limiti ve davet ön koşulu birer
// güvenlik kararıdır; bunlar route handler'ların içine gömülü olduğu sürece
// ne tek yerden okunabilir ne de test edilebilirdi. Burada yalnız OLGULAR
// (facts) girer, KARAR çıkar: DB, e-posta, çerez, Next bilinmez.
//
// `ownership.ts` "kim hangi kaydı görür"ü, bu dosya "kim içeri girebilir /
// hangi işlem yapılabilir"i yanıtlar.

export type CredentialTokenKind = "EMAIL_VERIFY" | "PASSWORD_RESET" | "INVITATION";

/** Jeton türüne göre yaşam süresi (saat). Tek kaynak: burası. */
export const TOKEN_TTL_HOURS: Record<CredentialTokenKind, number> = {
  EMAIL_VERIFY: 24,
  PASSWORD_RESET: 1,
  INVITATION: 72,
};

export function tokenExpiryFrom(kind: CredentialTokenKind, now: Date): Date {
  return new Date(now.getTime() + TOKEN_TTL_HOURS[kind] * 60 * 60 * 1000);
}

export interface CredentialTokenFacts {
  kind: CredentialTokenKind;
  usedAt: Date | null;
  expiresAt: Date;
}

/**
 * Jeton kullanılabilir mi?
 *
 * Üç koşul da zorunludur: (a) beklenen türde olmalı — parola yenileme jetonu
 * e-posta doğrulama yerine geçemez, (b) daha önce kullanılmamış olmalı,
 * (c) süresi dolmamış olmalı. Süre kontrolü kesinlikle `>` değil `<=` sınırıyla
 * yapılır: tam sona erme anındaki jeton geçersizdir.
 */
export function credentialTokenUsable(
  token: CredentialTokenFacts,
  expectedKind: CredentialTokenKind,
  now: Date,
): boolean {
  if (token.kind !== expectedKind) return false;
  if (token.usedAt !== null) return false;
  return token.expiresAt.getTime() > now.getTime();
}

export interface LoginFacts {
  userExists: boolean;
  active: boolean;
  passwordValid: boolean;
  emailVerified: boolean;
}

export type LoginDecision = "ALLOW" | "INVALID_CREDENTIALS" | "EMAIL_NOT_VERIFIED";

/**
 * Giriş kararı.
 *
 * Var olmayan hesap, pasif hesap ve yanlış parola AYNI sonucu döndürür
 * (`INVALID_CREDENTIALS`): aksi hâlde giriş formu, hangi adreslerin kayıtlı
 * olduğunu sorgulama aracına dönüşür. Doğrulanmamış e-posta ancak kimlik
 * DOĞRULANDIKTAN sonra ayrı bir sonuç olarak bildirilir — bu bilgi zaten
 * parolayı bilen kişiye açıktır.
 */
export function loginDecision(facts: LoginFacts): LoginDecision {
  if (!facts.userExists || !facts.active || !facts.passwordValid) return "INVALID_CREDENTIALS";
  if (!facts.emailVerified) return "EMAIL_NOT_VERIFIED";
  return "ALLOW";
}

/** Kullanılan koltuk: aktif üyeler + bekleyen davetler. Davet koltuğu rezerve eder. */
export function seatAvailable(usedSeats: number, seatLimit: number): boolean {
  return usedSeats < seatLimit;
}

/**
 * Koltuk sınırı, halihazırda kullanılan koltuk sayısının altına indirilemez;
 * aksi hâlde şirket, sınırın üzerinde üyeyle tutarsız bir duruma düşerdi.
 */
export function seatLimitReducible(newLimit: number, usedSeats: number): boolean {
  return newLimit >= usedSeats;
}

/** Davet ancak BEKLEYEN (INVITED) bir üyelik için kabul edilebilir. */
export function invitationAcceptable(membershipStatus: string | null | undefined): boolean {
  return membershipStatus === "INVITED";
}

/**
 * Şirket sahibinin üyeliği değiştirilemez ve silinemez: aksi hâlde bir ADMIN,
 * OWNER'ı çıkararak şirketi sahipsiz bırakabilirdi.
 */
export function membershipMutable(role: string): boolean {
  return role !== "OWNER";
}

/**
 * E-posta normalleştirme — hesap kimliğinin tekilliği buna dayanır.
 *
 * Küçültme YERELDEN BAĞIMSIZ olmalıdır. Önceki uygulama `tr-TR` yerel ayarını
 * kullanıyordu; Türkçede "I" harfinin küçüğü noktasız "ı" olduğu için
 * `ALI@ornek.com` adresi `alı@ornek.com` olarak kaydediliyordu. Kullanıcı
 * girişte aynı adresi küçük harfle yazdığında (`ali@ornek.com`) eşleşme
 * bulunamıyor, adres büyük harfle yazılırsa da ikinci bir hesap açılabiliyordu.
 * E-posta adresleri ASCII'de büyük/küçük harf duyarsızdır; `toLowerCase()` doğru
 * davranıştır. (Bu hata `account-service.test.ts` ile yakalandı.)
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Organizasyon slug'ının üretimi. Rastgele son ek ÇAĞIRAN tarafından verilir
 * (fonksiyon saf kalsın diye): aynı adı taşıyan iki şirket çakışmasın.
 */
export function organizationSlug(name: string, suffix: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  return `${base || "sirket"}-${suffix}`;
}
