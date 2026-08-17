// IPasswordHasher'ın scrypt uygulaması.
//
// Bu kod `lib/account-auth.ts`'ten taşındı; davranışı birebir aynıdır ve
// mevcut parola özetleri geçersizleşmez. Ayrı bir dosyada olması, algoritmayı
// port arkasındaki bir "detay" hâline getirir.

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";
import type { IPasswordHasher } from "@/application/ports/password-hasher";

// promisify, scrypt'in options'lı aşırı yüklemesini kaybediyor; açıkça daraltılır.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer>;

// OWASP kabul edilen ayarlardan N=2^16, r=8, p=1. Varsayılan N=16384 bunun
// dörtte biriydi. N=2^17 bu makinede ~580 ms sürüyor: kimliksiz çağrılabilen
// giriş ucunda hem gecikme hem CPU tüketimi anlamına geldiği için bir kademe
// aşağısı tercih edildi (hız sınırı ikinci katman olarak devrede).
// maxmem, 128 * N * r üzerine pay bırakacak şekilde açıkça verilir.
const SCRYPT = { N: 1 << 16, r: 8, p: 1, keylen: 64, maxmem: 256 * 1024 * 1024 } as const;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, SCRYPT.keylen, SCRYPT)) as Buffer;
  return `scrypt2:${SCRYPT.N}:${SCRYPT.r}:${SCRYPT.p}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Hem yeni (`scrypt2:N:r:p:salt:hash`) hem eski (`scrypt:salt:hash`, varsayılan
 * parametreler) biçimi doğrular — mevcut parolalar geçersizleşmez.
 */
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(":");
  let saltHex: string, hashHex: string, options: { N: number; r: number; p: number; maxmem: number };
  if (parts[0] === "scrypt2" && parts.length === 6) {
    const [, n, r, p] = parts;
    saltHex = parts[4];
    hashHex = parts[5];
    options = { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem };
    if (!Number.isInteger(options.N) || !Number.isInteger(options.r) || !Number.isInteger(options.p)) return false;
  } else if (parts[0] === "scrypt" && parts.length === 3) {
    saltHex = parts[1];
    hashHex = parts[2];
    options = { N: 16384, r: 8, p: 1, maxmem: SCRYPT.maxmem };
  } else {
    return false;
  }
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, options)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export class ScryptPasswordHasher implements IPasswordHasher {
  hash(password: string) {
    return hashPassword(password);
  }
  verify(password: string, stored: string) {
    return verifyPassword(password, stored);
  }
}
