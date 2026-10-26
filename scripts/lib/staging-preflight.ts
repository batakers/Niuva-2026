import { resolveAppOrigin } from "../../src/lib/env/origin";
import { getServerActionsAllowedOrigins } from "../../src/lib/env/server-actions-origins";
import { getDatabaseEnvironment, resolveDeployment, validateStartupEnvironment } from "../../src/lib/env/server";
import { decide } from "../../src/modules/capabilities/resolver";
import { CAPABILITY_NAMES } from "../../src/modules/capabilities/types";
import { customerCookieSecure } from "../../src/modules/customer-auth/app-origin";
import { customerOAuthCookieOptions, customerSessionCookieOptions } from "../../src/modules/customer-auth/core";
import { DatabaseBindingError, readDatabaseBindingExpectation, type DatabaseBindingExpectation } from "../../src/modules/database-binding/core";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;
type FailureReason =
  | "PROFILE_INVALID" | "CONFIG_INVALID" | "ORIGIN_INVALID" | "COOKIE_POLICY_INVALID"
  | "PROVIDERS_PRESENT" | "FIXTURE_CONFIG_PRESENT" | "CAPABILITY_OPEN"
  | "DATABASE_BINDING_REJECTED" | "DATABASE_UNAVAILABLE" | "DATABASE_PRIVILEGES_INVALID"
  | "DATABASE_TLS_REQUIRED" | "NEGATIVE_BINDING_FAILED" | "MIGRATIONS_NOT_CURRENT"
  | "DATABASE_NOT_EMPTY";

class StagingPreflightError extends Error {
  constructor(readonly reason: FailureReason) {
    super(`Staging preflight failed (${reason}).`);
    this.name = "StagingPreflightError";
  }
}

export type StagingDatabaseInspection = Readonly<{
  runtimeRoleRestricted: boolean;
  markerPrivilegesRestricted: boolean;
  tls: boolean;
  mismatchedBindingRejected: boolean;
  migrations: readonly Readonly<{ name: string; finished: boolean; rolledBack: boolean }>[];
  customerCount: number;
  orderCount: number;
}>;

// T03's initial hosted proof has no provider credentials or background workers.
const providerPrefix = /^(?:BITESHIP_|MIDTRANS_|NEXT_PUBLIC_MIDTRANS_|GOOGLE_|R2_|S3_|RESEND_|BETTER_AUTH_|ADMIN_SMTP_)/;
const providerKeys = new Set(["EMAIL_FROM", "ADMIN_EMAIL_FROM", "CRON_SECRET"]);

function configured(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "";
}

function configuration(source: EnvironmentSource): DatabaseBindingExpectation {
  if (Object.entries(source).some(([key, value]) => configured(value) && (providerPrefix.test(key) || providerKeys.has(key))) || source.NIUVA_ANALYTICS_ENABLED === "true") {
    throw new StagingPreflightError("PROVIDERS_PRESENT");
  }
  if (source.NIUVA_RUNTIME_MODE === "demo" || ["NIUVA_CUSTOMER_AUTH_MOCK", "NIUVA_CUSTOMER_PUBLIC_AUTH_TEST"].some((key) => configured(source[key]))) {
    throw new StagingPreflightError("FIXTURE_CONFIG_PRESENT");
  }

  let deployment: ReturnType<typeof resolveDeployment>;
  let expected: DatabaseBindingExpectation;
  try {
    const environment = validateStartupEnvironment(source);
    deployment = resolveDeployment(source);
    if (environment.NODE_ENV !== "production" || deployment.tier !== "staging" || deployment.providerMode !== "sandbox") {
      throw new StagingPreflightError("PROFILE_INVALID");
    }
    getDatabaseEnvironment(source);
    expected = readDatabaseBindingExpectation(source, "staging");
  } catch (error) {
    if (error instanceof StagingPreflightError) throw error;
    throw new StagingPreflightError("CONFIG_INVALID");
  }

  const origin = resolveAppOrigin({ tier: deployment.tier, appUrl: source.APP_URL });
  if (!origin.ok || JSON.stringify(getServerActionsAllowedOrigins(source)) !== JSON.stringify(origin.allowedOrigins)) {
    throw new StagingPreflightError("ORIGIN_INVALID");
  }
  const secure = customerCookieSecure(source);
  const cookies = [customerSessionCookieOptions(secure), customerOAuthCookieOptions(secure)];
  if (cookies.some((cookie) => !cookie.secure || !cookie.httpOnly || cookie.sameSite !== "lax" || cookie.maxAge <= 0)) {
    throw new StagingPreflightError("COOKIE_POLICY_INVALID");
  }
  if (CAPABILITY_NAMES.some((name) => decide(name, { env: source }).allowed)) {
    throw new StagingPreflightError("CAPABILITY_OPEN");
  }
  return expected;
}

function migrationsCurrent(expectedNames: readonly string[], inspection: StagingDatabaseInspection): boolean {
  if (expectedNames.length === 0 || new Set(expectedNames).size !== expectedNames.length) return false;
  if (inspection.migrations.some((migration) => !migration.finished && !migration.rolledBack)) return false;
  const completed = inspection.migrations.filter((migration) => migration.finished && !migration.rolledBack).map((migration) => migration.name).sort();
  return JSON.stringify(completed) === JSON.stringify([...expectedNames].sort());
}

export async function runStagingPreflight(
  source: EnvironmentSource,
  expectedMigrationNames: readonly string[],
  inspect: (expected: DatabaseBindingExpectation) => Promise<StagingDatabaseInspection>,
) {
  const expected = configuration(source);
  let database: StagingDatabaseInspection;
  try {
    database = await inspect(expected);
  } catch (error) {
    throw new StagingPreflightError(error instanceof DatabaseBindingError ? "DATABASE_BINDING_REJECTED" : "DATABASE_UNAVAILABLE");
  }
  if (!database.runtimeRoleRestricted || !database.markerPrivilegesRestricted) throw new StagingPreflightError("DATABASE_PRIVILEGES_INVALID");
  if (!database.tls) throw new StagingPreflightError("DATABASE_TLS_REQUIRED");
  if (!database.mismatchedBindingRejected) throw new StagingPreflightError("NEGATIVE_BINDING_FAILED");
  if (!migrationsCurrent(expectedMigrationNames, database)) throw new StagingPreflightError("MIGRATIONS_NOT_CURRENT");
  if (database.customerCount !== 0 || database.orderCount !== 0) throw new StagingPreflightError("DATABASE_NOT_EMPTY");

  return {
    status: "PASSED" as const,
    originVerified: true,
    secureCookiePolicy: true,
    databaseBindingVerified: true,
    mismatchedBindingRejected: true,
    runtimeRoleRestricted: true,
    markerPrivilegesRestricted: true,
    databaseTls: true,
    migrationsCurrent: true,
    migrationCount: expectedMigrationNames.length,
    capabilitiesDenied: CAPABILITY_NAMES.length,
    customerCount: 0,
    orderCount: 0,
  };
}

export function stagingPreflightFailure(error: unknown) {
  return { status: "FAILED" as const, reason: error instanceof StagingPreflightError ? error.reason : "PREFLIGHT_FAILED" };
}
