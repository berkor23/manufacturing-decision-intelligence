import { expect, test, type Locator, type Page } from "@playwright/test";
import { FEATURE_KEYS, FEATURE_META, type DiagnosticFeatureKey } from "../src/domain/diagnosis/features";
import { METHODOLOGY_META, type Methodology } from "../src/domain/diagnosis/methodologies";

type UserJourney = {
  name: string;
  text: string;
  expected: Methodology;
  answers: Partial<Record<DiagnosticFeatureKey, boolean>>;
};

const journeys: UserJourney[] = [
  {
    name: "müşteriye ulaşan kaynak çatlağı",
    text: "Otomotiv müşterisine ulaşan kaynak çatlağı tekrar etti; kök neden bilinmiyor ve acil ayıklama gerekiyor.",
    expected: "EIGHT_D",
    answers: { defectOccurred: true, customerAffected: true, rootCauseKnown: false, externalNonconformance: true, containmentNeeded: true, hasMeasurementData: true, humanErrorProne: false },
  },
  {
    name: "kronik dolum varyasyonu",
    text: "Dolum ağırlığı aylardır yüksek değişkenlik gösteriyor; doğrulanmış ölçüm sistemimiz ve karşılaştırma verimiz var.",
    expected: "DMAIC",
    answers: { previouslyOccurred: true, hasMeasurementData: true, highVariation: true, measurementReliable: true, processStable: false, monitoringNeed: false, standardWorkEstablished: true },
  },
  {
    name: "yeni tedarikçi kaynaklı gelecek riski",
    text: "Mevcut montaj prosesinde yeni bir yapıştırıcı tedarikçisine geçilecek. Henüz hata yaşanmadı; açık bekleme süresi ve operatör uygulaması değişirse oluşabilecek riskleri önceden değerlendirmek istiyoruz.",
    expected: "FMEA",
    answers: { defectOccurred: false, supplierChanged: true, failureModeKnown: true, potentialEffectKnown: true, controlAdequacyUncertain: true, humanErrorProne: true, safetyOrRegulatory: true, standardWorkEstablished: true, basicConditionsStable: true },
  },
  {
    name: "tekrar eden ekipman kaybı",
    text: "Paketleme makinesindeki kısa duruşlar aylardır tekrarlıyor; OEE ve bakım kayıtları mevcut.",
    expected: "TPM",
    answers: { equipmentBreakdown: true, chronicEquipmentLoss: true, previouslyOccurred: true, hasMeasurementData: true, standardWorkEstablished: false, isImprovementInitiative: false },
  },
  {
    name: "sayısal doğrulanmış sistem kısıtı",
    text: "Boyahane fırını tek kapasite kısıtı; önünde kuyruk oluşuyor, diğer istasyonlar boş kalıyor ve kapasite ile talep verileri karşılaştırıldı.",
    expected: "TOC",
    answers: { bottleneckThroughput: true, constraintQueue: true, downstreamStarvation: true, constraintMeasured: true, constraintLeverageExpected: true, hasMeasurementData: true, flowOrWaste: true, measurementReliable: true, equipmentBreakdown: false },
  },
  {
    name: "CNC yatırım kararı",
    text: "İki CNC tezgâhı teklifi arasında seçim yapacağız. Emniyet ve tolerans zorunlu kriter; maliyet, servis, çevrim süresi ve teslim tarihi ağırlıklı tercih kriterleri olacak. Henüz arıza yok.",
    expected: "KT_DECISION",
    answers: { decisionBetweenOptions: true, multipleAlternativesDefined: true, mandatoryCriteriaDefined: true, preferenceCriteriaDefined: true, decisionOwnerKnown: true, unresolvedCauseBeforeDecision: false, hasMeasurementData: true, safetyOrRegulatory: true },
  },
];

function questionKey(question: string): DiagnosticFeatureKey {
  const key = FEATURE_KEYS.find((candidate) => FEATURE_META[candidate].questionTheme === question);
  if (!key) throw new Error(`Tanımsız teşhis sorusu: ${question}`);
  return key;
}

async function finishDiagnosis(page: Page, journey: UserJourney) {
  await page.goto("/diagnoz");
  await page.locator("textarea").first().fill(journey.text);
  await page.getByRole("button", { name: /Teşhise başla/ }).click();
  await expect(page.getByRole("heading", { name: "Sizi doğru anladım mı?" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Onayla ve sorulara geç/ }).click();

  const asked: DiagnosticFeatureKey[] = [];
  const resultButton = page.getByRole("button", { name: /çalışma alanını aç/i });
  const currentQuestion = page.locator(".card-accent-indigo p.text-xl").first();

  for (let turn = 0; turn < 12; turn += 1) {
    await Promise.race([
      resultButton.waitFor({ state: "visible" }),
      currentQuestion.waitFor({ state: "visible" }),
    ]);
    if (await resultButton.isVisible()) break;

    const text = (await currentQuestion.textContent())?.trim() ?? "";
    const key = questionKey(text);
    asked.push(key);
    const answer = journey.answers[key] ?? false;
    await page.locator("button.btn-answer:not([disabled])").filter({ hasText: answer ? /^Evet$/ : /^Hayır$/ }).click();
    await expect.poll(async () => {
      if (await resultButton.isVisible()) return "RESULT";
      if (!(await currentQuestion.isVisible())) return "WAITING";
      return (await currentQuestion.textContent())?.trim() ?? "WAITING";
    }).not.toBe(text);
  }

  await expect(resultButton).toBeVisible();
  await expect(page.getByRole("heading", { name: METHODOLOGY_META[journey.expected].shortName, exact: true })).toBeVisible();
  expect(asked.length, `${journey.name}: tek/iki cevapla kesin karar verilmemeli`).toBeGreaterThanOrEqual(3);
  expect(asked.length, `${journey.name}: teşhis güvenlik sınırı içinde bitmeli`).toBeLessThanOrEqual(12);
  expect(new Set(asked).size, `${journey.name}: aynı soru tekrarlanmamalı`).toBe(asked.length);

  await page.getByText("Diğer yaklaşımlar ve kararın değişme koşulları", { exact: true }).click();
  await expect(page.getByText("Neden diğer yöntemler değil?", { exact: true })).toBeVisible();
  await expect(page.getByText(/istatistiksel başarı olasılığı değildir/i)).toBeVisible();
  return { asked, resultButton };
}

async function verifyWorkspaceUsability(page: Page, journey: UserJourney) {
  await page.getByRole("button", { name: /Çalışma alanını aç/ }).click();
  await expect(page.getByText(journey.text, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /Genel bakış/ })).toBeVisible();
  await page.getByRole("tab", { name: /Metodoloji adımları/ }).click();

  const editor = page.locator("section.card.flex.flex-col.gap-4.p-6").first();
  await expect(editor.getByText("Bu adım nasıl yürütülür?", { exact: true })).toBeVisible();
  await expect(editor.getByText("Adımın beklenen çıktısı", { exact: true })).toBeVisible();
  await expect(editor.getByText("İyi kayıt ölçütü:").first()).toBeVisible();
  await expect(editor.getByText("Örnek:").first()).toBeVisible();

  const auditValue = `Saha doğrulama kaydı: ${journey.name}; 05.08.2026 tarihinde ölçüm ve sorumlu bilgisiyle kaydedildi.`;
  const addRow = editor.getByRole("button", { name: /Satır ekle/ }).first();
  const fiveWhyDraft = editor.getByPlaceholder(/Neden oldu\?|Peki bu neden oldu/).first();
  const fishboneDraft = editor.locator('input[placeholder$="nedeni…"]').first();
  let editable: Locator;
  if (await addRow.isVisible()) {
    await addRow.click();
    editable = editor.locator("table input").first();
    await editable.fill(auditValue);
  } else if (await fiveWhyDraft.isVisible()) {
    await fiveWhyDraft.fill(auditValue);
    await editor.getByRole("button", { name: "Ekle", exact: true }).click();
    editable = editor.locator('input[placeholder^="Kanıt"]').first();
    await editable.fill("Kalibre edilmiş ölçüm kaydı ve kontrollü tekrar deneyi.");
  } else if (await fishboneDraft.isVisible()) {
    await fishboneDraft.fill(auditValue);
    await fishboneDraft.press("Enter");
    editable = editor.locator('input[placeholder^="Değerlendirme"]').first();
    await editable.fill("Saha gözlemi ve ölçüm kaydıyla doğrulandı.");
  } else {
    editable = editor.locator("textarea, input.field").first();
    await editable.fill(auditValue);
  }
  await expect(page.getByRole("status").filter({ hasText: /(?:Bu tarayıcıya|Buluta) kaydedildi/ })).toBeVisible({ timeout: 10_000 });
  const savedValue = await editable.inputValue();
  await page.reload();
  await page.getByRole("tab", { name: /Metodoloji adımları/ }).click();
  const restoredInputs = page.locator("section.card.flex.flex-col.gap-4.p-6").first().locator("textarea, input");
  await expect.poll(() => restoredInputs.evaluateAll(
    (elements, expected) => elements.filter((element) => (element as HTMLInputElement | HTMLTextAreaElement).value === expected).length,
    savedValue,
  )).toBe(1);

  await page.getByRole("tab", { name: /Rapor/ }).click();
  await page.getByRole("button", { name: /Ara rapor oluştur/ }).click();
  await expect(page.getByText(/Uygulama Raporu|Ara durum/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
}

test.describe("ilk kez kullanan mühendis gözüyle altı gerçekçi vaka", () => {
  for (const journey of journeys) {
    test(`${journey.name}: teşhisten ara rapora kadar anlaşılır ve kalıcı`, async ({ page }) => {
      const { asked } = await finishDiagnosis(page, journey);
      console.log(`[kullanıcı-yeniden-test] ${journey.name}: ${asked.length} soru (${asked.join(", ")})`);
      await test.info().attach("sorulan-sinyaller", {
        body: Buffer.from(asked.join("\n"), "utf8"),
        contentType: "text/plain",
      });
      await verifyWorkspaceUsability(page, journey);
    });
  }
});
