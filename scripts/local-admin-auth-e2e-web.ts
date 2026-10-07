import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { getSafeTestDatabaseUrl } from "../src/lib/db/test-safety";

if (!process.env.TEST_DATABASE_URL && !process.env.CI && existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
const databaseUrl = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? (process.env.CI ? "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public" : undefined) });
const runtime = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3107", "--hostname", "127.0.0.1"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    APP_URL: "http://localhost:3107",
    BETTER_AUTH_URL: "http://localhost:3107",
    BETTER_AUTH_SECRET: "local-e2e-admin-secret-do-not-use-in-production-638",
    NIUVA_NEXT_DIST_DIR: ".next-admin-auth-e2e",
    NIUVA_RUNTIME_MODE: "",
    NIUVA_DEPLOYMENT_TIER: "local-test",
    // Enables the existing loopback-only Customer privacy test capability.
    // Admin sign-in, credentials, and mandatory TOTP use real Better Auth.
    NIUVA_CUSTOMER_AUTH_MOCK: "true",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_REDIRECT_URI: "",
    ADMIN_SMTP_HOST: "", ADMIN_SMTP_PORT: "", ADMIN_SMTP_USER: "", ADMIN_SMTP_PASSWORD: "", ADMIN_EMAIL_FROM: "",
    R2_ACCOUNT_ID: "", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "", R2_ENDPOINT: "", R2_PRIVATE_BUCKET: "", R2_PUBLIC_BUCKET: "", CUSTOM_FILE_MAX_BYTES: "",
    MIDTRANS_SERVER_KEY: "", MIDTRANS_IS_PRODUCTION: "", NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "",
    BITESHIP_API_KEY: "", BITESHIP_COURIERS: "", BITESHIP_ORIGIN_AREA_ID: "",
    RESEND_API_KEY: "", EMAIL_FROM: "",
  },
});
runtime.on("exit", code => { process.exitCode = code ?? 1; });
process.on("SIGTERM", () => runtime.kill("SIGTERM"));
process.on("SIGINT", () => runtime.kill("SIGINT"));
