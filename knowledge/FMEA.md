---
code: FMEA
name: Failure Mode and Effects Analysis
whenToUse: Risk var ama henüz hata oluşmadı; proaktif risk değerlendirmesi.
signals: [defectOccurred=false]
tools: [Failure Mode, Effect, Cause, Severity, Occurrence, Detection, RPN / Action Priority]
phases: [Kapsam, Fonksiyon, Gelecek senaryoları ve varsayımlar, Failure mode, Etki/Neden, Puanlama, Aksiyon önceliği]
---

# FMEA (Failure Mode and Effects Analysis)

> Not: Karar sinyalleri (`signals`) yalnızca belgeleme amaçlıdır. Karar mantığının
> tek doğruluk kaynağı `src/domain/diagnosis/rules.ts` içindedir.

## Ne zaman kullanılır
Henüz gerçekleşmemiş ama olası hataların önceden değerlendirilmesi; risk yönetimi.

## Öğeler
- **Failure Mode** — olası hata biçimi.
- **Effect** — etkisi ve şiddeti (**Severity**).
- **Cause** — nedeni ve sıklığı (**Occurrence**).
- **Detection** — yakalanabilirliği.
- **RPN / Action Priority** — S×O×D veya AP tablosuyla önceliklendirme.

## Adımlar
1. Kapsam ve fonksiyonları tanımla.
2. Operatör, malzeme, tedarikçi, kapasite, bakım, yazılım ve çevre gibi değişebilecek koşulları çıkar.
3. Mevcut varsayımların ve kontrollerin hangi koşullarda kırılabileceğini sorgula.
4. Her fonksiyon ve gelecek senaryosu için failure mode'ları çıkar.
5. Etki, neden, önleyici kontrol ve tespit kontrolünü ayrı belirle; kontrol etkinliğini kanıtla.
6. S/O/D puanla, önceliklendir.
7. Yüksek öncelikli risklere aksiyon tanımla ve değişiklik tetikleyicilerini sahipleriyle kaydet.

<!-- İçerik Faz 4/6'da genişletilecek. -->
