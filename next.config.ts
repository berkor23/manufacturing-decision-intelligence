import type { NextConfig } from "next";

// Güvenlik başlıkları — tüm yollara uygulanır.
//
// CSP notu: Next.js App Router hidrasyon için satır içi script kullanır;
// nonce akışı kurulmadan `unsafe-inline` kaldırılamaz. Tailwind v4 de satır içi
// stil üretir. Bu yüzden script/style gevşetildi; asıl kazanç `object-src`,
// `frame-ancestors`, `base-uri` ve `form-action` kısıtları.
// Uygulama zaten dangerouslySetInnerHTML kullanmıyor (bkz. components/markdown.tsx).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Ollama sunucu tarafında çağrılır; tarayıcıdan yalnız kendi kaynağımıza istek gider.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS yalnız HTTPS altında anlamlı; yerel http geliştirmeyi bozmasın diye
  // sadece üretimde eklenir.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
