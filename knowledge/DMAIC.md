---
code: DMAIC
name: Define-Measure-Analyze-Improve-Control
whenToUse: Veri yoğun, varyasyonu yüksek ve istatistiksel analiz gerektiren problemler.
signals: [hasMeasurementData=true, highVariation=true]
tools: [Cp/Cpk, MSA, Pareto, Histogram, Regresyon, ANOVA, DOE]
phases: [Define, Measure, Analyze, Improve, Control]
---

# DMAIC

> Not: Karar sinyalleri (`signals`) yalnızca belgeleme amaçlıdır. Karar mantığının
> tek doğruluk kaynağı `src/domain/diagnosis/rules.ts` içindedir.

## Ne zaman kullanılır
Ölçüm verisi mevcut, varyasyon sürekli/yüksek ve istatistiksel yöntem gerektiren süreçler.

## Fazlar
- **Define** — problem, kapsam, hedef.
- **Measure** — ölçüm sistemi (MSA), mevcut performans (Cp/Cpk).
- **Analyze** — kök neden (Pareto, Histogram, Regresyon, ANOVA).
- **Improve** — iyileştirme (DOE ile optimize).
- **Control** — kazanımı koru (kontrol planı, SPC).

<!-- İçerik Faz 4/6'da genişletilecek. -->
