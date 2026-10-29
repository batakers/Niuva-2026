import { resolveDeployment } from "../../lib/env/server";
import { readDatabaseBindingExpectation, type DatabaseBindingExpectation } from "./core";

// Shared guard for one-off Owner operations against the staging database (D4
// Owner bootstrap, catalog import). Relative imports only: these run through
// jiti scripts, which do not resolve the "@/" alias.

export type StagingOperatorEnvironmentFailure = "NOT_STAGING" | "DATABASE_TLS_REQUIRED" | "BINDING_CONFIG_INVALID";

export type StagingOperatorEnvironment =
  | Readonly<{ ok: true; expected: DatabaseBindingExpectation }>
  | Readonly<{ ok: false; reason: StagingOperatorEnvironmentFailure }>;

/** Explicit staging tier, exactly one `sslmode=verify-full` and a binding ID; never production or local. */
export function checkStagingOperatorEnvironment(source: Readonly<Record<string, string | undefined>>): StagingOperatorEnvironment {
  let tier: string;
  try {
    tier = resolveDeployment({ NODE_ENV: source.NODE_ENV, NIUVA_DEPLOYMENT_TIER: source.NIUVA_DEPLOYMENT_TIER, NIUVA_PROVIDER_MODE: source.NIUVA_PROVIDER_MODE }).tier;
  } catch {
    return { ok: false, reason: "NOT_STAGING" };
  }
  if (source.NIUVA_DEPLOYMENT_TIER?.trim().toLowerCase() !== "staging" || tier !== "staging") return { ok: false, reason: "NOT_STAGING" };
  let modes: string[] = [];
  try {
    modes = new URL(source.DATABASE_URL ?? "").searchParams.getAll("sslmode");
  } catch {
    return { ok: false, reason: "DATABASE_TLS_REQUIRED" };
  }
  if (modes.length !== 1 || modes[0] !== "verify-full") return { ok: false, reason: "DATABASE_TLS_REQUIRED" };
  try {
    return { ok: true, expected: readDatabaseBindingExpectation(source, "staging") };
  } catch {
    return { ok: false, reason: "BINDING_CONFIG_INVALID" };
  }
}
