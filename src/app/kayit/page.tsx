import Link from "next/link";
import { AccountAccessForm } from "@/components/account-access-form";

export const metadata = { title: "Hesap oluştur · MDI" };

export default function RegisterPage() {
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
