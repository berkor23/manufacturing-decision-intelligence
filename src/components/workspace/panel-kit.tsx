"use client";

// Çalışma alanı panel kiti — panellerin paylaştığı küçük yapı taşları.
//
// Bu parçalar (durum rozetleri, kart başlıkları, sayısal alan, panel başlığı
// ve terim sözlükleri) tek bir 7000+ satırlık bileşenin içinde yaşıyordu.
// Buraya alınmaları, panellerin ayrı dosyalara bölünebilmesinin ön koşuluydu.

import type { MethodologyWorkspace as WsData } from "@/application/ports/methodology-workspace-repository";
import type { ActionStatus } from "@/application/ports/rca-repository";

export const STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "Devam",
  IMPLEMENTED: "Uygulandı",
  EFFECTIVENESS_DUE: "Etkinlik bekliyor",
  EFFECTIVE: "Etkili",
  INEFFECTIVE: "Etkisiz",
  DONE: "Tamam",
};

export const numberValue = (value: string) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;
export function canRemoveRecord(label: string, hasContent: boolean) {
  return (
    !hasContent ||
    window.confirm(
      `${label} kaydı kalıcı olarak kaldırılacak. Devam etmek istiyor musunuz?`,
    )
  );
}

// Rozetler: pastel hap (bg-X-50/text-X-700) yerine kare etiket. Renk yalnız
// gerçek durum taşır; "ilerledi ama sonuçlanmadı" hâlleri kromasız `state-ink`
// ile kontrast üzerinden ayrışır, böylece uyarı renkleriyle yarışmaz.
export function StatusPill({ status }: { status: WsData["closureStatus"] }) {
  const config = {
    OPEN: ["Açık", "state-idle"],
    CLOSURE_CANDIDATE: ["Kapanış adayı", "state-ink"],
    MONITORING: ["İzlemede", "state-watch"],
    CLOSED: ["Kapalı", "state-ok"],
    REOPENED: ["Yeniden açıldı", "state-risk"],
  } as const;
  const [label, className] = config[status];
  return <span className={`tag ${className}`}>{label}</span>;
}

export function ActionStatusPill({ status }: { status: ActionStatus }) {
  const tone =
    status === "EFFECTIVE" || status === "DONE"
      ? "state-ok"
      : status === "INEFFECTIVE"
        ? "state-risk"
        : status === "IMPLEMENTED" || status === "EFFECTIVENESS_DUE"
          ? "state-warn"
          : status === "IN_PROGRESS"
            ? "state-ink"
            : "state-idle";
  return <span className={`tag shrink-0 ${tone}`}>{STATUS_LABEL[status]}</span>;
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-7 sm:px-6 sm:py-9">
      {children}
    </main>
  );
}

export function RecordCardHeader({
  title,
  onRemove,
  compact = false,
}: {
  title: string;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-[var(--rule)] pb-2 ${compact ? "mb-2" : "mb-3"}`}
    >
      <strong className={`min-w-0 truncate font-semibold ${compact ? "text-[12px]" : "text-[13px]"}`}>
        {title}
      </strong>
      <button
        type="button"
        className="shrink-0 text-[11px] text-[var(--muted-2)] underline decoration-[var(--rule-strong)] underline-offset-[3px] transition-colors hover:text-[var(--st-risk)] hover:decoration-[var(--st-risk)]"
        onClick={onRemove}
      >
        Kaydı kaldır
      </button>
    </div>
  );
}

export function NumericField({
  label,
  unit,
  help,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  unit: string;
  help: string;
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block min-w-0">
        <span className="block break-words text-[11px] font-semibold leading-4">{label}</span>
        <span className="mt-0.5 block font-mono text-[10px] font-normal leading-3 text-[var(--muted-2)]">
          {unit}
        </span>
      </span>
      <input
        type="number"
        className="field font-mono tabular-nums"
        value={value}
        onChange={(event) => onChange(numberValue(event.target.value))}
      />
      <span
        className={`mt-1.5 block break-words leading-4 text-[var(--muted-2)] ${compact ? "text-[10px]" : "text-[11px]"}`}
      >
        {help}
      </span>
    </label>
  );
}

export const PANEL_DESCRIPTIONS: Record<string, string> = {
  "Zayıf sinyal merkezi":
    "Henüz arızaya dönüşmemiş küçük sapmaları kaydedin. Önce tarafsız gözlemi, sonra araştırılacak hipotezi ve doğrulama görevini yazın.",
  "Tier 1–3 SQDCP ve eskalasyon":
    "Güvenlik, kalite, teslimat, maliyet ve çalışan göstergelerini günlük toplantı düzeyinde değerlendirin; yerinde çözülemeyen konuyu üst seviyeye aktarın.",
  "Öneri → deney → ölçüm → standart → Yokoten":
    "Düşük riskli iyileştirme fikrini küçük ölçekte deneyin, önce-sonra sonucunu ölçün; başarılıysa standarda ve benzer alanlara yayın.",
  "Dijital OPL akademisi":
    "OPL (Tek Nokta Dersi), tek bir kritik işi birkaç dakikada öğretir. Bir ders yalnız bir öğrenme hedefi, doğru/yanlış örneği ve yetkinlik kontrolü taşımalıdır.",
  "Kontrol yükü ve kaldırma portföyü":
    "Kontrollerin maliyetini ve kaçış riskini görünür kılın. Amaç daha fazla kontrol değil, hatayı kaynağında önleyerek geçici ayıklamayı kaldırmaktır.",
  "Karşılaştırılabilir referans ve bağlama uyarlama":
    "Kendi performansınızı benzer bir referansla aynı ölçeğe getirerek kıyaslayın. Uygulamayı körü körüne kopyalamadan yerel koşullara nasıl uyarlayacağınızı yazın.",
  "Darboğaz, ürün karması ve yatırım what-if":
    "Talep, darboğaz çevrim süresi, verim ve stok değiştiğinde kapasite açığının nasıl değişeceğini senaryolarla görün.",
  "Chase, level ve hybrid toplam plan senaryoları":
    "Talep belirsizliğine karşı kapasite, fazla mesai, taşeron ve stok tercihlerini karşılaştırın; hizmet düzeyi ile toplam maliyet dengesini görün.",
  "Takt, istasyon yükü ve iş tasarımı simülatörü":
    "Müşteri talebinin gerektirdiği üretim ritmini hesaplayın; operasyon sürelerini istasyonlara dağıtarak aşırı yükü, denge kaybını ve ergonomi riskini bulun.",
  "Davranıştan sisteme ve zihinsel modele":
    "Gözlenen davranışı son neden kabul etmeyin; davranışı makul veya kaçınılmaz hale getiren hedefi, iş koşulunu, gecikmeli etkiyi ve yönetim varsayımını araştırın.",
  "Standart ile gerçek iş arasındaki boşluk":
    "Sahada işi yapan kişiyi izleyin; yazılı standarttan sapmanın nerede ve neden gerekli hale geldiğini, arama-hareket kayıplarını ve hata fırsatlarını kaydedin.",
};
export const PANEL_FRIENDLY_TITLES: Record<string, string> = {
  "Tier 1–3 SQDCP ve eskalasyon":
    "Günlük performans ve sorun yükseltme toplantıları",
  "Öneri → deney → ölçüm → standart → Yokoten":
    "Fikirden deneye, ölçümden standartlaştırmaya",
  "Dijital OPL akademisi": "Tek Nokta Dersi ile kısa saha eğitimi",
  "Darboğaz, ürün karması ve yatırım what-if":
    "Kapasite, darboğaz ve yatırım senaryoları",
  "Chase, level ve hybrid toplam plan senaryoları":
    "Satış ve operasyon planı senaryoları",
};
export const PANEL_TERMS: Record<string, string[]> = {
  "Karşılaştırılabilir referans ve bağlama uyarlama": [
    "Yerel değer: kendi sürecinizin ölçülen sonucu.",
    "Referans değer: kıyaslanan süreç veya kuruluşun sonucu.",
    "Ölçek: değerlerin adil karşılaştırılması için üretim adedi, çalışan sayısı veya süre gibi payda.",
    "Uyarlama: iyi uygulamanın sizin teknoloji, insan ve hacim koşullarınıza göre değiştirilmiş hali.",
  ],
  "Darboğaz, ürün karması ve yatırım what-if": [
    "Talep: incelenen dönem için karşılanması gereken toplam miktar.",
    "Darboğaz çevrim süresi: hattın hızını sınırlayan adımın bir ürün için harcadığı saniye.",
    "Verim: sağlam çıkan ürün yüzdesi.",
    "Karma faktörü: ürün çeşitliliğinin teorik kapasiteye etkisi; 1 etkisiz, 1'in altı kapasite kaybıdır.",
  ],
  "Chase, level ve hybrid toplam plan senaryoları": [
    "Talebi izleyen plan: kapasiteyi talebe göre artırıp azaltır.",
    "Dengeli plan: kapasiteyi sabit tutar, dalgalanmayı stok veya bekleyen siparişle karşılar.",
    "Karma plan: sabit kapasiteyi fazla mesai, taşeron ve stokla birlikte kullanır.",
    "Bekleyen sipariş: o dönemde karşılanamayıp sonraki döneme taşınan talep.",
  ],
  "Takt, istasyon yükü ve iş tasarımı simülatörü": [
    "Takt süresi: müşteri talebini karşılamak için bir ürünün kaç saniyede çıkması gerektiği.",
    "Operasyon süresi: tek iş adımının standart tamamlanma süresi.",
    "İstasyon: bir veya daha fazla operasyonun atandığı çalışma noktası.",
    "Denge kaybı: istasyonlar arasındaki boş veya aşırı yük nedeniyle kullanılamayan kapasite.",
  ],
  "Zayıf sinyal merkezi": [
    "Sinyal türü: gözlemin hangi operasyon kaynağından geldiğini gösterir.",
    "Hipotez: araştırılacak geçici açıklamadır; doğrulanmış kök neden değildir.",
    "Doğrulama görevi: hipotezi hangi ölçüm, gözlem veya karşılaştırmayla sınayacağınız.",
    "İzleme: henüz vaka açmaya yetmeyen ancak kaybolmaması gereken sinyal durumu.",
  ],
  "Tier 1–3 SQDCP ve eskalasyon": [
    "Tier 1: hat veya vardiya düzeyi günlük toplantı.",
    "Tier 2: bölüm düzeyinde, yerel ekibin çözemediği engeller.",
    "Tier 3: fabrika veya yönetim düzeyinde kaynak ve öncelik kararı.",
    "SQDCP: güvenlik, kalite, teslimat, maliyet ve çalışan göstergeleri.",
  ],
  "Öneri → deney → ölçüm → standart → Yokoten": [
    "Hipotez: değişiklik yapılırsa hangi ölçünün neden iyileşeceği beklentisi.",
    "Başlangıç değeri: deneyden önceki karşılaştırma noktası.",
    "Standartlaştırma: başarılı yöntemin kontrollü dokümana dönüştürülmesi.",
    "Yokoten: öğrenimin uygun benzer alanlara yatay yayılımı.",
  ],
  "Dijital OPL akademisi": [
    "OPL / Tek Nokta Dersi: tek bir kritik bilgiyi kısa ve görsel anlatan eğitim.",
    "Net limit: doğru ile yanlışı ayıran ölçülebilir sınır.",
    "Mikro sınav: yalnız katılımı değil anlayışı kontrol eden tek soru.",
    "Yetkinlik: kişinin işi sahada doğru yapabildiğinin doğrulanması.",
  ],
  "Kontrol yükü ve kaldırma portföyü": [
    "Önleme: hatanın oluşmasını fiziksel veya sistemsel olarak engeller.",
    "Tespit: oluşan hatayı sonraki aşamaya geçmeden bulur.",
    "Ayıklama: şüpheli ürünleri tek tek kontrol eden geçici ve maliyetli koruma.",
    "Kaldırma kriteri: geçici kontrolün hangi kanıtla güvenle sonlandırılacağı.",
  ],
  "Davranıştan sisteme ve zihinsel modele": [
    "Sistem koşulu: davranışı mümkün veya mantıklı hale getiren iş ortamı.",
    "Yönetim varsayımı: kararın arkasındaki çoğu zaman söylenmeyen kabul.",
    "Yerel gösterge: bir alanı iyileştirirken bütüne zarar verebilen bölüm hedefi.",
    "Geri besleme döngüsü: bir sonucun zamanla kendi nedenini güçlendirmesi veya zayıflatması.",
  ],
  "Standart ile gerçek iş arasındaki boşluk": [
    "Beklenen standart: dokümanda tarif edilen çalışma biçimi.",
    "Gerçek davranış: kişinin sahada fiilen yaptığı işlem.",
    "Telafi davranışı: sistem eksiğini kapatmak için geliştirilen resmi olmayan çözüm.",
    "Hata fırsatı: yanlış seçimi veya unutmayı mümkün kılan karar noktası.",
  ],
};

export function PanelTitle({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action: string;
  onAction: () => void;
}) {
  const terms = PANEL_TERMS[title];
  const detail = description ?? PANEL_DESCRIPTIONS[title];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
            {PANEL_FRIENDLY_TITLES[title] ?? title}
          </h2>
          {detail && (
            <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
              {detail}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={onAction}>
          {action === "OPL ekle"
            ? "Tek Nokta Dersi ekle"
            : action === "Kaizen ekle"
              ? "İyileştirme deneyi ekle"
              : action}
        </button>
      </div>
      {terms && (
        <details className="subtle-panel mt-3">
          <summary className="text-[12px] font-semibold">
            Bu bölümdeki alanlar ne anlama geliyor?
          </summary>
          <dl className="mt-2.5 border-t border-[var(--rule)]">
            {terms.map((term) => {
              // "Terim: açıklama" — iki nokta ilk geçtiği yerde ayrılır.
              const at = term.indexOf(":");
              const name = at > 0 ? term.slice(0, at) : null;
              const body = at > 0 ? term.slice(at + 1).trim() : term;
              return (
                <div key={term} className="border-b border-[var(--rule-faint)] py-1.5 last:border-b-0">
                  {name && <dt className="inline text-[11px] font-semibold">{name}</dt>}
                  <dd className="inline text-[11px] leading-relaxed text-[var(--muted)]">
                    {name ? " — " : ""}
                    {body}
                  </dd>
                </div>
              );
            })}
          </dl>
        </details>
      )}
    </div>
  );
}
export function RecordRemovalPanel({
  groups,
}: {
  groups: {
    label: string;
    items: {
      id: string;
      name: string;
      hasContent: boolean;
      remove: () => void;
    }[];
  }[];
}) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (!total) return null;
  return (
    <details className="card p-5">
      <summary className="text-[13px] font-semibold">
        Eklenen kayıtları yönet veya kaldır{" "}
        <span className="ml-1 font-mono text-[11px] font-normal tabular-nums text-[var(--muted-2)]">
          ({total} kayıt)
        </span>
      </summary>
      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[var(--muted)]">
        Yanlışlıkla açılan boş kayıtlar doğrudan kaldırılır. Bilgi girilmiş kayıtlarda veri kaybını
        önlemek için onay istenir.
      </p>
      <div className="mt-4 flex flex-col gap-5">
        {groups
          .filter((group) => group.items.length)
          .map((group) => (
            <div key={group.label}>
              <p className="eyebrow">{group.label}</p>
              <ul className="mt-1.5 border-t border-[var(--rule-strong)]">
                {group.items.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-[var(--rule)] py-2"
                  >
                    <span className="flex min-w-0 items-baseline gap-2.5">
                      <span className="shrink-0 font-mono text-[11px] text-[var(--muted-2)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-[13px]">
                        {item.name || `${group.label} ${index + 1}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-[11px] text-[var(--muted-2)] underline decoration-[var(--rule-strong)] underline-offset-[3px] transition-colors hover:text-[var(--st-risk)] hover:decoration-[var(--st-risk)]"
                      onClick={() => {
                        if (canRemoveRecord(group.label, item.hasContent)) item.remove();
                      }}
                    >
                      Kaldır
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </details>
  );
}

