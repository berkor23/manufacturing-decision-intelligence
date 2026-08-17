import "server-only";

// IEmailSender'ın webhook uygulaması. Gönderim ayrıntıları (webhook adresi,
// önizleme izni, temel adres) `lib/email-delivery.ts`'te kalır; bu sınıf
// yalnız uygulama katmanının sözleşmesine bağlar.

import type { AccountEmail, IEmailSender } from "@/application/ports/email-sender";
import { deliverAccountEmail, publicBaseUrl } from "@/lib/email-delivery";

export class WebhookEmailSender implements IEmailSender {
  send(email: AccountEmail) {
    return deliverAccountEmail(email);
  }
  baseUrl() {
    return publicBaseUrl();
  }
}
