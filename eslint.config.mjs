import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "playwright-report/**",
    "test-results/**",
    "dokumantasyon/**",
    "docs/visual-assets/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Alt çizgiyle başlayan argüman "bilerek kullanılmıyor" demektir: port
      // sözleşmesini karşılamak için alınan ama o uygulamada anlamı olmayan
      // parametreler (ör. bellek deposunda `_owner`) böyle işaretlenir.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
