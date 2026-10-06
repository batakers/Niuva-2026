import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-admin-auth",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3107", trace: "off", screenshot: "off" },
  webServer: {
    command: "corepack pnpm exec jiti scripts/local-admin-auth-e2e-web.ts",
    url: "http://localhost:3107/admin/sign-in",
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
