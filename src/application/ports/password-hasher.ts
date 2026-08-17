// Parola özetleme PORTU.
//
// Ayrı bir port olmasının iki nedeni var: (a) algoritma bir "detay"tır,
// (b) gerçek scrypt bilinçli olarak YAVAŞtır (~0,5 sn) — hesap akışı testleri
// bunu yüzlerce kez çalıştıramaz, hızlı bir sahte uygulama takılır.

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}
