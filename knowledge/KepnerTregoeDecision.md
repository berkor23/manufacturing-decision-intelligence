---
code: KT_DECISION
name: Kepner-Tregoe Karar Analizi
whenToUse: Çözülecek bir hata değil, tanımlı alternatifler arasından seçim yapılacak bir karar var.
signals: [decisionBetweenOptions=true]
tools: [Karar ifadesi, MUST kriterleri, WANT kriterleri + ağırlık, Alternatif puanlama, Olumsuz sonuç analizi]
phases: [Karar amacı, Zorunlu (MUST) kriterler, İsteğe bağlı (WANT) kriterler, Alternatif değerlendirme, Risk analizi]
---

# Kepner-Tregoe Karar Analizi (Decision Analysis)

> Not: Karar sinyalleri (`signals`) yalnızca belgeleme amaçlıdır. Karar mantığının
> tek doğruluk kaynağı `src/domain/diagnosis/rules.ts` ve seçim motoru
> `src/domain/diagnosis/decision-analysis.ts` içindedir.

## Ne zaman kullanılır
Ortada teşhis edilecek bir hata yoktur; birden fazla tanımlı seçenek (tedarikçi, yatırım,
tasarım, yöntem) arasından en iyisini gerekçeli biçimde seçmek gerekir. RCA/8D/DMAIC gibi
reaktif teşhis yöntemleri burada yanlış kapıdır.

## Mantık
- **MUST (zorunlu) kriterler** go/no-go'dur: birini bile karşılamayan alternatif elenir.
- **WANT (isteğe bağlı) kriterler** ağırlıklıdır: skor = Σ (ağırlık × puan).
- En yüksek ağırlıklı WANT skoru önerilir; ikinciyle fark darsa karar "kırılgan" sayılır
  ve seçilen alternatif olası olumsuz sonuçlarıyla ayrıca tartılır.

## Adımlar
1. Karar ifadesini ve amacını netleştir.
2. Zorunlu (MUST) kriterleri belirle ve alternatifleri ele.
3. İsteğe bağlı (WANT) kriterleri ve ağırlıklarını belirle.
4. Elenmeyen alternatifleri WANT kriterleriyle puanla.
5. Öne çıkan alternatifi olumsuz sonuç riskleriyle sına ve kararı ver.

<!-- İçerik Faz 4/6'da genişletilecek. -->
