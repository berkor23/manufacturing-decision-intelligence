import Link from "next/link";
import { AccountAccessForm } from "@/components/account-access-form";
import { accountAuthEnabled } from "@/lib/account-auth";

export const metadata = { title: "Hesap oluştur · MDI" };

export default function RegisterPage() {
  // Hesap sistemi kapalıyken form gösterilmez: doldurulup gönderildiğinde
  // sunucu 503 döner (bkz. requireAccountSystem). Çalışmayacak bir formu
  // sunmak yerine nedenini söyleyip kullanılabilir yolu gösteriyoruz.
  if (!accountAuthEnabled()) {
    return (
      <main className="page-shell grid min-h-[70vh] place-items-center">
        <section className="card w-full max-w-lg p-6 sm:p-8">
          <div className="border-b border-[var(--rule-strong)] pb-4">
            <p className="eyebrow">Hesap sistemi</p>
            <h1 className="page-heading mt-1.5">Bu kurulumda kapalı</h1>
          </div>

          <div className="alert alert-idle mt-5">
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

  return (
    <main className="page-shell grid min-h-[70vh] place-items-center">
      <section className="card w-full max-w-lg p-6 sm:p-8">
        <div className="border-b border-[var(--rule-strong)] pb-4">
          <p className="eyebrow">Yeni hesap</p>
          <h1 className="page-heading mt-1.5">Nasıl çalışacağınızı seçin</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Tek başınıza ilerleyebilir veya ekibinizin çalışmalarını aynı şirket çatısı altında
            yönetebilirsiniz.
          </p>
        </div>

        <AccountAccessForm mode="register" />

        <p className="mt-6 border-t border-[var(--rule)] pt-4 text-[12px] text-[var(--muted)]">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/giris"
            className="font-medium text-[var(--ink)] underline decoration-[var(--rule-strong)] underline-offset-[3px] hover:decoration-[var(--ink)]"
          >
            Giriş yapın
          </Link>
        </p>
      </section>
    </main>
  );
}
