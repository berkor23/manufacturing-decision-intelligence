// Opsiyonel LLM çıkarım doğrulaması — CI'DA KOŞMAZ.
//
//     npm run validate:llm
//
// Neden ayrı: CI'nın başarısı dış bir modele bağlanmamalı. Dil modeli
// erişilemezse bu betik NÖTR sonuç verir ve çıkış kodu 0'dır; kalite kapıları
// bozulmaz. Deterministik çıkarıcı zaten aynı fixture setiyle her koşuda
// test edilir (src/domain/diagnosis/validation/extraction-contract.test.ts).
//
// Ölçüt de aynıdır: kelimesi kelimesine eşleşme DEĞİL, normalize alan
// değişmezleri. Bir alanı çıkaramamak kabul edilebilir; YANLIŞ değerle
// doldurmak sözleşme ihlalidir.

import { spawnSync } from "node:child_process";

const OLLAMA = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";

function reachable() {
  const probe = spawnSync(
    process.execPath,
    ["-e", `fetch(${JSON.stringify(OLLAMA + "/api/tags")}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`],
    { timeout: 4000 },
  );
  return probe.status === 0;
}

if (!reachable()) {
  console.log(
    [
      "",
      "── LLM çıkarım doğrulaması ──",
      `  ${OLLAMA} erişilemedi; doğrulama ATLANDI.`,
      "  Bu bir başarısızlık değildir: kalite kapıları dış modele bağlı değildir.",
      "  Çalıştırmak için Ollama'yı açın ve PARSER=llm ile yeniden deneyin.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

// Fixture'lar TypeScript modülünde; vitest üzerinden koşturmak en az sürtünmeli yol.
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "src/domain/diagnosis/validation/extraction-contract.test.ts", "--reporter=basic"],
  { stdio: "inherit", env: { ...process.env, PARSER: "llm" } },
);

console.log(
  [
    "",
    "── LLM çıkarım doğrulaması ──",
    "  Ölçüt: normalize alan değişmezleri (kelime eşleşmesi değil).",
    "  Sert kural: hiçbir alan yanlış değerle doldurulmamalı.",
    "  Bu sonuç bir doğruluk yüzdesi değildir; sözleşme uyum kontrolüdür.",
    "",
  ].join("\n"),
);

process.exit(result.status ?? 0);
