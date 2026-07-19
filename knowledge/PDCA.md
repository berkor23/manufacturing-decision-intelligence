---
code: PDCA_A3
name: Plan-Do-Check-Act
whenToUse: Akut hata değil; sürekli iyileştirme ve döngüsel öğrenme çabası.
signals: [isImprovementInitiative=true]
tools: [Plan, Do, Check, Act, Standartlaştırma]
phases: [Plan, Do, Check, Act]
---

# PDCA (Plan-Do-Check-Act)

> Not: Karar sinyalleri (`signals`) yalnızca belgeleme amaçlıdır. Karar mantığının
> tek doğruluk kaynağı `src/domain/diagnosis/rules.ts` içindedir.

## Ne zaman kullanılır
Belirli bir müşteri hatası değil; bir süreci adım adım iyileştirme ve öğrenme.

## Döngü
- **Plan** — mevcut durum, hedef, hipotez.
- **Do** — küçük ölçekte uygula.
- **Check** — sonucu ölç, hedefle karşılaştır.
- **Act** — işe yararsa standartlaştır, yaramazsa döngüyü tekrarla.

> A3 ile ilişki: A3, PDCA'yı tek sayfalık yapılandırılmış anlatıya döker
> (bkz. `A3.md`).

<!-- İçerik Faz 4/6'da genişletilecek. -->
