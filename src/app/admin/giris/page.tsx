export const metadata = { title:"Yönetici Girişi · MDI" };

export default async function AdminLoginPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;
  return <main className="page-shell grid flex-1 place-items-center"><section className="card w-full max-w-md p-6 sm:p-8"><p className="eyebrow">Yönetici erişimi</p><h1 className="page-heading mt-1">Admin paneli</h1><p className="page-lead">Sistem yapılandırması ve portföy gözetimi için yönetici parolasını girin.</p>{error&&<div className="alert alert-error mt-5" role="alert">Parola doğrulanamadı.</div>}<form action="/api/admin/login" method="post" className="mt-6 space-y-4"><label className="field-group"><span className="field-label">Yönetici parolası</span><input className="field" type="password" name="password" autoComplete="current-password" required autoFocus /></label><button className="btn btn-primary w-full" type="submit">Yönetici olarak giriş yap</button></form></section></main>;
}
