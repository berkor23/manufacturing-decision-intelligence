import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "guest-local-flow.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3001",
    extraHTTPHeaders: { Origin: "http://localhost:3001" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: 'set "ACCOUNT_AUTH_ENABLED=0" && set "APP_PASSWORD=MdiGuestE2e2026" && set "ADMIN_PASSWORD=" && npm run start -- -p 3001',
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "guest-chromium", use: { ...devices["Desktop Chrome"] } }],
});
