import { describe, expect, it } from "vitest";

import { resolvePublicContentSource } from "@/modules/portfolio/public-source";

const nodeEnvs = ["development", "test", "production", undefined] as const;

function ctx(env: Record<string, string | undefined>) {
  return { env };
}

describe("resolvePublicContentSource", () => {
  it("selects the fixture scenario only for a known scenario in local-test", () => {
    const env = ctx({ NIUVA_DEPLOYMENT_TIER: "local-test", NODE_ENV: "development" });

    expect(resolvePublicContentSource("examples", env)).toBe("scenarioFixture");
    expect(resolvePublicContentSource("unknown", env)).toBe("localReference");
    expect(resolvePublicContentSource(["examples"], env)).toBe("localReference");
    expect(resolvePublicContentSource(undefined, env)).toBe("localReference");
  });

  it.each(["staging", "production"])("uses the database in the %s tier", (tier) => {
    const env = ctx({ NIUVA_DEPLOYMENT_TIER: tier, NODE_ENV: "development" });

    expect(resolvePublicContentSource("examples", env)).toBe("database");
    expect(resolvePublicContentSource(undefined, env)).toBe("database");
  });

  it("never leaves the database path when NODE_ENV is production", () => {
    for (const tier of ["local-test", "staging", "production", undefined]) {
      const env = ctx({ NIUVA_DEPLOYMENT_TIER: tier, NODE_ENV: "production" });

      expect(resolvePublicContentSource("examples", env)).toBe("database");
      expect(resolvePublicContentSource(undefined, env)).toBe("database");
    }
  });

  it("does not change when only NODE_ENV changes under an explicit tier", () => {
    for (const tier of ["staging", "production"]) {
      const results = nodeEnvs.map((nodeEnv) =>
        resolvePublicContentSource("examples", ctx({ NIUVA_DEPLOYMENT_TIER: tier, NODE_ENV: nodeEnv })),
      );

      expect(new Set(results)).toEqual(new Set(["database"]));
    }
  });

  it("fails closed to the database when the deployment env is unreadable", () => {
    const env = ctx({ NIUVA_DEPLOYMENT_TIER: "not-a-tier", NODE_ENV: "development" });

    expect(resolvePublicContentSource("examples", env)).toBe("database");
  });
});
