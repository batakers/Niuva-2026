import {
  resolveDeploymentTier,
  DEPLOYMENT_TIERS,
  type DeploymentTier,
} from "@/lib/env/deployment";
import { resolveAppOrigin, type OriginResolution } from "@/lib/env/origin";

// Single bridge from the Customer auth code to the canonical origin source
// (src/lib/env/origin.ts, task 7.17). Every function takes the caller's env
// explicitly; nothing here reads the ambient environment.

export type CustomerAuthEnv = Readonly<Record<string, string | undefined>>;

function readNodeEnv(source: CustomerAuthEnv): "development" | "production" | "test" | undefined {
  const value = source.NODE_ENV?.trim();
  return value === "development" || value === "production" || value === "test" ? value : undefined;
}

function readExplicitTier(source: CustomerAuthEnv): DeploymentTier | undefined {
  const value = source.NIUVA_DEPLOYMENT_TIER?.trim().toLowerCase();
  return DEPLOYMENT_TIERS.find((tier) => tier === value);
}

/**
 * Deployment tier for Customer auth. An unrecognized tier value is ignored
 * (never widens) and falls back to the NODE_ENV rule, which fails toward
 * `production`.
 */
export function customerAuthTier(source: CustomerAuthEnv): DeploymentTier {
  return resolveDeploymentTier({ nodeEnv: readNodeEnv(source), tier: readExplicitTier(source) });
}

/** Canonical origin for the active tier, or an explicit failure. Never guesses. */
export function resolveCustomerAppOrigin(source: CustomerAuthEnv): OriginResolution {
  return resolveAppOrigin({ tier: customerAuthTier(source), appUrl: source.APP_URL });
}

/**
 * Verification / password-reset link on the canonical origin. Paths and token
 * handling are unchanged; returns null (no link) when the origin is invalid.
 */
export function buildCustomerAuthLink(source: CustomerAuthEnv, purpose: "verify" | "reset", token: string): URL | null {
  const resolved = resolveCustomerAppOrigin(source);
  if (!resolved.ok) return null;
  const url = new URL(purpose === "verify" ? "/verify-email" : "/reset-password", resolved.origin);
  url.searchParams.set("token", token);
  return url;
}

/**
 * `Secure` cookie flag. Only ever stricter than `NODE_ENV === "production"`:
 * secure on production NODE_ENV, on any non-local tier, and on an https origin.
 */
export function customerCookieSecure(source: CustomerAuthEnv): boolean {
  if (source.NODE_ENV === "production" || customerAuthTier(source) !== "local-test") return true;
  const resolved = resolveCustomerAppOrigin(source);
  return resolved.ok && resolved.origin.startsWith("https:");
}

/**
 * True when the env explicitly declares a hosted runtime (NODE_ENV or tier set
 * and resolving to staging/production). An env with neither set is a bare
 * library call, not a declared deployment.
 */
export function isHostedCustomerRuntime(source: CustomerAuthEnv): boolean {
  const declared = source.NODE_ENV?.trim() || source.NIUVA_DEPLOYMENT_TIER?.trim();
  return Boolean(declared) && customerAuthTier(source) !== "local-test";
}

/**
 * On a hosted tier the Google redirect URI must sit on the canonical origin.
 * Returns true when acceptable. Local runtimes are not constrained here.
 */
export function isGoogleRedirectUriAllowed(source: CustomerAuthEnv, redirectUri: string): boolean {
  if (!isHostedCustomerRuntime(source)) return true;
  const resolved = resolveCustomerAppOrigin(source);
  if (!resolved.ok) return false;
  try {
    return new URL(redirectUri).origin === resolved.origin;
  } catch {
    return false;
  }
}
