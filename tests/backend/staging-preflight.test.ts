import { describe, expect, it, vi } from "vitest";

import {
  DatabaseTlsError,
  runStagingPreflight,
  stagingPreflightFailure,
  type StagingDatabaseInspection,
} from "../../scripts/lib/staging-preflight";

const bindingId = "07000000-0000-4000-8000-000000000003";
const migrationNames = ["20261001_base", "20261002_binding"];
const source = {
  NODE_ENV: "production",
  NIUVA_DEPLOYMENT_TIER: "staging",
  NIUVA_PROVIDER_MODE: "sandbox",
  NIUVA_ANALYTICS_ENABLED: "false",
  APP_URL: "https://staging.niuva.example.test",
  DATABASE_URL: "postgresql://runtime:private-fixture-password@db.example.test/niuva_staging?sslmode=verify-full",
  NIUVA_STAGING_MIGRATION_DATABASE_URL: "postgresql://migration:private-migration-password@db.example.test/niuva_staging?sslmode=verify-full",
  NIUVA_DATABASE_BINDING_ID: bindingId,
};

function inspection(overrides: Partial<StagingDatabaseInspection> = {}): StagingDatabaseInspection {
  return {
    runtimeRoleRestricted: true,
    markerPrivilegesRestricted: true,
    tls: true,
    migrations: migrationNames.map((name) => ({ name, finished: true, rolledBack: false })),
    mismatchedBindingRejected: true,
    customerCount: 0,
    orderCount: 0,
    ...overrides,
  };
}

describe("T03 staging preflight", () => {
  it("returns only safe evidence for the closed staging profile", async () => {
    const inspect = vi.fn().mockResolvedValue(inspection());
    const result = await runStagingPreflight(source, migrationNames, inspect);

    expect(inspect).toHaveBeenCalledOnce();
    expect(inspect).toHaveBeenCalledWith({ tier: "staging", bindingId });
    expect(result).toEqual({
      status: "PASSED",
      originVerified: true,
      secureCookiePolicy: true,
      databaseBindingVerified: true,
      mismatchedBindingRejected: true,
      runtimeRoleRestricted: true,
      markerPrivilegesRestricted: true,
      databaseTls: true,
      migrationsCurrent: true,
      migrationCount: 2,
      // Only the recorded E6 grant that needs no provider config is open.
      capabilitiesDenied: 14,
      capabilitiesOpen: ["scheduledJobs"],
      customerCount: 0,
      orderCount: 0,
    });
    expect(JSON.stringify(result)).not.toContain(bindingId);
    expect(JSON.stringify(result)).not.toContain("example.test");
    expect(JSON.stringify(result)).not.toContain("private-fixture-password");
  });

  it.each([
    { NIUVA_DEPLOYMENT_TIER: "production" },
    { NIUVA_DEPLOYMENT_TIER: "local-test" },
    { NIUVA_PROVIDER_MODE: "live" },
    { NIUVA_PROVIDER_MODE: "mock" },
    { NODE_ENV: "development" },
  ])("rejects a different runtime profile before connecting: %j", async (overrides) => {
    const inspect = vi.fn();
    await expect(runStagingPreflight({ ...source, ...overrides }, migrationNames, inspect))
      .rejects.toMatchObject({ reason: "PROFILE_INVALID" });
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each([
    "http://staging.niuva.example.test",
    "https://localhost",
    "https://user:password@staging.niuva.example.test",
    "https://staging.niuva.example.test/checkout",
  ])("rejects an unsafe origin before connecting: %s", async (appUrl) => {
    const inspect = vi.fn();
    await expect(runStagingPreflight({ ...source, APP_URL: appUrl }, migrationNames, inspect))
      .rejects.toMatchObject({ reason: "ORIGIN_INVALID" });
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each([
    { BITESHIP_API_KEY: "private-provider-key" },
    { MIDTRANS_IS_PRODUCTION: "false" },
    { S3_REGION: "fixture-region" },
    { R2_ACCOUNT_ID: "fixture-account" },
    { ADMIN_SMTP_PASSWORD: "private-mail-password" },
    { GOOGLE_CLIENT_SECRET: "private-google-secret" },
    { CRON_SECRET: "private-job-secret" },
    { NIUVA_ANALYTICS_ENABLED: "true" },
  ])("rejects provider or job configuration before connecting: %j", async (overrides) => {
    const inspect = vi.fn();
    await expect(runStagingPreflight({ ...source, ...overrides }, migrationNames, inspect))
      .rejects.toMatchObject({ reason: "PROVIDERS_PRESENT" });
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each([
    { NIUVA_CUSTOMER_AUTH_MOCK: "true" },
    { NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "true" },
    { NIUVA_RUNTIME_MODE: "demo" },
  ])("rejects local fixture configuration before connecting: %j", async (overrides) => {
    const inspect = vi.fn();
    await expect(runStagingPreflight({ ...source, ...overrides }, migrationNames, inspect))
      .rejects.toMatchObject({ reason: "FIXTURE_CONFIG_PRESENT" });
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each([
    { DATABASE_URL: undefined },
    { NIUVA_STAGING_MIGRATION_DATABASE_URL: undefined },
    { NIUVA_STAGING_MIGRATION_DATABASE_URL: "postgresql://migration:password@other.example.test/niuva_staging?sslmode=verify-full" },
    { NIUVA_STAGING_MIGRATION_DATABASE_URL: "postgresql://migration:password@db.example.test/other?sslmode=verify-full" },
    { NIUVA_STAGING_MIGRATION_DATABASE_URL: "postgresql://runtime:password@db.example.test/niuva_staging?sslmode=verify-full" },
    { NIUVA_DATABASE_BINDING_ID: undefined },
    { NIUVA_DATABASE_BINDING_ID: "not-a-binding" },
  ])("rejects incomplete database configuration before connecting: %j", async (overrides) => {
    const inspect = vi.fn();
    await expect(runStagingPreflight({ ...source, ...overrides }, migrationNames, inspect))
      .rejects.toMatchObject({ reason: "CONFIG_INVALID" });
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each([
    { DATABASE_URL: "postgresql://runtime:password@db.example.test/niuva_staging?sslmode=disable" },
    { DATABASE_URL: "postgresql://runtime:password@db.example.test/niuva_staging?sslmode=verify-full&sslmode=no-verify" },
    { NIUVA_STAGING_MIGRATION_DATABASE_URL: "postgresql://migration:password@db.example.test/niuva_staging?sslmode=require" },
  ])("rejects weak or ambiguous TLS configuration before connecting: %j", async (overrides) => {
    const inspect = vi.fn();
    await expect(runStagingPreflight({ ...source, ...overrides }, migrationNames, inspect))
      .rejects.toMatchObject({ reason: "DATABASE_TLS_REQUIRED" });
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each([
    { override: { runtimeRoleRestricted: false }, reason: "DATABASE_PRIVILEGES_INVALID" },
    { override: { markerPrivilegesRestricted: false }, reason: "DATABASE_PRIVILEGES_INVALID" },
    { override: { tls: false }, reason: "DATABASE_TLS_REQUIRED" },
    { override: { mismatchedBindingRejected: false }, reason: "NEGATIVE_BINDING_FAILED" },
    { override: { customerCount: 1 }, reason: "DATABASE_NOT_EMPTY" },
    { override: { orderCount: 1 }, reason: "DATABASE_NOT_EMPTY" },
  ])("fails closed for database evidence: $reason", async ({ override, reason }) => {
    await expect(runStagingPreflight(source, migrationNames, async () => inspection(override)))
      .rejects.toMatchObject({ reason });
  });

  it.each([
    { migrations: [] },
    { migrations: [{ name: migrationNames[0], finished: true, rolledBack: false }] },
    { migrations: [...inspection().migrations, { name: "unexpected_migration", finished: true, rolledBack: false }] },
    { migrations: [...inspection().migrations, { name: "failed_migration", finished: false, rolledBack: false }] },
  ])("rejects missing, extra, or unfinished migrations", async ({ migrations }) => {
    await expect(runStagingPreflight(source, migrationNames, async () => inspection({ migrations })))
      .rejects.toMatchObject({ reason: "MIGRATIONS_NOT_CURRENT" });
  });

  it("allows resolved failed migration history when the completed set matches", async () => {
    const migrations = [...inspection().migrations, { name: migrationNames[0], finished: false, rolledBack: true }];
    await expect(runStagingPreflight(source, migrationNames, async () => inspection({ migrations })))
      .resolves.toMatchObject({ migrationCount: 2 });
  });

  it("does not expose database or credential errors", async () => {
    const inspect = vi.fn().mockRejectedValue(new Error("postgresql://runtime:private-password@private-host/db"));
    const error = await runStagingPreflight(source, migrationNames, inspect).catch((cause: unknown) => cause);

    expect(stagingPreflightFailure(error)).toEqual({ status: "FAILED", reason: "DATABASE_UNAVAILABLE" });
    expect(JSON.stringify(stagingPreflightFailure(error))).not.toContain("private-");
    expect(stagingPreflightFailure(new Error("private-error"))).toEqual({ status: "FAILED", reason: "PREFLIGHT_FAILED" });
  });

  it("reports a failed TLS verification without exposing connection details", async () => {
    const error = await runStagingPreflight(source, migrationNames, async () => {
      throw new DatabaseTlsError("private fixture detail");
    }).catch((cause: unknown) => cause);
    expect(stagingPreflightFailure(error)).toEqual({ status: "FAILED", reason: "DATABASE_TLS_REQUIRED" });
  });
});
