// Yalnızca NEXT_PUBLIC_DEMO=1 iken render edilir (bkz. layout.tsx).
// Metin, AI sağlayıcının açık olup olmamasına göre değişir: kapalıysa (none)
// ziyaretçiye AI özelliklerinin devre dışı olduğunu, açıksa (ör. tünel üzerinden
// yerel Ollama) canlı olduğunu söyler. Kararlar her hâlükârda deterministik motordan.

export function DemoBanner({ aiEnabled }: { aiEnabled: boolean }) {
  return (
    <div className="no-print bg-gradient-to-r from-indigo-600 to-emerald-600 px-4 py-1.5 text-center text-[11px] font-medium text-white/95">
      {aiEnabled
        ? "Canlı demo · veriler herkese açık ve sıfırlanabilir · AI taslak/rapor özellikleri yerel Ollama ile canlı · kararlar deterministik motordan gelir"
        : "Canlı demo · veriler herkese açık ve sıfırlanabilir · AI taslak/rapor cilası kapalı (yerel Ollama gerektirir) · kararlar deterministik motordan gelir"}
    </div>
  );
}
