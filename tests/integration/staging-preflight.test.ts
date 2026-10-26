import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";

import { inspectStagingDatabase } from "../../scripts/lib/staging-database-probe";
import { runStagingPreflight } from "../../scripts/lib/staging-preflight";
import { isolatedTestDatabase } from "../helpers/isolated-test-database";

let database: Awaited<ReturnType<typeof isolatedTestDatabase>> | undefined;
let databaseUrl: string;
let admin: PrismaClient;
const bindingId = randomUUID();
const expected = { tier: "staging", bindingId } as const;
const roleName = `staging_preflight_test_${randomUUID().replaceAll("-", "")}`;
const role = Prisma.raw(`"${roleName}"`);
let restricted: PrismaClient;
let ownsMarker = false;
let ownsRole = false;

beforeAll(async () => {
  database = await isolatedTestDatabase("staging");
  admin = database.prisma;
  databaseUrl = database.url;
  const url = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: databaseUrl });
  if (await admin.deploymentDatabaseBinding.count() || await admin.customer.count() || await admin.order.count()) {
    throw new Error("Staging preflight fixture requires a fresh isolated test database.");
  }
  await admin.deploymentDatabaseBinding.create({ data: { id: 1, ...expected } });
  ownsMarker = true;
  await admin.$executeRaw(Prisma.sql`CREATE ROLE ${role} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
  ownsRole = true;
  await admin.$executeRaw(Prisma.sql`GRANT USAGE ON SCHEMA "public" TO ${role}`);
  await admin.$executeRaw(Prisma.sql`GRANT SELECT ON TABLE "_prisma_migrations", "customers", "orders" TO ${role}`);
  await admin.$executeRaw(Prisma.sql`GRANT SELECT, UPDATE ("id") ON TABLE "deployment_database_bindings" TO ${role}`);
  const runtimeUrl = new URL(url);
  runtimeUrl.username = roleName;
  runtimeUrl.password = "";
  restricted = new PrismaClient({ adapter: new PrismaPg({ connectionString: runtimeUrl.toString(), max: 2 }) });
}, 90000);

afterAll(async () => {
  await restricted?.$disconnect();
  try {
    if (ownsRole) {
      await admin.$executeRaw(Prisma.sql`REVOKE SELECT, UPDATE ("id", "created_at") ON TABLE "deployment_database_bindings" FROM ${role}`);
      await admin.$executeRaw(Prisma.sql`REVOKE SELECT ON TABLE "_prisma_migrations", "customers", "orders" FROM ${role}`);
      await admin.$executeRaw(Prisma.sql`REVOKE USAGE ON SCHEMA "public" FROM ${role}`);
      await admin.$executeRaw(Prisma.sql`DROP ROLE ${role}`);
    }
    if (ownsMarker) await admin.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } });
  } finally {
    await database?.dispose();
  }
});

describe.sequential("T03 preflight database probe", () => {
  it("checks the real restricted role and negative binding without changing data", async () => {
    const before = await admin.deploymentDatabaseBinding.findUniqueOrThrow({ where: { id: 1 } });
    const migrations = await readdir(new URL("../../prisma/migrations/", import.meta.url), { withFileTypes: true });
    const expectedNames = migrations.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    const result = await inspectStagingDatabase(restricted, expected);

    expect(result).toMatchObject({ runtimeRoleRestricted: true, markerPrivilegesRestricted: true, mismatchedBindingRejected: true, customerCount: 0, orderCount: 0 });
    expect(result.migrations.filter((migration) => migration.finished && !migration.rolledBack).map((migration) => migration.name).sort()).toEqual(expectedNames);
    expect(await admin.deploymentDatabaseBinding.findUniqueOrThrow({ where: { id: 1 } })).toEqual(before);
    expect(await admin.customer.count()).toBe(0);
    expect(await admin.order.count()).toBe(0);
  });

  it("rejects a wrong resource before reading its application data", async () => {
    await expect(inspectStagingDatabase(restricted, { ...expected, bindingId: randomUUID() }))
      .rejects.toMatchObject({ name: "DatabaseBindingError", reason: "MARKER_MISMATCH" });
    expect(await admin.deploymentDatabaseBinding.findUniqueOrThrow({ where: { id: 1 } })).toMatchObject(expected);
  });

  it("detects accidental use of the owner credential", async () => {
    const result = await inspectStagingDatabase(admin, expected);
    expect(result.runtimeRoleRestricted).toBe(false);
    expect(result.markerPrivilegesRestricted).toBe(false);
  });

  it("rejects owner authentication masked by SET ROLE", async () => {
    const url = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: databaseUrl });
    const maskedOwner = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: `-c role=${roleName}`, max: 2 }) });
    try {
      expect((await inspectStagingDatabase(maskedOwner, expected)).runtimeRoleRestricted).toBe(false);
    } finally {
      await maskedOwner.$disconnect();
    }
  });

  it("detects an extra column grant on the marker", async () => {
    try {
      await admin.$executeRaw(Prisma.sql`GRANT UPDATE ("created_at") ON TABLE "deployment_database_bindings" TO ${role}`);
      expect((await inspectStagingDatabase(restricted, expected)).markerPrivilegesRestricted).toBe(false);
    } finally {
      await admin.$executeRaw(Prisma.sql`REVOKE UPDATE ("created_at") ON TABLE "deployment_database_bindings" FROM ${role}`);
    }
  });

  it("does not treat the loopback fixture as TLS hosted proof", async () => {
    const result = await inspectStagingDatabase(restricted, expected);
    expect(result.tls).toBe(false);
    const entries = await readdir(new URL("../../prisma/migrations/", import.meta.url), { withFileTypes: true });
    const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    await expect(runStagingPreflight({
      NODE_ENV: "production",
      NIUVA_DEPLOYMENT_TIER: "staging",
      NIUVA_PROVIDER_MODE: "sandbox",
      APP_URL: "https://staging.niuva.example.test",
      DATABASE_URL: getSafeTestDatabaseUrl({ TEST_DATABASE_URL: databaseUrl }),
      NIUVA_DATABASE_BINDING_ID: bindingId,
    }, names, async () => result)).rejects.toMatchObject({ reason: "DATABASE_TLS_REQUIRED" });
  });
});
