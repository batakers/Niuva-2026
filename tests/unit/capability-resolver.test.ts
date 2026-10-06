import { describe, expect, it } from "vitest";

import { CAPABILITY_MATRIX } from "@/modules/capabilities/matrix";
import {
  DEFAULT_POLICY_GATE_READER,
  decide,
  requireAllowed,
  type CapabilityContext,
  type PolicyGateReader,
} from "@/modules/capabilities/resolver";
import {
  CAPABILITY_NAMES,
  DEPLOYMENT_TIERS,
  PROVIDER_MODES,
  type CapabilityName,
  type DeploymentTier,
  type ProviderMode,
} from "@/modules/capabilities/types";
import { AppError } from "@/modules/shared/errors";

const SECRET = "s3cr3t-value-do-not-leak";

const FULL_CONFIG: Record<string, string> = {
  BITESHIP_API_KEY: SECRET,
  BITESHIP_COURIERS: "jne",
  BITESHIP_ORIGIN_AREA_ID: "area-1",
  CLERK_SECRET_KEY: SECRET,
  DATABASE_URL: `postgresql://user:${SECRET}@localhost:5432/db`,
  EMAIL_FROM: "noreply@example.test",
  GOOGLE_CLIENT_ID: "gid",
  GOOGLE_CLIENT_SECRET: SECRET,
  GOOGLE_REDIRECT_URI: "http://localhost:3000/cb",
  MIDTRANS_IS_PRODUCTION: "false",
  MIDTRANS_SERVER_KEY: SECRET,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk",
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "ck",
  R2_ACCESS_KEY_ID: "ak",
  R2_ACCOUNT_ID: "acc",
  R2_ENDPOINT: "http://localhost:9000",
  R2_PRIVATE_BUCKET: "priv",
  R2_PUBLIC_BUCKET: "pub",
  R2_SECRET_ACCESS_KEY: SECRET,
  RESEND_API_KEY: SECRET,
};

function env(
  tier: DeploymentTier,
  mode: ProviderMode,
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    ...FULL_CONFIG,
    NIUVA_DEPLOYMENT_TIER: tier,
    NIUVA_PROVIDER_MODE: mode,
    NODE_ENV: "test",
    ...overrides,
  };
}

const OPEN_GATES: PolicyGateReader = { getStatus: () => ({ closed: true }) };

function open(
  tier: DeploymentTier,
  mode: ProviderMode,
  overrides: Record<string, string | undefined> = {},
): CapabilityContext {
  return {
    env: env(tier, mode, overrides),
    gates: OPEN_GATES,
    hasActivationGrant: () => true,
  };
}

describe("capability resolver: tier x mode x capability", () => {
  const cases = DEPLOYMENT_TIERS.flatMap((tier) =>
    PROVIDER_MODES.flatMap((mode) =>
      CAPABILITY_NAMES.map((capability) => ({ capability, mode, tier })),
    ),
  );

  it.each(cases)(
    "$tier/$mode/$capability: allowed only when the matrix permits the mode (all else satisfied)",
    ({ capability, mode, tier }) => {
      const decision = decide(capability, open(tier, mode));
      const permitted = CAPABILITY_MATRIX[tier][capability].allowedModes.includes(mode);

      expect(decision.allowed).toBe(permitted);

      if (decision.allowed) {
        expect(decision).toEqual({ allowed: true, mode, tier });
      } else {
        expect(decision.reason).toBe("TIER_NOT_ALLOWED");
      }
    },
  );

  it("never allows anything in production, even with everything satisfied", () => {
    for (const mode of PROVIDER_MODES) {
      for (const capability of CAPABILITY_NAMES) {
        expect(decide(capability, open("production", mode)).allowed).toBe(false);
      }
    }
  });

  it("NODE_ENV=production cannot be lifted by a local-test tier variable", () => {
    for (const capability of CAPABILITY_NAMES) {
      const context = open("local-test", "mock", { NODE_ENV: "production" });

      expect(decide(capability, context).allowed).toBe(false);
    }
  });

  it("with default gates and recorded grants, only gate-free, grant-free local-test capabilities pass", () => {
    for (const tier of DEPLOYMENT_TIERS) {
      for (const capability of CAPABILITY_NAMES) {
        const rule = CAPABILITY_MATRIX[tier][capability];
        const decision = decide(capability, { env: env(tier, "mock") });
        const expected =
          rule.allowedModes.includes("mock") &&
          rule.requiredPolicyGates.length === 0 &&
          !rule.requiresActivationGrant;

        expect(decision.allowed).toBe(expected);
        expect(tier === "production" && decision.allowed).toBe(false);
        expect(capability === "signup" && decision.allowed).toBe(false);
      }
    }
  });

  it("closes only the implemented age control while retaining policy and guardian denials", () => {
    expect(DEFAULT_POLICY_GATE_READER.getStatus("PUB-POLICY")).toEqual({ closed: false });
    expect(DEFAULT_POLICY_GATE_READER.getStatus("PUB-AGE")).toEqual({ closed: true });
    expect(DEFAULT_POLICY_GATE_READER.getStatus("PUB-GUARDIAN")).toEqual({ closed: false });
  });
});

describe("capability resolver: denial reasons and precedence", () => {
  const reasonOf = (capability: CapabilityName, context: CapabilityContext): string => {
    const decision = decide(capability, context);

    return decision.allowed ? "ALLOWED" : decision.reason;
  };

  it("TIER_NOT_ALLOWED for live mode and for unknown capability", () => {
    expect(reasonOf("shipping", open("local-test", "live"))).toBe("TIER_NOT_ALLOWED");
    expect(reasonOf("nope" as CapabilityName, open("local-test", "mock"))).toBe(
      "TIER_NOT_ALLOWED",
    );
  });

  it("RESOURCE_NOT_BOUND when DATABASE_URL is missing", () => {
    const context = open("local-test", "mock", { DATABASE_URL: undefined });

    expect(reasonOf("scheduledJobs", context)).toBe("RESOURCE_NOT_BOUND");
  });

  it("CONFIG_INCOMPLETE when a config group is absent or partial", () => {
    const absent = open("local-test", "mock", {
      BITESHIP_API_KEY: undefined,
      BITESHIP_COURIERS: undefined,
      BITESHIP_ORIGIN_AREA_ID: undefined,
    });
    const partial = open("local-test", "mock", { BITESHIP_API_KEY: undefined });

    expect(reasonOf("shipping", absent)).toBe("CONFIG_INCOMPLETE");
    expect(reasonOf("shipping", partial)).toBe("CONFIG_INCOMPLETE");
  });

  it("nothing is allowed when the relevant configuration is incomplete", () => {
    const noConfig = { DATABASE_URL: undefined } as const;

    for (const capability of CAPABILITY_NAMES) {
      const rule = CAPABILITY_MATRIX["local-test"][capability];
      const needs = rule.requiredConfig.length + rule.requiredResources.length;
      const context = open("local-test", "mock", {
        ...noConfig,
        R2_ACCOUNT_ID: undefined,
        RESEND_API_KEY: undefined,
        EMAIL_FROM: undefined,
        MIDTRANS_SERVER_KEY: undefined,
        MIDTRANS_IS_PRODUCTION: undefined,
        NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: undefined,
      });

      if (needs > 0) {
        expect(decide(capability, context).allowed).toBe(false);
      }
    }
  });

  it("POLICY_NOT_PUBLISHED when PUB-POLICY is open in staging and production tiers", () => {
    for (const tier of ["staging", "production"] as const) {
      const context: CapabilityContext = {
        ...open(tier, "mock"),
        gates: { getStatus: () => ({ closed: false }) },
      };
      const rule = CAPABILITY_MATRIX[tier].payment;

      expect(rule.requiredPolicyGates).toContain("PUB-POLICY");

      // production allows no mode, so TIER_NOT_ALLOWED outranks the gate there.
      expect(reasonOf("payment", context)).toBe(
        tier === "staging" ? "POLICY_NOT_PUBLISHED" : "TIER_NOT_ALLOWED",
      );
    }
  });

  it("local-test capabilities are not blocked by policy gates, only by config/resources", () => {
    const closedGates: CapabilityContext = {
      ...open("local-test", "mock"),
      gates: DEFAULT_POLICY_GATE_READER,
    };

    for (const capability of ["payment", "refund", "analytics", "privacyRights", "privacyProof", "googleAuth", "passwordAuth"] as const) {
      expect(reasonOf(capability, closedGates)).toBe("ALLOWED");
    }

    const noMidtrans = {
      ...closedGates,
      env: env("local-test", "mock", { MIDTRANS_SERVER_KEY: undefined }),
    };

    expect(reasonOf("payment", noMidtrans)).toBe("CONFIG_INCOMPLETE");
    expect(reasonOf("refund", noMidtrans)).toBe("CONFIG_INCOMPLETE");
    expect(
      reasonOf("privacyRights", {
        ...closedGates,
        env: env("local-test", "mock", { DATABASE_URL: undefined }),
      }),
    ).toBe("RESOURCE_NOT_BOUND");
  });

  it("signup is denied in every tier and mode with default gates and grants", () => {
    for (const tier of DEPLOYMENT_TIERS) {
      for (const mode of PROVIDER_MODES) {
        expect(decide("signup", { env: env(tier, mode) }).allowed).toBe(false);
      }
    }

    // Even with gates closed, local-test signup needs an activation grant.
    expect(
      reasonOf("signup", {
        env: env("local-test", "mock"),
        gates: OPEN_GATES,
      }),
    ).toBe("ACTIVATION_NOT_GRANTED");
  });

  it("signup is denied while gates are unresolved in staging, policy first, then age", () => {
    const base = open("staging", "mock");
    const policyOnly: PolicyGateReader = {
      getStatus: (gate) => ({ closed: gate === "PUB-POLICY" }),
    };

    expect(reasonOf("signup", { ...base, gates: DEFAULT_POLICY_GATE_READER })).toBe(
      "POLICY_NOT_PUBLISHED",
    );
    expect(reasonOf("signup", { ...base, gates: policyOnly })).toBe("AGE_GATE_NOT_CLOSED");
    expect(reasonOf("signup", { env: base.env })).not.toBe("ALLOWED");
  });

  it("ACTIVATION_NOT_GRANTED is last: all else satisfied but no grant", () => {
    const context: CapabilityContext = {
      ...open("staging", "mock"),
      hasActivationGrant: () => false,
    };

    expect(reasonOf("shipping", context)).toBe("ACTIVATION_NOT_GRANTED");
  });

  it("precedence is stable when several conditions fail at once", () => {
    const multi: CapabilityContext = {
      env: env("staging", "mock", { DATABASE_URL: undefined }),
      gates: DEFAULT_POLICY_GATE_READER,
      hasActivationGrant: () => false,
    };

    // resource binding outranks config, policy, and activation.
    expect(reasonOf("payment", multi)).toBe("RESOURCE_NOT_BOUND");
    // tier/mode outranks everything else.
    expect(reasonOf("payment", { ...multi, env: env("production", "live") })).toBe(
      "TIER_NOT_ALLOWED",
    );
    // config outranks policy and activation (resource bound).
    const configOnly: CapabilityContext = {
      ...multi,
      env: env("staging", "mock", { BITESHIP_API_KEY: undefined }),
    };

    expect(reasonOf("shipping", configOnly)).toBe("CONFIG_INCOMPLETE");
    // policy outranks age outranks activation.
    const noGrant: CapabilityContext = { ...open("staging", "mock"), hasActivationGrant: () => false, gates: DEFAULT_POLICY_GATE_READER };

    expect(reasonOf("signup", noGrant)).toBe("POLICY_NOT_PUBLISHED");
    expect(reasonOf("signup", noGrant)).toBe(reasonOf("signup", noGrant));
  });
});

describe("capability resolver: robustness", () => {
  const garbage: unknown[] = [
    null,
    undefined,
    42,
    "x",
    {},
    [],
    { env: null },
    { env: 5 },
    { env: { NIUVA_DEPLOYMENT_TIER: "mars" } },
    { env: { NODE_ENV: "weird" } },
    { env: env("local-test", "mock"), gates: null },
    { env: env("local-test", "mock"), gates: { getStatus: () => { throw new Error("boom"); } } },
    { env: env("local-test", "mock"), gates: { getStatus: () => null } },
    { env: env("staging", "mock"), hasActivationGrant: () => { throw new Error("boom"); } },
  ];

  it("decide never throws on garbage capability or context", () => {
    for (const capability of garbage) {
      for (const context of garbage) {
        const run = (): unknown =>
          decide(capability as CapabilityName, context as CapabilityContext);

        expect(run).not.toThrow();
        expect((run() as { allowed: boolean }).allowed === true).toBe(false);
      }
    }
  });

  it("a throwing gate reader or grant lookup fails closed", () => {
    const throwingGate = decide("payment", {
      ...open("staging", "mock"),
      gates: { getStatus: () => { throw new Error("boom"); } },
    });

    expect(throwingGate.allowed).toBe(false);
  });
});

describe("requireAllowed", () => {
  it("returns the allowed decision", () => {
    expect(requireAllowed("scheduledJobs", open("local-test", "mock"))).toEqual({
      allowed: true,
      mode: "mock",
      tier: "local-test",
    });
  });

  it("throws PROVIDER_UNAVAILABLE naming the capability and reason, without secrets", () => {
    let caught: unknown;

    try {
      requireAllowed("payment", {
        env: env("production", "live"),
        gates: OPEN_GATES,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    const error = caught as AppError;

    expect(error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(error.message).toContain("payment");
    expect(error.message).toContain("TIER_NOT_ALLOWED");
    expect(error.message).not.toContain(SECRET);
    expect(error.message).not.toContain("postgresql://");
  });

  it("never leaks env values for any denial reason", () => {
    for (const capability of CAPABILITY_NAMES) {
      for (const tier of DEPLOYMENT_TIERS) {
        const decision = decide(capability, { env: env(tier, "mock") });

        if (!decision.allowed) {
          expect(decision.operatorMessage).not.toContain(SECRET);
          expect(decision.operatorMessage).toContain(capability);
        }
      }
    }
  });

  it("throws PROVIDER_UNAVAILABLE for malformed input instead of a raw error", () => {
    expect(() => requireAllowed("payment", null as unknown as CapabilityContext)).toThrow(
      expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }),
    );
  });
});
