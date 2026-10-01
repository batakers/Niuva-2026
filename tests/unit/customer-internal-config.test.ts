import { describe, expect, it } from "vitest";
import { getInternalAuthConfig, isInternalAuthDatabase, capInternalExpiry, assertInternalAccountActive, assertInternalEmail } from "@/modules/customer-auth/internal-testing";
const source = { NODE_ENV: "development", DATABASE_URL: "postgresql://local@127.0.0.1:55433/niuva_dev", APP_URL: "http://127.0.0.1:3000", NIUVA_INTERNAL_AUTH_ENABLED: "true", NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test", NIUVA_INTERNAL_PASSWORD_EMAIL: "password@example.test" };
describe("internal Customer config", () => {
  it("only opens with two distinct emails and the exact local environment", () => {
    expect(getInternalAuthConfig(source)).toEqual({ origin: source.APP_URL, googleEmail: "google@example.test", passwordEmail: "password@example.test" });
    for (const override of [{ NODE_ENV: "production" }, { NODE_ENV: "test" }, { NIUVA_INTERNAL_AUTH_ENABLED: "false" }, { DATABASE_URL: "postgresql://local@localhost/niuva_dev" }, { DATABASE_URL: "postgresql://local@127.0.0.1/niuva_test" }, { APP_URL: "https://remote.example.test" }, { APP_URL: "http://127.0.0.1:3000/other" }, { NIUVA_RUNTIME_MODE: "demo" }, { NIUVA_CUSTOMER_AUTH_MOCK: "true" }, { NIUVA_INTERNAL_PASSWORD_EMAIL: "GOOGLE@example.test" }, { NIUVA_INTERNAL_GOOGLE_EMAIL: "" }]) expect(getInternalAuthConfig({ ...source, ...override })).toBeNull();
  });
  it("allows cleanup even when registration is disabled", () => {
    expect(isInternalAuthDatabase({ ...source, NIUVA_INTERNAL_AUTH_ENABLED: "false" })).toBe(true);
    expect(isInternalAuthDatabase({ ...source, NODE_ENV: "production" })).toBe(false);
    expect(isInternalAuthDatabase({ ...source, DATABASE_URL: source.DATABASE_URL + "?host=remote.example.test" })).toBe(false);
    expect(isInternalAuthDatabase({ ...source, DATABASE_URL: source.DATABASE_URL + "?database=production" })).toBe(false);
    expect(isInternalAuthDatabase({ ...source, DATABASE_URL: source.DATABASE_URL + "?schema=public" })).toBe(true);
  });
  it("enforces method email and expiry at the exact boundary", () => {
    const config = getInternalAuthConfig(source)!;
    expect(() => assertInternalEmail("GOOGLE@example.test", "google", config)).not.toThrow();
    expect(() => assertInternalEmail("password@example.test", "google", config)).toThrow();
    const now = new Date("2026-10-02T00:00:00Z");
    expect(() => assertInternalAccountActive(now, now)).toThrow();
    expect(capInternalExpiry(new Date(now.getTime() + 1000), now)).toEqual(now);
  });
});
