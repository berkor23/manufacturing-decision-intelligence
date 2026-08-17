// Kiracı erişim kuralları — SAF çekirdek.
//
// Kim hangi kaydı görebilir/değiştirebilir sorusunun TEK doğruluk kaynağı.
// Burada DB, Prisma, Next veya oturum bilgisi yoktur: girdi olarak yalnız
// çözümlenmiş kimlik ve kaydın sahiplik alanları alınır. Böylece kural,
// `rules.ts` gibi tablo testleriyle korunabilir (bkz. ownership.test.ts).
//
// `src/lib/account-auth.ts` bu fonksiyonları çağırır; kuralın kopyasını tutmaz.

/** Şirket hesabındaki üyelik rolü. Bireysel hesapta rol yoktur (null). */
export type AccessRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

/** Erişim kararı için gereken kimlik alanları (oturumun saf izdüşümü). */
export interface AccessIdentity {
  userId: string;
  /** Aktif üyelik yoksa null — hesap bireysel gibi davranır. */
  organizationId: string | null;
  role: AccessRole | null;
}

/** Bir kaydın sahiplik alanları. Her ikisi de null ise kayıt sahipsizdir. */
export interface RecordOwner {
  ownerUserId: string | null;
  organizationId: string | null;
}

/** Sahipsiz kayıt: hesap kimliği bağlanmadan oluşturulmuş (auth kapalı kurulum). */
export function isUnowned(record: RecordOwner): boolean {
  return record.ownerUserId === null && record.organizationId === null;
}

/**
 * Okuma yetkisi.
 *
 * - Bireysel hesap (organizationId yok): yalnız KENDİ kişisel kaydı. Kaydın bir
 *   şirkete ait olması erişimi keser — üyeliği düşmüş bir kullanıcının (ör. şirket
 *   pasifleştirildiğinde) şirket kayıtlarını kişisel kaydı gibi görmesini önler.
 * - Şirket hesabı: yalnız kendi şirketinin kayıtları. MEMBER yalnız kendi
 *   oluşturduğunu görür; VIEWER dahil diğer roller şirketin tamamını görür
 *   (VIEWER şirket geneli SALT-OKUNUR gözdür — yazma yetkisi canWriteRecord'da kesilir).
 * - Sahipsiz kayıt kimseye ait değildir: hesap sistemi açıkken görünmez.
 */
export function canReadRecord(identity: AccessIdentity, record: RecordOwner): boolean {
  if (!identity.organizationId) {
    return record.organizationId === null && record.ownerUserId === identity.userId;
  }
  if (record.organizationId !== identity.organizationId) return false;
  if (identity.role === "MEMBER") return record.ownerUserId === identity.userId;
  return true;
}

/** VIEWER salt-okunurdur; onun dışında yazma yetkisi okuma yetkisiyle aynıdır. */
export function canWriteRecord(identity: AccessIdentity, record: RecordOwner): boolean {
  if (identity.role === "VIEWER") return false;
  return canReadRecord(identity, record);
}

/**
 * Liste ekranlarının sorgu kapsamı — `canReadRecord` ile AYNI kuralın küme hâli.
 * İkisi ayrışırsa portföy listesi, tek kayıt erişiminden farklı davranır; bu
 * yüzden test her iki yolu birlikte doğrular.
 */
export type OwnershipQuery =
  | { kind: "personal"; ownerUserId: string }
  | { kind: "organization"; organizationId: string }
  | { kind: "organization-own"; organizationId: string; ownerUserId: string };

export function ownershipQuery(identity: AccessIdentity): OwnershipQuery {
  if (!identity.organizationId) return { kind: "personal", ownerUserId: identity.userId };
  if (identity.role === "MEMBER") {
    return { kind: "organization-own", organizationId: identity.organizationId, ownerUserId: identity.userId };
  }
  return { kind: "organization", organizationId: identity.organizationId };
}

/** Üye ekleme/çıkarma/rol değiştirme yetkisi. */
export function canManageMembers(identity: AccessIdentity): boolean {
  return identity.organizationId !== null && (identity.role === "OWNER" || identity.role === "ADMIN");
}

/** Şirket panosunu (üyeler, kullanım, etkinlik) görme yetkisi. */
export function canViewOrganization(identity: AccessIdentity): boolean {
  return (
    identity.organizationId !== null &&
    (identity.role === "OWNER" || identity.role === "ADMIN" || identity.role === "MANAGER")
  );
}
