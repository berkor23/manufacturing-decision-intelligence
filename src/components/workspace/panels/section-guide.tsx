"use client";

// Bölüm rehberleri: her sekmenin ne işe yaradığını anlatan yardım metinleri.
//
// Bu panel, 7000+ satırlık tek bileşenden ayrıldı; ana bileşen artık yalnızca
// akışı ve durumu yönetiyor.



export const SECTION_GUIDES = {
  actions: {
    eyebrow: "Aksiyon yönetimi kullanım rehberi",
    title: "Kararı uygulanabilir ve doğrulanabilir işe dönüştürün",
    description:
      "Bu bölüm kök neden veya risk kararından sonra kullanılır. Her aksiyonun sorumlusu, tarihi, başarı ölçütü ve gerçekleşen sonucu olmalıdır; yalnız “yapıldı” demek etkinlik kanıtı değildir.",
    cards: [
      [
        "Ne eklenir?",
        "Kök nedeni ortadan kaldıran, kaçışı önleyen veya riski azaltan somut işler.",
      ],
      [
        "Ne zaman tamamlanır?",
        "Uygulama bittikten ve başarı ölçütü izleme verisiyle doğrulandıktan sonra.",
      ],
      [
        "Beklenen çıktı",
        "Sahibi ve termini belli, etkinliği kanıtlanmış aksiyon portföyü.",
      ],
    ],
  },
  operations: {
    eyebrow: "Proaktif operasyon kullanım rehberi",
    title: "Problem büyümeden önce sinyali yakalayın ve öğrenmeyi hızlandırın",
    description:
      "Bu alan günlük operasyon davranışlarını yönetir. Her alt sistem farklı bir ihtiyaca hizmet eder; hepsini her vaka için doldurmanız gerekmez.",
    cards: [
      [
        "Zayıf sinyal",
        "Henüz arızaya dönüşmemiş tekrar, sapma veya olağandışı davranışı araştırın.",
      ],
      [
        "Günlük yönetim",
        "Vardiya performansını ve üst seviyeye taşınması gereken engelleri kaydedin.",
      ],
      [
        "İyileştirme ve eğitim",
        "Düşük riskli fikri deneyin; çalışan sonucu kısa saha dersine dönüştürün.",
      ],
      [
        "Kontrol yükü",
        "Geçici kontrol ve ayıklamaları görünür tutup kaynakta önlemeyle azaltın.",
      ],
    ],
  },
  organization: {
    eyebrow: "Organizasyon ve sistem davranışı rehberi",
    title: "Kişiyi suçlamadan davranışı üreten sistemi inceleyin",
    description:
      "Tekrarlayan problemlerde yalnız teknik kök neden yetmeyebilir. Hedefler, teşvikler, standartlar, iş tasarımı ve yönetim varsayımlarının davranışı nasıl şekillendirdiğini burada inceleyin.",
    cards: [
      [
        "Sistem davranışı",
        "Gözlenen davranışın arkasındaki koşul, hedef çatışması ve geri besleme döngüsünü yazın.",
      ],
      [
        "QMS sağlık taraması",
        "Kalite sisteminin problemi önleme ve öğrenmeyi taşıma kapasitesini değerlendirin.",
      ],
      [
        "Gemba haritası",
        "Yazılı standart ile işin sahada gerçekten nasıl yapıldığı arasındaki boşluğu gözlemleyin.",
      ],
    ],
  },
  advanced: {
    eyebrow: "İleri analiz kullanım rehberi",
    title: "Ana metodolojinin karar noktasında uzman aracı çağırın",
    description:
      "Bu araçlar ana problem çözme yönteminin yerine geçmez. Ölçüm güvenilirliği, deney, risk veya bakım gibi özel bir karar için gerekli olduğunda seçin.",
    cards: [
      [
        "Önce karar noktası",
        "Bu analizin hangi somut kararı destekleyeceğini yazın.",
      ],
      ["Sonra hipotez", "Sınanacak soruyu sonuçtan önce tanımlayın."],
      [
        "Kapanış koşulu",
        "Veriyi, hesap sonucunu, sınırlılıkları ve sonraki kararı birlikte kaydedin.",
      ],
    ],
  },
  validation: {
    eyebrow: "Doğrulama omurgası kullanım rehberi",
    title: "İddia, kanıt ve onayı birbirine bağlayın",
    description:
      "Metodoloji formunun dolu olması çözümün doğru olduğunu göstermez. Burada kök neden iddialarını saha kanıtına, aksiyonları başarı metriğine ve kapanışı bağımsız onaya bağlayın.",
    cards: [
      ["İddia", "Doğru olduğuna inandığınız sınanabilir açıklama."],
      ["Kanıt", "İddiayı destekleyen ölçüm, gözlem, deney veya kayıt."],
      [
        "Karşı-olgu",
        "Neden kaldırıldığında problemin kaybolup kaybolmadığını gösteren sınama.",
      ],
      [
        "Kapanış jürisi",
        "Kalite ve süreç sahibinin kanıt paketine verdiği izlenebilir karar.",
      ],
    ],
  },
  deployment: {
    eyebrow: "Yatay yayılım kullanım rehberi",
    title: "Çözümü tek vakada bırakmayın; benzer riski sistem genelinde arayın",
    description:
      "Doğrulanmış neden veya etkili aksiyonun başka makine, hat, ürün, lokasyon ya da tedarikçide karşılığı olup olmadığını değerlendirin.",
    cards: [
      ["Yayılım hedefi", "Aynı mekanizmanın bulunabileceği somut alan."],
      [
        "Yerel kontrol",
        "Hedefte riskin gerçekten var olup olmadığını gösteren bulgu ve kanıt.",
      ],
      [
        "Alt vaka",
        "Risk bulunduğunda o alan için açılan, sahibi ve akışı ayrı çalışma.",
      ],
    ],
  },
  learning: {
    eyebrow: "Kurumsal öğrenim kullanım rehberi",
    title:
      "Vaka bilgisini kalıcı standarda ve yeniden kullanılabilir hafızaya dönüştürün",
    description:
      "Bu bölüm kapanıştan hemen önce kullanılır. Etkili çözümün hangi dokümanı değiştirdiğini, kim tarafından onaylandığını ve nerelerde yeniden kullanılabileceğini kaydedin.",
    cards: [
      [
        "Öğrenim kaydı",
        "Doğrulanmış neden, etkili karşı önlem ve doğrulama yönteminin kısa özeti.",
      ],
      [
        "Sistem dokümanı",
        "Revizyonu, sahibi, onayı ve yürürlük tarihi olan gerçek standart çıktısı.",
      ],
      [
        "Öğrenim kararı",
        "Doküman güncellendi veya neden güncelleme gerekmedi; gerekçesi ve onayıyla.",
      ],
    ],
  },
} as const;

export function WorkspaceSectionGuide({
  section,
}: {
  section: keyof typeof SECTION_GUIDES;
}) {
  const guide = SECTION_GUIDES[section];
  return (
    <section className="subtle-panel">
      <p className="eyebrow">{guide.eyebrow}</p>
      <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.012em]">{guide.title}</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-soft)]">
        {guide.description}
      </p>
      {/* Bu rehber her sekmenin üstünde tekrarlar; kutu içinde kutu yığını
          yerine 1px aralıklı band — hem hafif hem kolonları hizalı. */}
      <div
        className={`mt-4 grid gap-px border-t border-[var(--rule-strong)] bg-[var(--rule)] ${guide.cards.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}
      >
        {guide.cards.map(([title, detail], index) => (
          <div key={title} className="bg-[var(--surface-sunk)] px-3 py-3">
            <p className="eyebrow">
              {String(index + 1).padStart(2, "0")} · {title}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted)]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


