import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "../../src/generated/prisma/client";
import { DatabaseBindingError, type DatabaseBindingExpectation } from "../../src/modules/database-binding/core";
import { PrismaDatabaseBindingRepository } from "../../src/modules/database-binding/repository";

import type { StagingDatabaseInspection } from "./staging-preflight";

export async function verifyMismatchedBinding(
  repository: Pick<PrismaDatabaseBindingRepository, "withVerifiedBinding">,
  expected: DatabaseBindingExpectation,
): Promise<boolean> {
  let callbackEntered = false;
  try {
    await repository.withVerifiedBinding({ ...expected, bindingId: randomUUID() }, async () => {
      callbackEntered = true;
    });
  } catch (error) {
    if (!(error instanceof DatabaseBindingError)) throw error;
    return error.reason === "MARKER_MISMATCH" && !callbackEntered;
  }
  return false;
}

export async function inspectStagingDatabase(
  client: PrismaClient,
  expected: DatabaseBindingExpectation,
  options: Readonly<{ migrationClient: PrismaClient; tlsVerified: boolean }>,
): Promise<StagingDatabaseInspection> {
  const repository = new PrismaDatabaseBindingRepository(client);
  const inspection = await repository.withVerifiedBinding(expected, async (tx) => {
    const rows = await tx.$queryRaw<{
      runtimeRoleRestricted: boolean;
      markerPrivilegesRestricted: boolean;
    }[]>(Prisma.sql`
      SELECT
        current_user = session_user
          AND r.rolcanlogin AND NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR r.rolinherit)
          AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)
          AND NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = current_database() AND datdba = r.oid)
          AND NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public' AND nspowner = r.oid)
          AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relowner = r.oid)
          AS "runtimeRoleRestricted",
        has_table_privilege(current_user, 'public.deployment_database_bindings', 'SELECT')
          AND has_column_privilege(current_user, 'public.deployment_database_bindings', 'id', 'UPDATE')
          AND NOT has_table_privilege(current_user, 'public.deployment_database_bindings', 'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          AND NOT has_any_column_privilege(current_user, 'public.deployment_database_bindings', 'INSERT,REFERENCES')
          AND NOT EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = 'public.deployment_database_bindings'::regclass
              AND a.attnum > 0 AND NOT a.attisdropped AND a.attname <> 'id'
              AND has_column_privilege(current_user, a.attrelid, a.attnum, 'UPDATE')
          )
          AS "markerPrivilegesRestricted"
      FROM pg_roles r WHERE r.rolname = current_user
    `);
    return {
      runtimeRoleRestricted: rows[0]?.runtimeRoleRestricted === true,
      markerPrivilegesRestricted: rows[0]?.markerPrivilegesRestricted === true,
      customerCount: await tx.customer.count(),
      orderCount: await tx.order.count(),
    };
  });

  const migrationRepository = new PrismaDatabaseBindingRepository(options.migrationClient);
  const migrations = await migrationRepository.withVerifiedBinding(expected, async (tx) =>
    tx.$queryRaw<StagingDatabaseInspection["migrations"]>(Prisma.sql`
      SELECT migration_name AS "name", finished_at IS NOT NULL AS "finished", rolled_back_at IS NOT NULL AS "rolledBack"
      FROM "_prisma_migrations" ORDER BY migration_name
    `),
  );

  const mismatchedBindingRejected = await verifyMismatchedBinding(repository, expected);
  return { ...inspection, migrations, tls: options.tlsVerified, mismatchedBindingRejected };
}
