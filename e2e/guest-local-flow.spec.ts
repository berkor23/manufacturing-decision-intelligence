import { expect, test } from "@playwright/test";
import { FEATURE_KEYS, FEATURE_META, type DiagnosticFeatureKey } from "../src/domain/diagnosis/features";

const answers: Partial<Record<DiagnosticFeatureKey, boolean>> = {
  decisionBetweenOptions: true,
  multipleAlternativesDefined: true,
  mandatoryCriteriaDefined: true,
  preferenceCriteriaDefined: true,
  decisionOwnerKnown: true,
  unresolvedCauseBeforeDecision: false,
  hasMeasurementData: true,
  safetyOrRegulatory: true,
};

test("üye olmayan kullanıcı teşhisten yerel çalışma ve ara rapora ilerler", async ({ page }) => {
  const problem = "İki CNC tezgâhı teklifi arasında seçim yapacağız. Emniyet ve tolerans zorunlu; maliyet, servis ve çevrim süresi ağırlıklı tercih kriteridir.";
  await page.goto("/diagnoz");
  await page.locator("textarea").first().fill(problem);
  await page.getByRole("button", { name: /Teşhise başla/ }).click();
  await expect(page.getByRole("heading", { name: "Sizi doğru anladım mı?" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Onayla ve sorulara geç/ }).click();

  const resultButton = page.getByRole("button", { name: /çalışma alanını aç/i });
  const question = page.locator(".card-accent-indigo p.text-xl").first();
  for (let turn = 0; turn < 12; turn += 1) {
    await Promise.race([resultButton.waitFor({ state: "visible" }), question.waitFor({ state: "visible" })]);
    if (await resultButton.isVisible()) break;
    const text = (await question.textContent())?.trim() ?? "";
    const key = FEATURE_KEYS.find((candidate) => FEATURE_META[candidate].questionTheme === text);
    if (!key) throw new Error(`Tanımsız soru: ${text}`);
    await page.locator("button.btn-answer:not([disabled])").filter({ hasText: answers[key] === true ? /^Evet$/ : /^Hayır$/ }).click();
    await expect.poll(async () => {
      if (await resultButton.isVisible()) return "RESULT";
      return (await question.textContent())?.trim() ?? "WAITING";
    }).not.toBe(text);
  }

  await expect(resultButton).toBeVisible();
  await expect(page.getByRole("heading", { name: "KT Karar", exact: true })).toBeVisible();
  await resultButton.click();
  await expect(page).toHaveURL(/\/workspace\/local_ws_/);
  await expect(page.getByRole("status").filter({ hasText: /Bu tarayıcıya kaydedildi/ })).toBeVisible();

  await page.getByRole("tab", { name: /Metodoloji adımları/ }).click();
  const editor = page.locator("section.card.flex.flex-col.gap-4.p-6").first();
  const field = editor.locator("textarea, input.field").first();
  const savedValue = "Yatırım komitesi kararı; iki doğrulanmış CNC alternatifi 05.08.2026 tarihinde karşılaştırılacak.";
  await field.fill(savedValue);
  await expect(page.getByRole("status").filter({ hasText: /Bu tarayıcıya kaydedildi/ })).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await page.getByRole("tab", { name: /Metodoloji adımları/ }).click();
  await expect(page.locator("section.card.flex.flex-col.gap-4.p-6").first().locator("textarea, input.field").first()).toHaveValue(savedValue);

  await page.getByRole("tab", { name: /Rapor/ }).click();
  await page.getByRole("button", { name: /Ara rapor oluştur/ }).click();
  await expect(page.getByText(/Uygulama Raporu|Ara durum/).first()).toBeVisible();
  await page.goto("/yerel-calismalar");
  await expect(page.getByText(problem, { exact: true })).toBeVisible();
  await expect(page.getByText("Tarayıcıda", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Üye ol ve taşı" })).toBeVisible();
});
