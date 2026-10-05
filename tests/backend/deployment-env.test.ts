import { describe, expect, it } from "vitest";

import {
  DEPLOYMENT_TIERS,
  PROVIDER_MODES,
  hasActivationGrant,
  resolveDeploymentTier,
  type DeploymentTier,
} from "@/lib/env/deployment";
import {
  EnvironmentValidationError,
  parseServerEnvironment,
  resolveDeployment,
} from "@/lib/env/server";

const NODE_ENVS = ["development", "test", "production", undefined] as const;

function rejectedFields(source: Record<string, string | undefined>): readonly string[] {
  try {
    parseServerEnvironment(source);
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      return error.fields;
    }
    throw error;
  }
  return [];
}

describe("deployment tier and provider mode env", () => {
  it("accepts valid values and treats blank as unset", () => {
    expect(
      parseServerEnvironment({
        NIUVA_DEPLOYMENT_TIER: "staging",
        NIUVA_PROVIDER_MODE: "sandbox",
      }),
    ).toMatchObject({
      NIUVA_DEPLOYMENT_TIER: "staging",
      NIUVA_PROVIDER_MODE: "sandbox",
    });
    const blank = parseServerEnvironment({
      NIUVA_DEPLOYMENT_TIER: "  ",
      NIUVA_PROVIDER_MODE: "",
    });
    expect(blank.NIUVA_DEPLOYMENT_TIER).toBeUndefined();
    expect(blank.NIUVA_PROVIDER_MODE).toBeUndefined();
  });

  it("normalizes case and surrounding whitespace", () => {
    const parsed = parseServerEnvironment({
      NIUVA_DEPLOYMENT_TIER: " Production ",
      NIUVA_PROVIDER_MODE: "LIVE",
    });
    expect(parsed.NIUVA_DEPLOYMENT_TIER).toBe("production");
    expect(parsed.NIUVA_PROVIDER_MODE).toBe("live");
  });

  it("rejects malformed values with the field name", () => {
    expect(rejectedFields({ NIUVA_DEPLOYMENT_TIER: "prod" })).toEqual([
      "NIUVA_DEPLOYMENT_TIER",
    ]);
    expect(rejectedFields({ NIUVA_DEPLOYMENT_TIER: "local/test" })).toEqual([
      "NIUVA_DEPLOYMENT_TIER",
    ]);
    expect(rejectedFields({ NIUVA_PROVIDER_MODE: "production" })).toEqual([
      "NIUVA_PROVIDER_MODE",
    ]);
  });

  it("resolves unset values conservatively", () => {
    expect(resolveDeployment({ NODE_ENV: "production" })).toEqual({
      providerMode: "mock",
      tier: "production",
    });
    expect(resolveDeployment({ NODE_ENV: "test" }).tier).toBe("local-test");
    expect(resolveDeployment({ NODE_ENV: "development" }).tier).toBe("local-test");
    expect(resolveDeployment({}).tier).toBe("production");
  });

  it("never lets an explicit local-test tier lift NODE_ENV=production", () => {
    expect(
      resolveDeployment({
        NIUVA_DEPLOYMENT_TIER: "local-test",
        NODE_ENV: "production",
      }).tier,
    ).toBe("production");
  });

  it("does not widen permission: production NODE_ENV never resolves below staging, and no tier has an activation grant", () => {
    const rank: Record<DeploymentTier, number> = {
      "local-test": 0,
      production: 2,
      staging: 1,
    };

    for (const nodeEnv of NODE_ENVS) {
      for (const tier of [undefined, ...DEPLOYMENT_TIERS]) {
        const resolved = resolveDeploymentTier({ nodeEnv, tier });
        if (nodeEnv === "production") {
          expect(rank[resolved]).toBeGreaterThanOrEqual(rank.staging);
        }
        if (tier === undefined && (nodeEnv === "production" || nodeEnv === undefined)) {
          expect(resolved).toBe("production");
        }
      }
    }

    for (const tier of DEPLOYMENT_TIERS) {
      expect(hasActivationGrant(tier, "payment")).toBe(false);
      expect(hasActivationGrant(tier, "emailDelivery")).toBe(false);
    }
    expect(PROVIDER_MODES).toContain("live");
    expect(
      resolveDeployment({ NIUVA_PROVIDER_MODE: "live", NODE_ENV: "production" }),
    ).toEqual({ providerMode: "live", tier: "production" });
    expect(hasActivationGrant("production", "payment")).toBe(false);
  });
});
