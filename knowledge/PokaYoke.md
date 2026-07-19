---
code: POKA_YOKE
name: Poka-Yoke (Hata Önleme)
whenToUse: İnsan hatası kaynaklı sorunlar; hatanın kaynağında engellenmesi.
signals: [humanErrorProne=true]
tools: [Kısıtlama (fiziksel), Uyarı (sensör/ışık/ses), Sıralama zorlama, Sayım/kontrol]
phases: [Hata modunu belirle, Kaynağı bul, Önleme mekanizması tasarla, Uygula, Doğrula]
---

# Poka-Yoke (Hata Önleme)

> Karar sinyalleri yalnızca belgeleme amaçlıdır; tek doğruluk kaynağı `rules.ts`.

## Ne zaman kullanılır
Yanlış montaj, unutma, ters takma, karıştırma gibi **insan hatası** kaynaklı
sorunlarda; hatanın oluşmasını en baştan engellemek için.

## Yaklaşımlar
- **Kısıtlama (control)** — yanlış yapılamayacak fiziksel tasarım (yalnız tek yönde takılır).
- **Uyarı (warning)** — sensör/ışık/ses ile hatalı durumda ikaz.
- **Sıralama/zorlama** — adımların yanlış sırada yapılmasını engelleme.
- **Sayım/kontrol** — eksik/fazla parçayı otomatik yakalama.

<!-- İçerik ileride genişletilecek. -->
