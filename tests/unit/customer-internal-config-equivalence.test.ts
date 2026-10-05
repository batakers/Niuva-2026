import { describe, expect, it } from "vitest";
import { z } from "zod";
import { normalizeCustomerEmail } from "@/modules/customer-auth/core";
import {
  getInternalAuthConfig,
  isInternalAuthDatabase,
  type InternalAuthConfig,
} from "@/modules/customer-auth/internal-testing";

// Frozen copy of getInternalAuthConfig as it was before task 3.16 (own Zod schema).
const legacySchema = z.object({
  NIUVA_INTERNAL_AUTH_ENABLED: z.literal("true"),
  NIUVA_INTERNAL_GOOGLE_EMAIL: z.string().trim().email(),
  NIUVA_INTERNAL_PASSWORD_EMAIL: z.string().trim().email(),
  APP_URL: z.string().url(),
});

function legacyGetInternalAuthConfig(
  source: Readonly<Record<string, string | undefined>>,
): InternalAuthConfig | null {
  if (!isInternalAuthDatabase(source) || source.NIUVA_CUSTOMER_AUTH_MOCK && source.NIUVA_CUSTOMER_AUTH_MOCK !== "false") return null;
  const parsed = legacySchema.safeParse(source);
  if (!parsed.success) return null;
  const app = new URL(parsed.data.APP_URL);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(app.hostname) || !["http:", "https:"].includes(app.protocol) || app.username || app.password || app.pathname !== "/" || app.search || app.hash) return null;
  const googleEmail = normalizeCustomerEmail(parsed.data.NIUVA_INTERNAL_GOOGLE_EMAIL);
  const passwordEmail = normalizeCustomerEmail(parsed.data.NIUVA_INTERNAL_PASSWORD_EMAIL);
  if (googleEmail === passwordEmail) return null;
  return { origin: app.origin, googleEmail, passwordEmail };
}

const base = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://local@127.0.0.1:55433/niuva_dev",
  APP_URL: "http://127.0.0.1:3000",
  NIUVA_INTERNAL_AUTH_ENABLED: "true",
  NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test",
  NIUVA_INTERNAL_PASSWORD_EMAIL: "password@example.test",
};

const overrides: ReadonlyArray<Record<string, string | undefined>> = [
  {},
  { NIUVA_INTERNAL_AUTH_ENABLED: "false" },
  { NIUVA_INTERNAL_AUTH_ENABLED: "TRUE" },
  { NIUVA_INTERNAL_AUTH_ENABLED: " true" },
  { NIUVA_INTERNAL_AUTH_ENABLED: "1" },
  { NIUVA_INTERNAL_AUTH_ENABLED: "" },
  { NIUVA_INTERNAL_AUTH_ENABLED: undefined },
  { NIUVA_INTERNAL_GOOGLE_EMAIL: "  Google@Example.Test  " },
  { NIUVA_INTERNAL_GOOGLE_EMAIL: "not-an-email" },
  { NIUVA_INTERNAL_GOOGLE_EMAIL: "   " },
  { NIUVA_INTERNAL_GOOGLE_EMAIL: undefined },
  { NIUVA_INTERNAL_PASSWORD_EMAIL: "" },
  { NIUVA_INTERNAL_PASSWORD_EMAIL: "PASSWORD@example.test " },
  { NIUVA_INTERNAL_PASSWORD_EMAIL: "google@example.test" },
  { NIUVA_INTERNAL_PASSWORD_EMAIL: "GOOGLE@example.test" },
  { APP_URL: undefined },
  { APP_URL: "" },
  { APP_URL: "  " },
  { APP_URL: " http://localhost:3000 " },
  { APP_URL: "http://[::1]:3000" },
  { APP_URL: "https://127.0.0.1:3000" },
  { APP_URL: "ftp://127.0.0.1" },
  { APP_URL: "not a url" },
  { APP_URL: "https://remote.example.test" },
  { APP_URL: "http://127.0.0.1:3000/other" },
  { APP_URL: "http://user:pass@127.0.0.1:3000" },
  { NODE_ENV: "production" },
  { NODE_ENV: "test" },
  { NIUVA_RUNTIME_MODE: "demo" },
  { NIUVA_RUNTIME_MODE: "live" },
  { NIUVA_CUSTOMER_AUTH_MOCK: "true" },
  { NIUVA_CUSTOMER_AUTH_MOCK: "false" },
  { NIUVA_CUSTOMER_AUTH_MOCK: "1" },
  { DATABASE_URL: "postgresql://local@localhost/niuva_dev" },
  // Unrelated malformed values must not change the decision (no throwing).
  { CRON_SECRET: "" , GOOGLE_REDIRECT_URI: "not a url", NIUVA_ANALYTICS_ENABLED: "yes" },
];

describe("getInternalAuthConfig equivalence with the pre-3.16 parser", () => {
  it.each(overrides.map((override, index) => [index, override] as const))(
    "matches the legacy result for combination %#",
    (_index, override) => {
      const source = { ...base, ...override };

      expect(getInternalAuthConfig(source)).toEqual(legacyGetInternalAuthConfig(source));
    },
  );

  it("still opens for a valid local setup and trims and lowercases emails", () => {
    expect(
      getInternalAuthConfig({ ...base, NIUVA_INTERNAL_GOOGLE_EMAIL: "  Google@Example.Test  " }),
    ).toEqual({
      origin: "http://127.0.0.1:3000",
      googleEmail: "google@example.test",
      passwordEmail: "password@example.test",
    });
  });
});
