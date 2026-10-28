import { describe, expect, it } from "vitest";

import {
  assertStagingOwnerBootstrapEnvironment,
  parseStagingOwnerBootstrapInput,
  STAGING_OWNER_CONFIRMATION,
} from "@/modules/admin/staging-owner-bootstrap";

const bindingId = "07000000-0000-4000-8000-000000000009";
const environment = {
  NIUVA_DEPLOYMENT_TIER: "staging",
  NIUVA_PROVIDER_MODE: "sandbox",
  DATABASE_URL: "postgresql://runtime:fixture@db.example.test/niuva_staging?sslmode=verify-full",
  NIUVA_DATABASE_BINDING_ID: bindingId,
};
const input = {
  ADMIN_AUTH_EMAIL: " Owner@Example.Test ",
  ADMIN_AUTH_PASSWORD: "Test-only-29!",
  ADMIN_PROFILE_DISPLAY_NAME: "Owner Staging",
  ADMIN_PROFILE_CONFIRMATION: STAGING_OWNER_CONFIRMATION,
};

describe("staging Owner bootstrap guards", () => {
  it("accepts only an explicit staging tier with verify-full TLS and a binding ID", () => {
    expect(assertStagingOwnerBootstrapEnvironment(environment)).toEqual({ tier: "staging", bindingId });
    expect(assertStagingOwnerBootstrapEnvironment({ ...environment, NODE_ENV: "production" })).toEqual({ tier: "staging", bindingId });
    for (const [change, reason] of [
      [{ NIUVA_DEPLOYMENT_TIER: undefined }, "NOT_STAGING"],
      [{ NIUVA_DEPLOYMENT_TIER: "production" }, "NOT_STAGING"],
      [{ NIUVA_DEPLOYMENT_TIER: "local-test" }, "NOT_STAGING"],
      [{ NIUVA_PROVIDER_MODE: "bogus" }, "NOT_STAGING"],
      [{ DATABASE_URL: "postgresql://runtime:fixture@db.example.test/niuva_staging" }, "DATABASE_TLS_REQUIRED"],
      [{ DATABASE_URL: "postgresql://runtime:fixture@db.example.test/niuva_staging?sslmode=require" }, "DATABASE_TLS_REQUIRED"],
      [{ DATABASE_URL: "not a url" }, "DATABASE_TLS_REQUIRED"],
      [{ NIUVA_DATABASE_BINDING_ID: "" }, "BINDING_CONFIG_INVALID"],
    ] as const) {
      expect(() => assertStagingOwnerBootstrapEnvironment({ ...environment, ...change }), JSON.stringify(change)).toThrow(expect.objectContaining({ reason }));
    }
  });

  it("requires a valid Owner identity, an 8-15 character password and the staging confirmation", () => {
    expect(parseStagingOwnerBootstrapInput(input)).toEqual({ email: "owner@example.test", password: "Test-only-29!", displayName: "Owner Staging", confirmation: STAGING_OWNER_CONFIRMATION });
    for (const change of [
      { ADMIN_AUTH_EMAIL: "not-an-email" },
      { ADMIN_AUTH_PASSWORD: "short" },
      { ADMIN_AUTH_PASSWORD: "a".repeat(16) },
      { ADMIN_PROFILE_DISPLAY_NAME: " " },
      { ADMIN_PROFILE_CONFIRMATION: "I_UNDERSTAND_NON_PRODUCTION" },
    ]) {
      expect(() => parseStagingOwnerBootstrapInput({ ...input, ...change }), JSON.stringify(change)).toThrow(expect.objectContaining({ reason: "INPUT_INVALID" }));
    }
  });

  it("never echoes the password in its error", () => {
    try {
      parseStagingOwnerBootstrapInput({ ...input, ADMIN_PROFILE_CONFIRMATION: "no" });
    } catch (error) {
      expect(String(error)).not.toContain("Test-only-29!");
    }
  });
});
