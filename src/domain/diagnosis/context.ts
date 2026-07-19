// Soru bağlamsallaştırma — DETERMİNİSTİK (LLM'siz).
// Sorunun ANLAMI sabit (FEATURE_META teması); sadece problemin süreç/alan adını
// metinden saptayıp soruya bağlam olarak ekleriz. Böylece doğallık artar ama
// anlam asla kaymaz (bkz. docs/ARCHITECTURE.md §7 tartışması).

// Yaygın Türkçe üretim süreci/alan terimleri (temel biçim).
const PROCESS_TERMS = [
  "kaynak",
  "montaj",
  "boyama",
  "pres",
  "döküm",
  "tornalama",
  "frezeleme",
  "kaplama",
  "enjeksiyon",
  "ekstrüzyon",
  "paketleme",
  "ambalaj",
  "ısıl işlem",
  "talaşlı imalat",
  "lehim",
  "punta",
  "cnc",
  "dolum",
  "baskı",
  "dikiş",
  "kesim",
  "kalıp",
];

/** Metinden süreç/alan adını saptar (deterministik). Bulamazsa null. */
export function detectProcessName(text: string): string | null {
  const t = text.toLocaleLowerCase("tr");
  for (const term of PROCESS_TERMS) {
    // terimin çekimli biçimlerini de yakala: "kaynak", "montajda", "presleme"...
    const re = new RegExp(`(^|[^a-zçğıöşü])${term}\\w*`);
    const m = t.match(re);
    if (m && m.index !== undefined) {
      const matchEnd = m.index + m[0].length;
      const after = t.slice(matchEnd).replace(/^[\s,.;:]+/, "");
      // hemen ardından "hat..." geliyorsa "hattı" olarak etiketle
      if (/^hat\w*/.test(after)) return `${term} hattı`;
      return term;
    }
  }
  return null;
}

/**
 * Soruyu problem bağlamıyla sarar. processName yoksa soru olduğu gibi döner.
 * Sorunun anlamı DEĞİŞMEZ; yalnızca başına bağlam eklenir.
 */
export function contextualizeQuestion(
  question: string,
  processName: string | null,
): string {
  if (!processName) return question;
  return `"${processName}" konusundaki bu problem için — ${question}`;
}
