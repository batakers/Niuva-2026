import { defineConfig } from "@playwright/test";

const ciTestDatabaseUrl =
  "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: /local-demo\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // The local Next dev server becomes contention-bound above four workers;
  // CI remains serialized for the most conservative browser smoke.
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.CI
      ? "corepack pnpm exec next dev -p 3000"
      : "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-e2e-web.ps1",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      ...(process.env.CI
        ? {
            DATABASE_URL: ciTestDatabaseUrl,
            DEMO_DATABASE_URL: ciTestDatabaseUrl,
            GOOGLE_CLIENT_ID: "local-e2e-google-client",
            GOOGLE_CLIENT_SECRET: "local-e2e-google-secret",
            GOOGLE_REDIRECT_URI:
              "http://localhost:3000/api/auth/google/callback",
            NIUVA_NEXT_DIST_DIR: ".next-e2e",
          }
        : {}),
      NODE_ENV: "test",
      NIUVA_RUNTIME_MODE: "",
      NIUVA_CUSTOMER_AUTH_MOCK: "true",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
      R2_ACCOUNT_ID: "",
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "",
      R2_PRIVATE_BUCKET: "",
      R2_PUBLIC_BUCKET: "",
      R2_ENDPOINT: "",
      CUSTOM_FILE_MAX_BYTES: "",
    },
  },
});
