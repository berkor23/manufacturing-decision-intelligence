import { describe, expect, it } from "vitest";
import { KeywordProblemParser } from "./keyword-problem-parser";

describe("KeywordProblemParser — profesyonel olumsuzluklar", () => {
  it.each([
    ["Kök neden biliniyor ve deneyle belli oldu.", "rootCauseKnown", true],
    ["Kök neden henüz bilinmiyor.", "rootCauseKnown", false],
    ["Ekip sabah toplantısında vakayı görüştü.", "rootCauseKnown", undefined],
    ["Müşteriden doğrulanmış şikâyet geldi.", "customerAffected", true],
    ["Müşteri etkilenmedi ve şikâyet gelmedi.", "customerAffected", false],
    ["İç denetim kaydı açıldı.", "customerAffected", undefined],
    ["Parçada çatlak bulundu.", "defectOccurred", true],
    ["Henüz hata yaşanmadı.", "defectOccurred", false],
    ["Yeni vardiya planı hazırlanıyor.", "defectOccurred", undefined],
    ["Rulman arızası nedeniyle makine durdu.", "equipmentBreakdown", true],
    ["Yeni tezgâh yatırımında henüz arıza yok.", "equipmentBreakdown", false],
    ["Ekipman envanteri güncellendi.", "equipmentBreakdown", undefined],
    ["Sıfırdan yeni ürün tasarımı yapıyoruz.", "isNewDesign", true],
    ["Bu seri üretimdeki mevcut ürün, yeni tasarım değildir.", "isNewDesign", false],
    ["Ürün ailesinin satış tahmini güncellendi.", "isNewDesign", undefined],
    ["Standart iş bütün vardiyalarda uygulanıyor.", "standardWorkEstablished", true],
    ["Standart iş yok, herkes farklı yapıyor.", "standardWorkEstablished", false],
    ["Vardiya listesi panoya asıldı.", "standardWorkEstablished", undefined],
    ["4M kararlı ve temel koşullar sağlanıyor.", "basicConditionsStable", true],
    ["Temel koşullar eksik ve 4M kararsız.", "basicConditionsStable", false],
    ["4M başlıkları eğitimde anlatıldı.", "basicConditionsStable", undefined],
    ["İki tedarikçi alternatifi arasında karar vereceğiz.", "decisionBetweenOptions", true],
    ["Tek tedarikçinin teslimatı kayda alındı.", "decisionBetweenOptions", undefined],
    ["Satın alma bütçesi açıklandı.", "decisionBetweenOptions", undefined],
    ["Seçimden önce kök nedeni bulmamız gerekiyor.", "unresolvedCauseBeforeDecision", true],
    ["Kök neden problemi yok; doğrudan seçenekleri kıyaslayacağız.", "unresolvedCauseBeforeDecision", false],
    ["Karar toplantısı cuma günü yapılacak.", "unresolvedCauseBeforeDecision", undefined],
    ["Fırın önünde sürekli kuyruk ve ara stok oluşuyor.", "flowOrWaste", true],
    ["Kürlenme süresi 480 saniyelik teknik limittir.", "flowOrWaste", false],
    ["Fırın sıcaklığı reçeteye işlendi.", "flowOrWaste", undefined],
  ] as const)("30 altın parser varyantı: %s", async (text, key, expected) => {
    const parsed = await new KeywordProblemParser().parseInitial(text);
    expect(parsed.features[key]).toBe(expected);
  });
  it("'yeni ürün tasarımı değildir' ifadesini yeni tasarım olarak işaretlemez", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "Seri üretimdeki fren kaliperi prosesi için risk analizi; yeni ürün tasarımı değildir.",
    );
    expect(parsed.features.isNewDesign).toBe(false);
  });

  it("gerçek yeni tasarım ifadesini pozitif yakalar", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "Yeni ürün tasarımı için DFSS çalışması başlatıyoruz.",
    );
    expect(parsed.features.isNewDesign).toBe(true);
  });

  it.each([
    "Henüz hata yaşanmadı; yalnızca gelecekteki riski değerlendiriyoruz.",
    "Şu ana kadar arıza görülmedi, devreye alma öncesi risk analizi yapacağız.",
    "Bu proseste gerçekleşmiş bir uygunsuzluk yok.",
  ])("gerçekleşmemiş olay ifadesini hata var diye yorumlamaz: %s", async (text) => {
    const parsed = await new KeywordProblemParser().parseInitial(text);
    expect(parsed.features.defectOccurred).toBe(false);
  });

  it("ekipman satın alma kararındaki arıza yok ifadesini ekipman arızası saymaz", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "İki CNC tezgâhı teklifi arasında yatırım kararı vereceğiz; henüz arıza yok.",
    );
    expect(parsed.features.equipmentBreakdown).toBe(false);
    expect(parsed.features.decisionBetweenOptions).toBe(true);
  });

  it("teknik açık bekleme süresini akış israfından ayırır", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "Yeni yapıştırıcının açık bekleme süresi ve kürlenme limiti risk oluşturabilir.",
    );
    expect(parsed.features.flowOrWaste).toBe(false);
  });

  it("gerçek kuyruk ve ara stoku akış kaybı olarak yakalar", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "Fırın önünde sürekli kuyruk ve ara stok oluşuyor.",
    );
    expect(parsed.features.flowOrWaste).toBe(true);
  });

  it("gelecekteki tedarikçi ve malzeme geçişini değişiklik olarak yakalar", async () => {
    const parsed = await new KeywordProblemParser().parseInitial(
      "Mevcut proseste yeni bir yapıştırıcı tedarikçisine geçilecek.",
    );
    expect(parsed.features.supplierChanged).toBe(true);
  });

  it.each([
    ["Dün arıza yoktu. Bugün gövdede çatlak görüldü.", "defectOccurred", true],
    ["Henüz hata yok; fakat ileride çatlak oluşabilir.", "defectOccurred", false],
    ["Ekipman arızası yaşanmadı. Üründe kaçak bulundu.", "defectOccurred", true],
    ["Yeni makine yatırımı yapacağız, ekipman arızası yok.", "equipmentBreakdown", false],
    ["Yeni makine devrede. Rulman arızası nedeniyle duruş oluştu.", "equipmentBreakdown", true],
    ["Müşteri etkilenmedi ve şikâyet gelmedi.", "customerAffected", false],
    ["Müşteriden iade geldi; üründe deformasyon var.", "customerAffected", true],
    ["Kürlenme süresi 480 saniye, bu teknik proses limitidir.", "flowOrWaste", false],
    ["İstasyon önünde WIP ve malzeme kuyruğu birikiyor.", "flowOrWaste", true],
    ["Yeni hammadde partisi kullanılacak.", "supplierChanged", true],
    ["Proses parametresi değiştirilecek.", "processChanged", true],
    ["İki tedarikçi alternatifi arasında seçim yapacağız.", "decisionBetweenOptions", true],
  ] as const)("çok anlamlı ve zaman bağlamlı ifadeyi doğru yorumlar: %s", async (text, key, expected) => {
    const parsed = await new KeywordProblemParser().parseInitial(text);
    expect(parsed.features[key]).toBe(expected);
  });
});
