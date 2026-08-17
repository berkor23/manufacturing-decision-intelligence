// Hesap e-postası gönderim PORTU (doğrulama, parola yenileme, davet).

export interface AccountEmail {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  /** Yalnız yerel geliştirmede ve açık izinle dolu olur; üretimde daima null. */
  previewUrl: string | null;
}

export interface IEmailSender {
  send(email: AccountEmail): Promise<EmailDeliveryResult>;
  /** E-posta bağlantılarının temel adresi (Host başlığına güvenilmez). */
  baseUrl(): string;
}
