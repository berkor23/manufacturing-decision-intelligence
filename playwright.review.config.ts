import {defineConfig,devices} from "@playwright/test";
export default defineConfig({testDir:"./e2e",testMatch:"ui-review.spec.ts",workers:1,retries:0,use:{baseURL:"http://localhost:3000",...devices["Desktop Chrome"]},webServer:{command:"npm run dev",url:"http://localhost:3000",reuseExistingServer:true,timeout:120000}});
