import { describe, expect, it } from "vitest";

import {
  getCustomerGoogleOAuthConfig,
  validateGoogleIdTokenPayload,
} from "@/modules/customer-auth/google";

const config = {
  clientId: "google-client-id",
  clientSecret: "google-client-secret",
  redirectUri: "http://localhost:3000/api/auth/google/callback",
} as const;

const validClaims = {
  aud: config.clientId,
  email: "customer@example.com",
  email_verified: true,
  exp: 2_000_000_000,
  iss: "https://accounts.google.com",
  sub: "google-sub-123",
};

describe("customer Google OAuth boundary", () => {
  it("requires the complete Google capability group", () => {
    expect(() => getCustomerGoogleOAuthConfig({})).toThrow();
    expect(() =>
      getCustomerGoogleOAuthConfig({
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow();
    expect(getCustomerGoogleOAuthConfig({
      GOOGLE_CLIENT_ID: config.clientId,
      GOOGLE_CLIENT_SECRET: config.clientSecret,
      GOOGLE_REDIRECT_URI: config.redirectUri,
    })).toEqual(config);
  });

  it("validates issuer, audience, expiry, and verified email claims", () => {
    expect(validateGoogleIdTokenPayload(validClaims, config, () => 1_900_000_000_000).googleSubject).toBe("google-sub-123");
    expect(() => validateGoogleIdTokenPayload({ ...validClaims, iss: "https://evil.example" }, config, () => 1_900_000_000_000)).toThrow();
    expect(() => validateGoogleIdTokenPayload({ ...validClaims, aud: "another-client" }, config, () => 1_900_000_000_000)).toThrow();
    expect(() => validateGoogleIdTokenPayload({ ...validClaims, exp: 1_800_000_000 }, config, () => 1_900_000_000_000)).toThrow();
    expect(() => validateGoogleIdTokenPayload({ ...validClaims, email_verified: false }, config, () => 1_900_000_000_000)).toThrow();
  });
});
