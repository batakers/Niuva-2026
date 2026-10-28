import { afterEach, describe, expect, it, vi } from "vitest";
import { getCustomerAuthLegalDocuments, assertCustomerPolicyAcceptance, assertPresentedPolicyVersions } from "@/modules/customer-auth/legal";
import { isCustomerPublicAuthTestRuntime } from "@/modules/customer-auth/email-test-runtime";
import { PUBLIC_CUSTOMER_POLICY } from "@/modules/customer-auth/public-policy";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";

const fixture = {
  NODE_ENV: "test", NIUVA_CUSTOMER_AUTH_MOCK: "true", NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "true",
  DATABASE_URL: "postgresql://fixture@127.0.0.1:55439/niuva_public_test", APP_URL: "http://127.0.0.1:3000",
};
afterEach(() => vi.unstubAllEnvs());

describe("public Customer consent contract", () => {
  it("requires an explicit isolated local fixture and never grants hosted signup", () => {
    expect(isCustomerPublicAuthTestRuntime(fixture)).toBe(true);
    for (const change of [
      { NODE_ENV: "development" }, { NODE_ENV: "production" }, { NIUVA_CUSTOMER_AUTH_MOCK: "false" },
      { NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "false" }, { DATABASE_URL: "postgresql://fixture@remote.test/niuva_public_test" },
      { DATABASE_URL: "postgresql://fixture@127.0.0.1/niuva_dev" }, { APP_URL: "https://hosted.example.test" },
      { NIUVA_DEPLOYMENT_TIER: "staging" }, { NIUVA_PROVIDER_MODE: "live" }, { NIUVA_INTERNAL_AUTH_ENABLED: "true" },
      { DATABASE_URL: "postgresql://fixture@127.0.0.1/niuva_public_test?host=remote.test" },
    ]) expect(isCustomerPublicAuthTestRuntime({ ...fixture, ...change })).toBe(false);
  });
  it("uses Owner-approved versions only in the public fixture and preserves legacy test separation", () => {
    for (const [key, value] of Object.entries(fixture)) vi.stubEnv(key, value);
    const legal = getCustomerAuthLegalDocuments();
    expect(legal?.terms.version).toBe("NIUVA-TERMS-v1.0");
    expect(legal?.privacy.version).toBe("NIUVA-PRIVACY-v1.0");
    expect(PUBLIC_CUSTOMER_POLICY.publishedAt).toBe("2026-10-28T00:00:00+07:00");
    vi.stubEnv("NIUVA_CUSTOMER_PUBLIC_AUTH_TEST", "false");
    expect(getCustomerAuthLegalDocuments()?.terms.version).toBe("TEST-FIXTURE-TERMS-1");
    vi.stubEnv("NODE_ENV", "production");
    expect(getCustomerAuthLegalDocuments()).toBeNull();
  });
  it("rejects missing, stale or mixed presented versions without accepting client authority", () => {
    for (const [key, value] of Object.entries(fixture)) vi.stubEnv(key, value);
    const legal = getCustomerAuthLegalDocuments()!;
    expect(() => assertPresentedPolicyVersions({ termsVersion: legal.terms.version, privacyVersion: legal.privacy.version }, legal)).not.toThrow();
    for (const presented of [{}, { termsVersion: "DRAFT-TERMS-v6", privacyVersion: legal.privacy.version },
      { termsVersion: legal.terms.version, privacyVersion: "INTERNAL-PRIVACY-2026-10-02-v1" }]) {
      expect(() => assertPresentedPolicyVersions(presented, legal)).toThrow();
    }
  });
  it("rechecks policy, age and server time independently when consuming a registration", () => {
    for (const [key, value] of Object.entries(fixture)) vi.stubEnv(key, value);
    const now = new Date("2026-10-25T12:00:00Z");
    const record = { termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", acceptedAt: now,
      ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now };
    expect(() => assertCustomerPolicyAcceptance(record, now, false)).not.toThrow();
    for (const change of [{ termsVersion: "NIUVA-TERMS-v0.9" }, { privacyVersion: "DRAFT-PRIVACY-v7" },
      { acceptedAt: new Date(now.getTime() + 1) }, { ageDeclaredAt: null }, { ageDeclarationVersion: "OLD" }]) {
      expect(() => assertCustomerPolicyAcceptance({ ...record, ...change }, now, false)).toThrow();
    }
    expect(() => assertCustomerPolicyAcceptance(record, now, true)).toThrow();
    vi.stubEnv("NIUVA_CUSTOMER_PUBLIC_AUTH_TEST", "false");
    expect(() => assertCustomerPolicyAcceptance(record, now, false)).toThrow();
  });
});
