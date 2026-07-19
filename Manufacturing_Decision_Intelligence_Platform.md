# Manufacturing Decision Intelligence Platform

## Vizyon

Bu doküman, üretim, kalite ve sürekli iyileştirme ekipleri için AI
destekli karar destek platformu vizyonunu tanımlar.

## Problem

Kuruluşlar çoğu zaman problemi sınıflandırmadan araç seçer. Bu
platformun temel ilkesi:

> Önce problemi teşhis et. Sonra doğru metodolojiyi öner. Ardından
> metodolojiyi uçtan uca uygulat.

## Temel Amaçlar

-   Problemi doğal dilden anlamak
-   Karar ağacı + AI ile problem sınıflandırmak
-   En uygun metodolojiyi önermek
-   Gerekli araçları otomatik hazırlamak
-   Süreci yönetmek
-   Raporları üretmek
-   Kurumsal öğrenmeyi sağlamak

## Problem Sınıfları

  Durum                          Birincil Metodoloji
  ------------------------------ ---------------------
  Risk var, hata yok             FMEA
  Yeni başlayan problem          Kepner--Tregoe
  Kök neden bilinmiyor           RCA
  Müşteri etkilendi              8D
  Sürekli iyileştirme            PDCA / A3
  Veri yoğun, varyasyon yüksek   DMAIC

## Akış

1.  Kullanıcı problemi yazar.
2.  AI açıklayıcı sorular sorar.
3.  Problem tipi belirlenir.
4.  Güven skoru hesaplanır.
5.  Birincil metodoloji önerilir.
6.  Destekleyici araçlar listelenir.
7.  Etkileşimli çalışma alanı açılır.
8.  Kanıtlar, aksiyonlar ve raporlar oluşturulur.

## AI Soru Motoru

Örnek sorular: - Problem ne zaman başladı? - Daha önce yaşandı mı? -
Müşteri etkilendi mi? - Yakın zamanda ne değişti? - Ölçüm verisi var
mı? - Varyasyon sürekli mi?

## Metodoloji Modülleri

### FMEA

-   Failure Mode
-   Effect
-   Cause
-   Severity
-   Occurrence
-   Detection
-   RPN / Action Priority
-   AI risk önerileri

### Kepner--Tregoe

-   IS / IS NOT
-   Where / Where Not
-   When / When Not
-   Extent
-   Olası neden karşılaştırması

### RCA

-   5 Why
-   Balık Kılçığı
-   Fault Tree
-   Kanıt yönetimi

### 8D

D1--D8 akışı, containment, doğrulama, standart güncelleme ve müşteri
raporu.

### PDCA / A3

Mevcut durum, hedef, analiz, karşı önlemler, takip planı ve öğrenilen
dersler.

### DMAIC

Define, Measure, Analyze, Improve, Control. Cp/Cpk, MSA, Pareto,
Histogram, Regresyon, ANOVA, DOE vb.

## Problem Maturity Score

-   Problem Tanımı
-   Veri Kalitesi
-   Kanıt Gücü
-   Tekrarlanabilirlik
-   Müşteri Etkisi
-   Süreç Olgunluğu

## Teknik Mimari

-   Frontend: React + Next.js
-   Backend: .NET
-   DB: PostgreSQL
-   Cache/Queue: Redis
-   Object Storage: S3
-   AI Orkestrasyonu: LLM + kural motoru
-   Raporlama: PDF/Excel

## Çok Kiracılı SaaS

-   Free
-   Professional
-   Business
-   Enterprise

## Dashboard

-   Açık problemler
-   Problem türleri
-   Ortalama çözüm süresi
-   8D performansı
-   FMEA risk trendi
-   DMAIC proje başarı oranı
-   AI öneri doğruluk oranı

## Gelecek Yol Haritası

### Faz 1

Problem sınıflandırma + AI sohbeti

### Faz 2

Metodoloji çalışma alanları

### Faz 3

Raporlama ve CAPA

### Faz 4

ERP/MES/QMS entegrasyonları

### Faz 5

Tahmine dayalı kalite ve dijital ikiz

## Farklılaştırıcı Değer

Platform metodoloji üretmez; doğru metodolojiyi seçtirir ve
uygulanmasını yönetir.
