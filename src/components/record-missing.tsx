import Link from "next/link";

/**
 * Açılamayan kayıt için ortak durum ekranı.
 *
 * Önceden hem çalışma alanı hem RCA, boş bir sayfada duran çıplak kırmızı bir
 * satır gösteriyordu: düzen yok, çıkış yolu yok. Bağlantısı eskimiş veya adresi
 * yanlış yazılmış bir ziyaretçi çıkmaz sokakta kalıyordu.
 *
 * Renk bilinçli olarak nötr (`alert-idle`): bulunamayan bir kayıt tehlike
 * değil, boş bir durumdur — `--st-risk` burada durumu abartıyordu.
 */
export function RecordMissing({
  title,
  reason,
  backHref,
  backLabel,
}: {
  title: string;
  reason: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <section className="card mx-auto w-full max-w-lg p-6 sm:p-8">
      <div className="border-b border-[var(--rule-strong)] pb-4">
        <p className="eyebrow">Kayıt bulunamadı</p>
        <h1 className="page-heading mt-1.5">{title}</h1>
      </div>

      <div className="alert alert-idle mt-5" role="status">
        {reason}
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
        Bağlantı eskimiş, kayıt silinmiş veya adres yanlış yazılmış olabilir.
        Bu demoda kayıtlar herkese açıktır ve sıfırlanabilir.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--rule)] pt-5">
        <Link href={backHref} className="btn btn-primary">
          {backLabel}
        </Link>
        <Link href="/diagnoz" className="btn">
          Yeni teşhis başlat
        </Link>
      </div>
    </section>
  );
}
