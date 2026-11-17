import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  timeout: 30_000,
  use: {
    channel: process.platform === "win32" ? "chrome" : undefined,
    baseURL: "http://localhost:3004",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/start-e2e.mjs",
    url: "http://localhost:3004/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
