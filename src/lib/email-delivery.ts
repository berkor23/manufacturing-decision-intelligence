import "server-only";

export type AccountEmail = {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
};

export function ensureEmailDeliveryConfigured() {
  if (process.env.NODE_ENV === "production" && !process.env.EMAIL_WEBHOOK_URL) {
    throw new Error("Hesap e-postaları için EMAIL_WEBHOOK_URL yapılandırılmalı.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) {
    throw new Error("Hesap e-postalarındaki bağlantılar için APP_URL yapılandırılmalı.");
  }
}

/**
 * Bağlantının API yanıtında gösterilmesi yalnız açık izinle mümkündür.
 *
 * Bu bağlantı parola yenileme / davet jetonunu taşır; kimliksiz çağrılabilen
 * uçlardan (ör. /api/account/password/request) döndüğü için yalnız NODE_ENV'e
 * güvenmek yeterli değildi: NODE_ENV set edilmeden çalıştırılan bir kurulumda
 * saldırgan herhangi bir adresin sıfırlama bağlantısını doğrudan alabiliyordu.
 */
function previewAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_EMAIL_PREVIEW === "1";
}

export async function deliverAccountEmail(email: AccountEmail) {
  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EMAIL_WEBHOOK_KEY ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_KEY}` } : {}),
      },
      body: JSON.stringify(email),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`E-posta sağlayıcısı ${response.status} yanıtını verdi.`);
    return { delivered: true, previewUrl: null };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("E-posta sağlayıcısı yapılandırılmamış.");
  }
  // Yerel geliştirmede gerçek e-posta gönderilmez. Bağlantı yalnız
  // ALLOW_EMAIL_PREVIEW=1 iken API yanıtında gösterilir; token sunucu
  // günlüğüne veya veritabanına açık yazılmaz.
  return { delivered: false, previewUrl: previewAllowed() ? email.actionUrl : null };
}

/**
 * E-posta bağlantılarının temel adresi.
 *
 * Host başlığına düşmek, saldırganın `Host: saldirgan.com` ile tetiklediği
 * sıfırlama e-postasında jetonu kendi alan adına yönlendirmesine izin veriyordu.
 * Üretimde APP_URL zorunlu (bkz. ensureEmailDeliveryConfigured); yerelde
 * yapılandırılmamışsa sabit localhost adresine düşülür.
 */
export function publicBaseUrl() {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL yapılandırılmadan e-posta bağlantısı üretilemez.");
  }
  return `http://localhost:${process.env.PORT ?? "3000"}`;
}
