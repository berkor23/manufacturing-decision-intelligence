---
code: TPM
name: Total Productive Maintenance
whenToUse: Ekipman arızası, plansız duruş ve makine güvenilirliği problemleri.
signals: [equipmentBreakdown=true]
tools: [OEE, Otonom bakım, Planlı bakım, 6 büyük kayıp, Arıza kök neden]
phases: [Mevcut durum (OEE), Otonom bakım, Planlı bakım, İyileştirme, Standart]
---

# TPM (Total Productive Maintenance)

> Karar sinyalleri yalnızca belgeleme amaçlıdır; tek doğruluk kaynağı `rules.ts`.

## Ne zaman kullanılır
Makine/ekipman arızaları, plansız duruşlar, düşük ekipman verimliliği (OEE),
tekrar eden bakım sorunları.

## Temel öğeler
- **OEE** (Kullanılabilirlik × Performans × Kalite) ile mevcut durumu ölç.
- **Otonom bakım** — operatörün temizlik/kontrol/yağlama sorumluluğu.
- **Planlı bakım** — arıza öncesi periyodik/kestirimci bakım.
- **6 büyük kayıp** — arıza, ayar, küçük duruş, hız, hata, başlangıç kayıpları.

<!-- İçerik ileride genişletilecek. -->
