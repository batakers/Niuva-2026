import { defineConfig } from "@playwright/test";

const demoDatabaseUrl =
  "postgresql://niuva_dev@127.0.0.1:55433/niuva_dev?schema=public";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /local-demo\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-demo-web.ps1",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: demoDatabaseUrl,
      DEMO_DATABASE_URL: demoDatabaseUrl,
      NIUVA_RUNTIME_MODE: "demo",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
    },
  },
});
