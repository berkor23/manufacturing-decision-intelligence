import { EmailRequestForm } from "@/components/account-token-form";

export default async function VerificationPendingPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const email = (await searchParams).email ?? "";
  return <main className="page-shell grid min-h-[70vh] place-items-center"><section className="card w-full max-w-md p-6 sm:p-8"><div className="border-b border-[var(--rule-strong)] pb-4"><p className="eyebrow">Son bir adım</p><h1 className="page-heading mt-1.5">E-postanızı kontrol edin</h1><p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">Gönderdiğimiz bağlantı 24 saat geçerlidir. Gelen kutunuzda görünmüyorsa spam klasörünü kontrol edin veya yeni bağlantı isteyin.</p></div><EmailRequestForm mode="verification" initialEmail={email} /></section></main>;
}
