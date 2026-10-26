import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import baseConfig from "../../playwright.config";

const publicAuthPort = Number(process.env.NIUVA_PUBLIC_AUTH_E2E_PORT ?? "3013");
if (!Number.isInteger(publicAuthPort) || publicAuthPort < 1024 || publicAuthPort > 65535) {
  throw new Error("NIUVA_PUBLIC_AUTH_E2E_PORT tidak valid.");
}

const publicBaseUrl = `http://localhost:${publicAuthPort}`;
const localServerScript = fileURLToPath(new URL("../../scripts/local-e2e-web.ps1", import.meta.url));
process.env.NIUVA_E2E_PORT = String(publicAuthPort);

const server = baseConfig.webServer;
if (!server || Array.isArray(server)) throw new Error("Public auth E2E requires the existing single-server harness.");

export default defineConfig({
  ...baseConfig,
  use: { ...baseConfig.use, baseURL: publicBaseUrl },
  testDir: ".",
  testMatch: "customer-public-auth.spec.ts",
  globalSetup: "../e2e/global-setup.ts",
  webServer: {
    ...server,
    command: process.env.CI
      ? `corepack pnpm exec next dev -p ${publicAuthPort}`
      : `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${localServerScript}"`,
    cwd: process.cwd(),
    url: publicBaseUrl,
    reuseExistingServer: false,
    env: {
      ...server.env,
      ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL, DEMO_DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
      APP_URL: publicBaseUrl,
      GOOGLE_REDIRECT_URI: `${publicBaseUrl}/api/auth/google/callback`,
      NIUVA_E2E_PORT: String(publicAuthPort),
      NIUVA_NEXT_DIST_DIR: ".next-e2e-public-auth",
      NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "true",
    },
  },
});
