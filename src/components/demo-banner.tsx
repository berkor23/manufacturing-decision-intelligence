// Yalnızca NEXT_PUBLIC_DEMO=1 iken render edilir (bkz. layout.tsx).
// Herkese açık portföy demosunda ziyaretçiye bağlamı anlatır: veriler paylaşımlı
// ve sıfırlanabilir; LLM gerektiren özellikler (AI taslak / rapor cilası) demoda kapalı.

export function DemoBanner() {
  return (
    <div className="no-print bg-gradient-to-r from-indigo-600 to-emerald-600 px-4 py-1.5 text-center text-[11px] font-medium text-white/95">
      Canlı demo · veriler herkese açık ve sıfırlanabilir · AI taslak/rapor cilası yerel Ollama gerektirir (demoda kapalı, kararlar yine deterministik motordan gelir)
    </div>
  );
}
