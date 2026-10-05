import { z } from "zod";

// Dependency-free and alias-free (no "@/" imports), same pattern as
// ./internal-auth and ./dev-origins. Declares the deployment tier and provider
// mode env fields and the fail-closed resolution of an unset tier. Nothing
// consumes these yet (Capability_Resolver is task 7.4+); defining them grants
// no permission.

export const DEPLOYMENT_TIERS = ["local-test", "staging", "production"] as const;
export type DeploymentTier = (typeof DEPLOYMENT_TIERS)[number];

export const PROVIDER_MODES = ["mock", "sandbox", "live"] as const;
export type ProviderMode = (typeof PROVIDER_MODES)[number];

type NodeEnvironment = "development" | "production" | "test" | undefined;

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

// Values are trimmed and lower-cased before matching so "Production" and
// " staging " are accepted; anything else is rejected with the field name.
const normalizeEnum = (value: unknown): unknown => {
  const blank = blankToUndefined(value);

  return typeof blank === "string" ? blank.trim().toLowerCase() : blank;
};

export const deploymentEnvironmentShape = {
  NIUVA_DEPLOYMENT_TIER: z.preprocess(
    normalizeEnum,
    z.enum(DEPLOYMENT_TIERS).optional(),
  ),
  NIUVA_PROVIDER_MODE: z.preprocess(
    normalizeEnum,
    z.enum(PROVIDER_MODES).optional(),
  ),
};

/**
 * Resolve the deployment tier, never granting more than NODE_ENV does today.
 *
 * - Explicit tier is honoured, except that `local-test` is ignored (treated as
 *   `production`) when NODE_ENV is `production`, because NODE_ENV=production is
 *   denied today and a tier variable must not be able to lift that denial.
 * - Unset tier: `development`/`test` NODE_ENV gives `local-test`; `production`
 *   and an unset NODE_ENV give `production` (most restrictive).
 */
export function resolveDeploymentTier(
  input: Readonly<{
    nodeEnv: NodeEnvironment;
    tier: DeploymentTier | undefined;
  }>,
): DeploymentTier {
  if (input.tier !== undefined) {
    return input.tier === "local-test" && input.nodeEnv === "production"
      ? "production"
      : input.tier;
  }

  return input.nodeEnv === "development" || input.nodeEnv === "test"
    ? "local-test"
    : "production";
}

/** Unset mode is `mock`, the least-privileged mode. */
export function resolveProviderMode(mode: ProviderMode | undefined): ProviderMode {
  return mode ?? "mock";
}

/**
 * Activation grants per tier. Intentionally empty: no task grants activation,
 * so `live` (and any provider activation) stays denied. A grant needs a
 * separate explicit instruction (Req 13.5).
 */
const ACTIVATION_GRANTS: Readonly<Record<DeploymentTier, readonly string[]>> = {
  "local-test": [],
  production: [],
  staging: [],
};

export function hasActivationGrant(
  tier: DeploymentTier,
  capability: string,
): boolean {
  return ACTIVATION_GRANTS[tier].includes(capability);
}
