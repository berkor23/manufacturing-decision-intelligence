---
code: RCA
name: Root Cause Analysis
whenToUse: Kalıcı bir hata var ve kök neden bilinmiyor.
signals: [rootCauseKnown=false, defectOccurred=true]
tools: [5 Why, Balık Kılçığı (Ishikawa), Fault Tree]
phases: [Problem tanımı, Kanıt toplama, Kök neden analizi, Doğrulama, Önlem]
---

# Root Cause Analysis (RCA)

> Not: Karar sinyalleri (`signals`) yalnızca belgeleme amaçlıdır. Karar mantığının
> tek doğruluk kaynağı `src/domain/diagnosis/rules.ts` içindedir.

## Ne zaman kullanılır
Gerçekleşmiş, kök nedeni bilinmeyen ve tekrarlayabilen problemler.

## Araçlar
- **5 Why** — nedeni ardışık "neden?" ile derinleştir.
- **Balık Kılçığı (6M)** — İnsan, Makine, Metot, Malzeme, Ölçüm, Çevre.
- **Fault Tree** — mantıksal hata ağacı.

## Adımlar
1. Problemi ve kapsamı netleştir.
2. Kanıt topla (veri, gözlem, kayıt).
3. Olası nedenleri çıkar ve daralt.
4. Kök nedeni doğrula.
5. Kalıcı önlem tanımla ve etkisini izle.

<!-- İçerik Faz 4/6'da genişletilecek. -->
