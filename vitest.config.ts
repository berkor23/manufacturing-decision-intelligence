import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` yalnız Next derlemesinde çözülen bir işaret modülüdür;
      // testte sunucu yardımcılarını (auth, kota) doğrudan çağırabilmek için
      // boş bir modüle eşlenir.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
