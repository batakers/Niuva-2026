import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { GoogleConsentService, assertPublicGoogleConsent, type GoogleConsentRepositoryPort } from "@/modules/customer-auth/google-consent";
import { createCustomerOAuthState, hashOpaqueToken } from "@/modules/customer-auth/core";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { readApprovedCustomerPolicy } from "@/modules/customer-auth/public-policy-content";
import { getCustomerGoogleOAuthConfig } from "@/modules/customer-auth/google";

const now = new Date("2026-10-25T12:00:00Z");
const input = { consent: "on", ageDeclaration: "on", termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", returnTo: "/checkout?stage=fixture#summary" };
beforeEach(() => {
  for (const [key, value] of Object.entries({ NODE_ENV: "test", NIUVA_CUSTOMER_AUTH_MOCK: "true", NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "true", DATABASE_URL: "postgresql://fixture@127.0.0.1/niuva_public_test", APP_URL: "http://127.0.0.1:3000", NIUVA_INTERNAL_AUTH_ENABLED: "false", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock" })) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
const googleConfigFixture = {
  NODE_ENV: "test", NIUVA_CUSTOMER_AUTH_MOCK: "true", NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "true",
  DATABASE_URL: "postgresql://fixture@127.0.0.1/niuva_public_test", APP_URL: "http://127.0.0.1:3000",
  NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock",
  GOOGLE_CLIENT_ID: "synthetic-google-client", GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
  GOOGLE_REDIRECT_URI: "http://127.0.0.1:3000/api/auth/google/callback",
};

describe("public Google fixture callback boundary", () => {
  it("accepts only the configured loopback callback without activating a provider", () => {
    expect(getCustomerGoogleOAuthConfig(googleConfigFixture).redirectUri).toBe(googleConfigFixture.GOOGLE_REDIRECT_URI);
  });
  it.each([
    "https://accounts.google.com/api/auth/google/callback",
    "http://localhost:3000/api/auth/google/callback",
    "http://127.0.0.1:3000/other-callback",
    "http://127.0.0.1:3000/api/auth/google/callback?forward=1",
  ])("rejects a public fixture redirect outside the canonical callback: %s", redirectUri => {
    expect(() => getCustomerGoogleOAuthConfig({ ...googleConfigFixture, GOOGLE_REDIRECT_URI: redirectUri })).toThrow();
  });
});

function repository() {
  const issue = vi.fn<GoogleConsentRepositoryPort["issue"]>().mockResolvedValue();
  const bind = vi.fn<GoogleConsentRepositoryPort["bind"]>().mockResolvedValue();
  return { issue, bind };
}

describe("public Google consent service", () => {
  it("records canonical consent/age and server time, storing only a hash of the browser proof", async () => {
    const repo = repository();
    const token = await new GoogleConsentService(repo).accept({ ...input, ageDeclaredAt: "2099-01-01", ageDeclarationVersion: "FORGED", acceptedAt: "2099-01-01" }, now);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(repo.issue).toHaveBeenCalledWith({
      tokenHash: hashOpaqueToken(token), returnTo: input.returnTo, termsVersion: input.termsVersion, privacyVersion: input.privacyVersion,
      acceptedAt: now, ageDeclaredAt: now, ageDeclarationVersion: AGE_DECLARATION_VERSION, expiresAt: new Date(now.getTime() + 600000),
    });
    expect(JSON.stringify(repo.issue.mock.calls)).not.toContain(token);
  });
  it.each([undefined, "off", "false", true, false])("refuses non-explicit age input %j before storing anything", async ageDeclaration => {
    const repo = repository();
    await expect(new GoogleConsentService(repo).accept({ ...input, ageDeclaration }, now)).rejects.toThrow();
    expect(repo.issue).not.toHaveBeenCalled();
  });
  it.each([{ consent: undefined }, { termsVersion: "DRAFT-TERMS-v6" }, { privacyVersion: "TEST-FIXTURE-PRIVACY-1" }, { termsVersion: undefined }])("requires current presented policies and independent consent: %j", async change => {
    const repo = repository();
    await expect(new GoogleConsentService(repo).accept({ ...input, ...change }, now)).rejects.toThrow();
    expect(repo.issue).not.toHaveBeenCalled();
  });
  it.each(["production", "development"])("cannot enable public signup by setting fixture flags in %s", async environment => {
    vi.stubEnv("NODE_ENV", environment);
    const repo = repository();
    await expect(new GoogleConsentService(repo).accept(input, now)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(repo.issue).not.toHaveBeenCalled();
  });
  it("binds only an opaque proof hash and a safe destination", async () => {
    const repo = repository();
    const service = new GoogleConsentService(repo);
    const token = await service.accept(input, now);
    const state = createCustomerOAuthState(now.getTime());
    await service.bind(token, state, input.returnTo, now);
    expect(repo.bind).toHaveBeenCalledWith(hashOpaqueToken(token), state, input.returnTo, now);
  });
  it("rejects proof expiry, replay, missing consent, stale policy, swapped flow and destination", () => {
    const state = createCustomerOAuthState(now.getTime());
    const registration = { consentToken: "p".repeat(43), state, returnTo: input.returnTo };
    const proof = { tokenHash: hashOpaqueToken(registration.consentToken), oauthStateHash: hashOpaqueToken(state), returnTo: input.returnTo,
      termsVersion: input.termsVersion, privacyVersion: input.privacyVersion, acceptedAt: now, ageDeclaredAt: now,
      ageDeclarationVersion: AGE_DECLARATION_VERSION, expiresAt: new Date(now.getTime() + 600000), consumedAt: null };
    expect(() => assertPublicGoogleConsent(proof, now, registration)).not.toThrow();
    expect(() => assertPublicGoogleConsent(null, now, registration)).toThrow();
    for (const change of [{ consumedAt: now }, { expiresAt: now }, { termsVersion: "STALE" },
      { acceptedAt: new Date(now.getTime() + 1) }, { ageDeclarationVersion: "OLD" }, { ageDeclaredAt: new Date(now.getTime() + 1) },
      { oauthStateHash: hashOpaqueToken(createCustomerOAuthState(now.getTime())) }, { oauthStateHash: null }, { returnTo: "/account" }]) {
      expect(() => assertPublicGoogleConsent({ ...proof, ...change }, now, registration)).toThrow();
    }
    expect(() => assertPublicGoogleConsent(proof, new Date(now.getTime() + 600001), registration)).toThrow();
    vi.stubEnv("NIUVA_CUSTOMER_PUBLIC_AUTH_TEST", "false");
    expect(() => assertPublicGoogleConsent(proof, now, registration)).toThrow();
  });
  it.each(["terms", "privacy"] as const)("keeps the approved %s content addressable independently of future draft revisions", async document => {
    const snapshot = await readApprovedCustomerPolicy(document);
    // Owner-approved public text, 28 October 2026 (TASKS.md).
    const approvedChecksums = { terms: "33bfd51aca55983c70bcfa1975700f35366761be898c1ecbb19f69f7a2f12635", privacy: "ffba93ca18a34af1f4aefd3021f9f8c157571133bbfab704da36677ab355f68c" };
    expect(createHash("sha256").update(snapshot).digest("hex")).toBe(approvedChecksums[document]);
  });
});
