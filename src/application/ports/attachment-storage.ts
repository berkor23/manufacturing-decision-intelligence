// Ek dosya deposu PORTU.
//
// Ek dosyaların İÇERİĞİ (baytlar) ile ÜST VERİSİ (WorkspaceAttachment) ayrı
// yaşar: üst veri çalışma kaydının jsonb'sindedir, baytlar bu portun arkasında.
// Böylece depolama bir "detay"tır — yerel disk, Postgres veya ileride bir nesne
// deposu, uygulama/domain katmanı değişmeden takılıp çıkarılır.
//
// Neden port gerekti: baytlar doğrudan yerel diske yazılıyordu. Tek makineli
// kurulumda doğru, ama çok örnekli veya serverless bir dağıtımda (Vercel) her
// örnek kendi geçici diskini görür — yüklenen dosya başka bir isteği karşılayan
// örnekte YOKTUR ve dağıtım sonrası kaybolur.

export interface IAttachmentStorage {
  /** Depolama biçiminin adı — teşhis/günlük için. */
  readonly name: string;
  /**
   * `storageKey` çalışma kimliğiyle başlar (`{workspaceId}/{attachmentId}{ext}`);
   * uygulamalar bu anahtarı kendi düzenlerine çevirir.
   */
  put(input: {
    storageKey: string;
    workspaceId: string;
    data: Uint8Array;
    mimeType: string;
  }): Promise<void>;
  /**
   * Dosya baytları; bulunamazsa null (çağıran 404 döndürür). MIME tipi ve
   * özgün ad çalışma kaydındaki üst veriden okunur, depodan değil.
   */
  get(storageKey: string): Promise<Uint8Array | null>;
}
