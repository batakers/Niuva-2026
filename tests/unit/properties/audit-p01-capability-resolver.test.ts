// Feature: niuva-audit-remediation, Property 1
// Property 1: capability resolution is total and fail-closed.
// Validates: Requirements 13.1-13.8, 20.1, 30.9
//
// Deterministic seeded corpus (no PBT library). Complements, and does not
// repeat, capability-matrix / capability-resolver / provider-guard-tightening.
import { describe, expect, it } from "vitest";

import { resolveDeployment, getServerCapabilities } from "@/lib/env/server";
import { CAPABILITY_MATRIX } from "@/modules/capabilities/matrix";
import {
  decide,
  requireAllowed,
  type CapabilityContext,
  type PolicyGateReader,
} from "@/modules/capabilities/resolver";
import {
  CAPABILITY_DENIAL_REASONS,
  CAPABILITY_NAMES,
  DEPLOYMENT_TIERS,
  PROVIDER_MODES,
  type CapabilityName,
  type PolicyGate,
} from "@/modules/capabilities/types";
import { AppError } from "@/modules/shared/errors";

import { DEFAULT_SEED, MIN_GENERATED, createRng, type Rng } from "../helpers/corpus";

const SECRET = "s3cr3t-value-do-not-leak";
type Env = Record<string, string | undefined>;

const FULL_CONFIG: Env = {
  BITESHIP_API_KEY: SECRET,
  BITESHIP_COURIERS: "jne",
  BITESHIP_ORIGIN_AREA_ID: "area-1",
  BETTER_AUTH_SECRET: "test-only-admin-secret-at-least-32-characters",
  DATABASE_URL: `postgresql://user:${SECRET}@localhost:5432/db`,
  EMAIL_FROM: "noreply@example.test",
  GOOGLE_CLIENT_ID: "gid",
  GOOGLE_CLIENT_SECRET: SECRET,
  GOOGLE_REDIRECT_URI: "http://localhost:3000/cb",
  MIDTRANS_IS_PRODUCTION: "false",
  MIDTRANS_SERVER_KEY: SECRET,
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "ck",
  R2_ACCESS_KEY_ID: "ak",
  R2_ACCOUNT_ID: "acc",
  R2_ENDPOINT: "http://localhost:9000",
  R2_PRIVATE_BUCKET: "priv",
  R2_PUBLIC_BUCKET: "pub",
  R2_SECRET_ACCESS_KEY: SECRET,
  RESEND_API_KEY: SECRET,
};

const GROUPS: readonly (readonly string[])[] = [
  ["BITESHIP_API_KEY", "BITESHIP_COURIERS", "BITESHIP_ORIGIN_AREA_ID"],
  ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"],
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
  ["MIDTRANS_IS_PRODUCTION", "MIDTRANS_SERVER_KEY", "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY"],
  ["R2_ACCESS_KEY_ID", "R2_ACCOUNT_ID", "R2_ENDPOINT", "R2_PRIVATE_BUCKET", "R2_PUBLIC_BUCKET", "R2_SECRET_ACCESS_KEY"],
  ["RESEND_API_KEY", "EMAIL_FROM"],
  ["DATABASE_URL"],
];

const GATES: readonly PolicyGate[] = ["PUB-POLICY", "PUB-AGE", "PUB-GUARDIAN"];

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;

const TIER_VALUES = [undefined, "local-test", "staging", "production", "Staging", " PRODUCTION ", "", "   ", "mars", `${SECRET}-tier`];
const MODE_VALUES = [undefined, "mock", "sandbox", "live", "LIVE", " Sandbox ", "", "   ", "prod", `${SECRET}-mode`];
const NODE_ENV_VALUES = [undefined, "test", "development", "production", "Production", "", "weird"];

function mangle(rng: Rng, key: string): string | undefined {
  const roll = rng();
  if (roll < 0.1) return undefined;
  if (roll < 0.16) return "";
  if (roll < 0.22) return "   \t ";
  if (roll < 0.3) return `${SECRET}-garbled-${key}`;
  if (roll < 0.34) return "\u0000\n";
  return FULL_CONFIG[key];
}

function makeEnv(rng: Rng): Env {
  const env: Env = {};
  const dropped = new Set<string>();

  for (const group of GROUPS) {
    if (rng() < 0.25) group.forEach((key) => dropped.add(key));
  }

  for (const [key, value] of Object.entries(FULL_CONFIG)) {
    env[key] = dropped.has(key) ? undefined : rng() < 0.35 ? mangle(rng, key) : value;
  }

  env.NIUVA_DEPLOYMENT_TIER = pick(rng, TIER_VALUES);
  env.NIUVA_PROVIDER_MODE = pick(rng, MODE_VALUES);
  env.NODE_ENV = pick(rng, NODE_ENV_VALUES);

  return env;
}

type GateBehaviour = "closed" | "open" | "throw" | "garbage" | "missing";

function makeGates(rng: Rng): PolicyGateReader {
  const behaviour = Object.fromEntries(
    GATES.map((gate) => [
      gate,
      pick<GateBehaviour>(rng, ["closed", "closed", "open", "throw", "garbage", "missing"]),
    ]),
  ) as Record<PolicyGate, GateBehaviour>;

  return {
    getStatus: (gate) => {
      switch (behaviour[gate]) {
        case "closed":
          return { closed: true };
        case "open":
          return { closed: false };
        case "throw":
          throw new Error(`gate ${gate} unavailable`);
        case "garbage":
          return { closed: "yes" } as unknown as { closed: boolean };
        default:
          return undefined as unknown as { closed: boolean };
      }
    },
  };
}

function makeGrant(rng: Rng): NonNullable<CapabilityContext["hasActivationGrant"]> {
  const kind = pick(rng, ["true", "true", "false", "throw", "truthy"] as const);

  return () => {
    if (kind === "throw") throw new Error("grant lookup unavailable");
    if (kind === "truthy") return "yes" as unknown as boolean;
    return kind === "true";
  };
}

type Sample = { context: CapabilityContext; env: Env; seed: number };

function corpus(seed = DEFAULT_SEED): Sample[] {
  const rng = createRng(seed);

  return Array.from({ length: MIN_GENERATED + 60 }, (_, index) => ({
    context: undefined as unknown as CapabilityContext,
    env: makeEnv(rng),
    gates: makeGates(rng),
    grant: makeGrant(rng),
    seed: index,
  })).map(({ env, gates, grant, seed: index }) => ({
    context: { env, gates, hasActivationGrant: grant },
    env,
    seed: index,
  }));
}

/** Independent oracle: the conjunction stated by the design, from matrix data. */
function expectedAllowed(capability: CapabilityName, context: CapabilityContext): boolean {
  let deployment;
  let caps;
  try {
    deployment = resolveDeployment(context.env);
    caps = getServerCapabilities(context.env);
  } catch {
    return false;
  }

  const rule = CAPABILITY_MATRIX[deployment.tier][capability];
  if (!rule.allowedModes.includes(deployment.providerMode)) return false;

  for (const resource of rule.requiredResources) {
    if ((resource === "database" ? caps.database : caps.objectStorage) !== true) return false;
  }
  for (const group of rule.requiredConfig) {
    if (caps[group] !== true) return false;
  }
  for (const gate of rule.requiredPolicyGates) {
    try {
      const status = context.gates?.getStatus(gate) as unknown as { closed?: unknown } | undefined;
      if (status?.closed !== true) return false;
    } catch {
      return false;
    }
  }
  if (rule.requiresActivationGrant) {
    try {
      if (context.hasActivationGrant?.(deployment.tier, capability) !== true) return false;
    } catch {
      return false;
    }
  }

  return true;
}

describe("Property 1: capability resolution is total and fail-closed", () => {
  const samples = corpus();

  it("corpus has at least 100 generated env records", () => {
    expect(samples.length).toBeGreaterThanOrEqual(MIN_GENERATED);
  });

  it("is total over tier x mode x capability x corpus: never throws, allowed or exactly one reason", () => {
    for (const sample of samples) {
      for (const tier of DEPLOYMENT_TIERS) {
        for (const mode of PROVIDER_MODES) {
          const env = { ...sample.env, NIUVA_DEPLOYMENT_TIER: tier, NIUVA_PROVIDER_MODE: mode };

          for (const capability of CAPABILITY_NAMES) {
            const context = { ...sample.context, env };
            let decision;
            expect(() => (decision = decide(capability, context)), `#${sample.seed} ${tier}/${mode}/${capability}`).not.toThrow();
            const d = decision as unknown as ReturnType<typeof decide>;

            if (d.allowed) {
              expect(d.tier).toBe(tier);
              expect(d.mode).toBe(mode);
            } else {
              expect(CAPABILITY_DENIAL_REASONS).toContain(d.reason);
              expect(Object.keys(d).sort()).toEqual(["allowed", "operatorMessage", "reason"]);
              expect(typeof d.operatorMessage).toBe("string");
              expect(d.operatorMessage).not.toContain(SECRET);
            }
          }
        }
      }
    }
  });

  it("matches the conjunction oracle exactly and is fail-closed (random env, gates, grants)", () => {
    for (const sample of samples) {
      for (const capability of CAPABILITY_NAMES) {
        const decision = decide(capability, sample.context);

        expect(decision.allowed, `#${sample.seed} ${capability} env=${JSON.stringify(sample.env).replaceAll(SECRET, "<S>")}`).toBe(
          expectedAllowed(capability, sample.context),
        );

        if (decision.allowed) {
          // Fail-closed invariants on every allowed decision.
          expect(decision.tier).not.toBe("production");
          expect(decision.mode).not.toBe("live");
          expect(CAPABILITY_MATRIX[decision.tier][capability].allowedModes).toContain(decision.mode);
        }
      }
    }
  });

  it("production tier and live mode are never allowed, even with all gates and grants open", () => {
    for (const sample of samples) {
      const context: CapabilityContext = {
        env: sample.env,
        gates: { getStatus: () => ({ closed: true }) },
        hasActivationGrant: () => true,
      };
      let resolved;
      try {
        resolved = resolveDeployment(sample.env);
      } catch {
        resolved = undefined;
      }

      for (const capability of CAPABILITY_NAMES) {
        const decision = decide(capability, context);

        if (resolved?.tier === "production" || resolved?.providerMode === "live") {
          expect(decision.allowed, `#${sample.seed} ${capability}`).toBe(false);
        }
        if (decision.allowed) {
          expect(resolved?.tier).not.toBe("production");
          expect(resolved?.providerMode).not.toBe("live");
        }
      }
    }
  });

  it("signup is never allowed with the recorded (default) grants, in any tier, mode or env", () => {
    for (const sample of samples) {
      for (const tier of DEPLOYMENT_TIERS) {
        for (const mode of PROVIDER_MODES) {
          const env = { ...sample.env, NIUVA_DEPLOYMENT_TIER: tier, NIUVA_PROVIDER_MODE: mode };

          expect(
            decide("signup", { env, gates: { getStatus: () => ({ closed: true }) } }).allowed,
            `#${sample.seed} ${tier}/${mode}`,
          ).toBe(false);
        }
      }
    }
  });

  it("with default gates and grants, staging/production capabilities needing a grant or gate are denied", () => {
    for (const sample of samples) {
      for (const tier of ["staging", "production"] as const) {
        const env = { ...sample.env, NIUVA_DEPLOYMENT_TIER: tier };

        for (const capability of CAPABILITY_NAMES) {
          // Every staging/production rule requires a grant, which is empty by default.
          expect(CAPABILITY_MATRIX[tier][capability].requiresActivationGrant).toBe(true);
          expect(decide(capability, { env }).allowed, `#${sample.seed} ${tier}/${capability}`).toBe(false);
        }
      }
    }
  });

  it("open gate in staging denies gated capabilities; policy/age gates do not apply in local-test", () => {
    const openGates: PolicyGateReader = { getStatus: () => ({ closed: false }) };

    for (const sample of samples) {
      for (const capability of CAPABILITY_NAMES) {
        const stagingEnv = { ...sample.env, NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_PROVIDER_MODE: "mock" };
        const gated = CAPABILITY_MATRIX.staging[capability].requiredPolicyGates.length > 0;

        if (gated) {
          expect(
            decide(capability, { env: stagingEnv, gates: openGates, hasActivationGrant: () => true }).allowed,
          ).toBe(false);
        }
        expect(CAPABILITY_MATRIX["local-test"][capability].requiredPolicyGates).toEqual([]);
      }
    }
  });

  it("is deterministic: same input gives the same output", () => {
    for (const sample of samples) {
      for (const capability of CAPABILITY_NAMES) {
        expect(decide(capability, sample.context)).toEqual(decide(capability, sample.context));
      }
    }
  });

  it("requireAllowed throws PROVIDER_UNAVAILABLE iff decide denies, without env values in the message", () => {
    for (const sample of samples) {
      for (const capability of CAPABILITY_NAMES) {
        const decision = decide(capability, sample.context);
        let thrown: unknown;
        let result: unknown;

        try {
          result = requireAllowed(capability, sample.context);
        } catch (error) {
          thrown = error;
        }

        if (decision.allowed) {
          expect(thrown).toBeUndefined();
          expect(result).toEqual(decision);
        } else {
          expect(thrown).toBeInstanceOf(AppError);
          const error = thrown as AppError;
          expect(error.code).toBe("PROVIDER_UNAVAILABLE");
          expect(error.message).not.toContain(SECRET);
          expect(error.message).not.toContain("postgresql://");
        }
      }
    }
  });

  it("changing only NODE_ENV never turns a denial into an allow, and cannot change an explicit staging decision between test/development/production", () => {
    for (const sample of samples) {
      for (const capability of CAPABILITY_NAMES) {
        const base = decide(capability, sample.context);

        if (!base.allowed) {
          const lifted = decide(capability, {
            ...sample.context,
            env: { ...sample.env, NODE_ENV: "production" },
          });
          expect(lifted.allowed, `#${sample.seed} ${capability}`).toBe(false);
        }

        const stagingEnv = { ...sample.env, NIUVA_DEPLOYMENT_TIER: "staging" };
        const byNodeEnv = ["test", "development", "production"].map((nodeEnv) =>
          decide(capability, { ...sample.context, env: { ...stagingEnv, NODE_ENV: nodeEnv } }).allowed,
        );
        expect(new Set(byNodeEnv).size, `#${sample.seed} ${capability}`).toBe(1);
      }
    }
  });
});
