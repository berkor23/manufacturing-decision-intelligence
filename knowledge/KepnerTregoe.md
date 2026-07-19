---
code: KEPNER_TREGOE
name: Kepner-Tregoe Problem Analysis
whenToUse: Yeni başlayan, iyi tanımlı bir sapma; yakın zamanda bir değişiklik olmuş olabilir.
signals: [startedRecently=true, anyChange=true]
tools: [IS / IS NOT, Where / Where Not, When / When Not, Extent, Olası neden karşılaştırması]
phases: [Problem tanımı, IS/IS NOT, Ayırt edici/değişiklik, Olası neden, Doğrulama]
---

# Kepner-Tregoe (KT)

> Not: Karar sinyalleri (`signals`) yalnızca belgeleme amaçlıdır. Karar mantığının
> tek doğruluk kaynağı `src/domain/diagnosis/rules.ts` içindedir.

## Ne zaman kullanılır
Belirli bir zamanda başlayan, sınırları net bir sapma; genelde bir değişiklikle ilişkili.

## Araçlar
- **IS / IS NOT** — problem nerede/ne zaman var, nerede/ne zaman yok.
- **Where / When / Extent** — konum, zaman, büyüklük boyutları.
- **Ayırt edici + değişiklik** — IS ve IS NOT arasındaki farklar → olası nedenler.
- **Olası neden karşılaştırması** — adayları IS/IS NOT'a karşı test et.

## Adımlar
1. Sapmayı net tanımla.
2. IS / IS NOT tablosunu doldur.
3. Ayırt edicileri ve son değişiklikleri bul.
4. Olası nedenleri türet ve karşılaştır.
5. En olası nedeni doğrula.

<!-- İçerik Faz 4/6'da genişletilecek. -->
