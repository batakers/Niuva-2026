import {
  DEPLOYMENT_TIERS,
  resolveDeploymentTier,
  type DeploymentTier,
} from "./deployment";
import { resolveAppOrigin, type OriginFailureReason } from "./origin";

// Alias-free (no "@/" imports) so `next.config.ts` can import it. Feeds
// `experimental.serverActions.allowedOrigins` (task 7.19). Never throws.
//
// Next compares a Server Action's Origin with Host and treats this list as
// *extra* safe origins; an empty list keeps the same-origin-only default. So
// an invalid or missing APP_URL fails closed to an empty list instead of
// guessing a host, and never breaks local dev or a build that lacks APP_URL.

export type ServerActionsOrigins = Readonly<{
  tier: DeploymentTier;
  /** `host[:port]` entries, never a wildcard; empty when APP_URL is unusable. */
  allowedOrigins: readonly string[];
  /** Set when APP_URL was missing/invalid. Reason code only, never the value. */
  failure?: OriginFailureReason;
}>;

type EnvSource = Readonly<Record<string, string | undefined>>;

function readTier(raw: string | undefined): DeploymentTier | undefined {
  const value = raw?.trim().toLowerCase();

  return DEPLOYMENT_TIERS.find((tier) => tier === value);
}

function readNodeEnv(raw: string | undefined): "development" | "production" | "test" | undefined {
  return raw === "development" || raw === "production" || raw === "test"
    ? raw
    : undefined;
}

export function getServerActionsOrigins(
  env: EnvSource = process.env,
): ServerActionsOrigins {
  // An unrecognised tier string is treated as unset (fail-closed by NODE_ENV).
  const tier = resolveDeploymentTier({
    nodeEnv: readNodeEnv(env.NODE_ENV),
    tier: readTier(env.NIUVA_DEPLOYMENT_TIER),
  });
  const resolution = resolveAppOrigin({ appUrl: env.APP_URL, tier });

  return resolution.ok
    ? { allowedOrigins: [...resolution.allowedOrigins], tier }
    : { allowedOrigins: [], failure: resolution.reason, tier };
}

/** Value for `experimental.serverActions.allowedOrigins`. */
export function getServerActionsAllowedOrigins(env: EnvSource = process.env): string[] {
  return [...getServerActionsOrigins(env).allowedOrigins];
}

/** Warning line (names and reason code only) for staging/production, else null. */
export function getServerActionsOriginsWarning(env: EnvSource = process.env): string | null {
  const result = getServerActionsOrigins(env);

  return result.failure !== undefined && result.tier !== "local-test"
    ? `[niuva] APP_URL is ${result.failure} for tier ${result.tier}; serverActions.allowedOrigins left empty (same-origin only).`
    : null;
}
