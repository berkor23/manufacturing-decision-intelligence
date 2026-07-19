import {defineConfig,devices} from "@playwright/test";
export default defineConfig({testDir:"./e2e",testMatch:"frontend-detailed-guide.spec.ts",workers:1,retries:0,timeout:180_000,use:{...devices["Desktop Chrome"],baseURL:"http://localhost:3000",viewport:{width:1440,height:1000}},webServer:{command:"npm run dev",url:"http://localhost:3000",reuseExistingServer:true,timeout:120_000}});
