import Link from "next/link";
import { EmailRequestForm } from "@/components/account-token-form";

export default function ForgotPasswordPage() {
  return <main className="page-shell grid min-h-[70vh] place-items-center"><section className="card w-full max-w-md p-6 sm:p-8"><div className="border-b border-[var(--rule-strong)] pb-4"><p className="eyebrow">Hesap kurtarma</p><h1 className="page-heading mt-1.5">Parolanızı yenileyin</h1><p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">Hesabınız varsa bir saat geçerli, tek kullanımlık bağlantı göndereceğiz.</p></div><EmailRequestForm mode="reset" /><Link href="/giris" className="mt-5 block text-center text-sm text-[var(--ink)]">Giriş ekranına dön</Link></section></main>;
}
