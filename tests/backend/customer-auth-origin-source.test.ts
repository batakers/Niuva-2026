import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildCustomerAuthLink,
  customerCookieSecure,
  isGoogleRedirectUriAllowed,
  resolveCustomerAppOrigin,
} from "@/modules/customer-auth/app-origin";
import { getCustomerGoogleOAuthConfig } from "@/modules/customer-auth/google";

const GOOGLE = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };

describe("Customer auth origin source (task 7.18)", () => {
  it("resolves canonical origin per tier and rejects invalid values", () => {
    expect(resolveCustomerAppOrigin({ NODE_ENV: "development", APP_URL: "http://localhost:3000" })).toMatchObject({ ok: true, origin: "http://localhost:3000" });
    expect(resolveCustomerAppOrigin({ NODE_ENV: "test", APP_URL: "http://[::1]:3000" })).toMatchObject({ ok: true });
    expect(resolveCustomerAppOrigin({ NODE_ENV: "production", APP_URL: "https://Niuva.example.com/" })).toEqual({ ok: true, origin: "https://niuva.example.com", allowedOrigins: ["niuva.example.com"] });
    expect(resolveCustomerAppOrigin({ NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "staging", APP_URL: "https://staging.niuva.example.com" }).ok).toBe(true);
    expect(resolveCustomerAppOrigin({ NODE_ENV: "production", APP_URL: "http://niuva.example.com" }).ok).toBe(false);
    expect(resolveCustomerAppOrigin({ NODE_ENV: "production", APP_URL: "http://localhost:3000" }).ok).toBe(false);
    expect(resolveCustomerAppOrigin({ NODE_ENV: "production" }).ok).toBe(false);
    expect(resolveCustomerAppOrigin({ NODE_ENV: "development", APP_URL: "http://192.168.1.5:3000" }).ok).toBe(false);
  });

  it("does not read process.env implicitly", () => {
    const previous = process.env.APP_URL;
    process.env.APP_URL = "https://leak.example.com";
    try {
      expect(resolveCustomerAppOrigin({ NODE_ENV: "production" })).toEqual({ ok: false, reason: "missing" });
      expect(customerCookieSecure({ NODE_ENV: "development" })).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previous;
    }
    expect(readFileSync(join(process.cwd(), "src/modules/customer-auth/app-origin.ts"), "utf8")).not.toContain("process.env");
  });

  it("keeps loopback dev cookies non-Secure and only gets stricter elsewhere", () => {
    expect(customerCookieSecure({ NODE_ENV: "development", APP_URL: "http://127.0.0.1:3000" })).toBe(false);
    expect(customerCookieSecure({ NODE_ENV: "test" })).toBe(false);
    expect(customerCookieSecure({ NODE_ENV: "production" })).toBe(true);
    expect(customerCookieSecure({ NODE_ENV: "development", NIUVA_DEPLOYMENT_TIER: "staging" })).toBe(true);
    expect(customerCookieSecure({ NODE_ENV: "development", APP_URL: "https://localhost:3000" })).toBe(true);
    expect(customerCookieSecure({})).toBe(true);
  });

  it("requires the Google redirect URI on the canonical origin for hosted tiers only", () => {
    const hosted = { NODE_ENV: "production", APP_URL: "https://niuva.example.com" };
    expect(isGoogleRedirectUriAllowed(hosted, "https://niuva.example.com/api/auth/google/callback")).toBe(true);
    expect(isGoogleRedirectUriAllowed(hosted, "https://evil.example.com/api/auth/google/callback")).toBe(false);
    expect(isGoogleRedirectUriAllowed({ NODE_ENV: "production" }, "https://niuva.example.com/cb")).toBe(false);
    expect(isGoogleRedirectUriAllowed({ NODE_ENV: "development" }, "http://localhost:3000/cb")).toBe(true);
    expect(() => getCustomerGoogleOAuthConfig({ ...hosted, ...GOOGLE, GOOGLE_REDIRECT_URI: "https://evil.example.com/cb" })).toThrow();
    expect(getCustomerGoogleOAuthConfig({ ...hosted, ...GOOGLE, GOOGLE_REDIRECT_URI: "https://niuva.example.com/cb" }).redirectUri).toBe("https://niuva.example.com/cb");
  });

  it("builds links only on the canonical origin and emits none for an invalid origin", () => {
    const prod = { NODE_ENV: "production", APP_URL: "https://Niuva.example.com" };
    const link = buildCustomerAuthLink(prod, "verify", "tok");
    const canonical = resolveCustomerAppOrigin(prod);
    expect(canonical.ok && link?.origin === canonical.origin).toBe(true);
    expect(link?.href).toBe("https://niuva.example.com/verify-email?token=tok");
    expect(buildCustomerAuthLink({ NODE_ENV: "development", APP_URL: "http://127.0.0.1:3000" }, "reset", "t")?.href).toBe("http://127.0.0.1:3000/reset-password?token=t");
    expect(buildCustomerAuthLink({ NODE_ENV: "production", APP_URL: "http://niuva.example.com" }, "verify", "t")).toBeNull();
    expect(buildCustomerAuthLink({ NODE_ENV: "production" }, "reset", "t")).toBeNull();
  });
});
