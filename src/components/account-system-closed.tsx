import Link from "next/link";

/**
 * Hesap sistemi kapalıyken hesap sayfalarının gösterdiği durum.
 *
 * Bu sayfalar (kayıt, doğrulama bekliyor, parola kurtarma) hesap sistemi
 * kapalıyken de erişilebilir kalıyor ve çalışan formlar sunuyordu; gönderilen
 * her form sunucudan 503 alıyordu (bkz. requireAccountSystem). Kapalı bir
 * özellik, çalışıyormuş gibi görünen bir form değil, nedenini söyleyen bir
 * ekran göstermeli.
 *
 * Hesap sisteminin varlığı bilinçli olarak gizlenmiyor — yalnız bu dağıtımda
 * devre dışı olduğu söyleniyor.
 */
export function AccountSystemClosed({
  eyebrow = "Hesap sistemi",
  title = "Bu kurulumda kapalı",
}: {
  eyebrow?: string;
  title?: string;
}) {
  return (
    <main className="page-shell grid min-h-[70vh] place-items-center">
      <section className="card w-full max-w-lg p-6 sm:p-8">
        <div className="border-b border-[var(--rule-strong)] pb-4">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-heading mt-1.5">{title}</h1>
        </div>

        <div className="alert alert-idle mt-5" role="status">
          Bu bir <strong>açık demo</strong>. Hesap açmadan doğrudan
          kullanabilirsiniz; teşhis motoru, çalışma alanları ve raporlar tam
          çalışır. Kayıtlar herkese açıktır ve sıfırlanabilir.
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
          Bireysel ve şirket hesapları, roller, davet ve e-posta doğrulaması
          uygulamada kurulu — yalnızca bu demo dağıtımında devre dışı.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--rule)] pt-5">
          <Link href="/diagnoz" className="btn btn-primary">
            Teşhise başla
          </Link>
          <Link href="/yerel-calismalar" className="btn">
            Yerel çalışmalarım
          </Link>
        </div>
      </section>
    </main>
  );
}
