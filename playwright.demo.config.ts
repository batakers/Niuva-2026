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
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-demo-web.ps1",
    url: "http://localhost:3002",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: demoDatabaseUrl,
      DEMO_DATABASE_URL: demoDatabaseUrl,
      NIUVA_RUNTIME_MODE: "demo",
      NIUVA_CUSTOMER_AUTH_MOCK: "true",
      GOOGLE_CLIENT_ID: "local-demo-google-client",
      GOOGLE_CLIENT_SECRET: "local-demo-google-secret",
      GOOGLE_REDIRECT_URI: "http://localhost:3002/api/auth/google/callback",
      NIUVA_LOCAL_DEMO_PORT: "3002",
      NIUVA_NEXT_DIST_DIR: ".next-demo-e2e",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
    },
  },
});
