import { describe, expect, it } from "vitest";
import {
  getServerActionsAllowedOrigins,
  getServerActionsOrigins,
  getServerActionsOriginsWarning,
} from "@/lib/env/server-actions-origins";

const local = { NIUVA_DEPLOYMENT_TIER: "local-test" };
const staging = { NIUVA_DEPLOYMENT_TIER: "staging" };
const production = { NIUVA_DEPLOYMENT_TIER: "production" };

describe("serverActions.allowedOrigins from tier origin", () => {
  it("returns only host[:port] of a valid APP_URL per tier", () => {
    expect(getServerActionsAllowedOrigins({ ...local, APP_URL: "http://localhost:3000" })).toEqual(["localhost:3000"]);
    expect(getServerActionsAllowedOrigins({ ...staging, APP_URL: "https://Staging.Niuva.example/" })).toEqual(["staging.niuva.example"]);
    expect(getServerActionsAllowedOrigins({ ...production, APP_URL: "https://niuva.example:8443" })).toEqual(["niuva.example:8443"]);
  });

  it("falls back to an empty list for missing or invalid APP_URL without throwing", () => {
    for (const env of [local, staging, production]) {
      expect(getServerActionsAllowedOrigins(env)).toEqual([]);
      expect(getServerActionsAllowedOrigins({ ...env, APP_URL: "   " })).toEqual([]);
      expect(getServerActionsAllowedOrigins({ ...env, APP_URL: "https://*.niuva.example" })).toEqual([]);
      expect(getServerActionsAllowedOrigins({ ...env, APP_URL: "not a url" })).toEqual([]);
    }
    expect(getServerActionsAllowedOrigins({ ...production, APP_URL: "http://niuva.example" })).toEqual([]);
    expect(getServerActionsAllowedOrigins({ ...staging, APP_URL: "http://localhost:3000" })).toEqual([]);
  });

  it("never emits a wildcard and is deterministic", () => {
    const env = { ...production, APP_URL: "https://niuva.example" };

    expect(getServerActionsAllowedOrigins(env)).toEqual(getServerActionsAllowedOrigins(env));
    expect(getServerActionsAllowedOrigins({ ...production, APP_URL: "https://**.niuva.example" }).join()).not.toContain("*");
  });

  it("fails closed on an unknown or lifted tier", () => {
    expect(getServerActionsOrigins({ APP_URL: "http://localhost:3000", NODE_ENV: "production" }).tier).toBe("production");
    expect(getServerActionsAllowedOrigins({ APP_URL: "http://localhost:3000", NIUVA_DEPLOYMENT_TIER: "bogus", NODE_ENV: "production" })).toEqual([]);
    expect(getServerActionsAllowedOrigins({ APP_URL: "http://localhost:3000", NIUVA_DEPLOYMENT_TIER: "local-test", NODE_ENV: "production" })).toEqual([]);
  });

  it("warns by name and reason only for staging/production, never for local-test", () => {
    expect(getServerActionsOriginsWarning(local)).toBeNull();
    expect(getServerActionsOriginsWarning({ ...staging, APP_URL: "https://staging.niuva.example" })).toBeNull();

    const warning = getServerActionsOriginsWarning({ ...production, APP_URL: "http://secret-host.example" });

    expect(warning).toContain("APP_URL");
    expect(warning).toContain("insecure-scheme");
    expect(warning).not.toContain("secret-host");
    expect(getServerActionsOriginsWarning(production)).toContain("missing");
  });
});
