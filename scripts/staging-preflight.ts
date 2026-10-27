import { readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createJiti } from "jiti";

import type { PrismaClient } from "../src/generated/prisma/client";

type PreflightModule = typeof import("./lib/staging-preflight");
type Output = Awaited<ReturnType<PreflightModule["runStagingPreflight"]>> | ReturnType<PreflightModule["stagingPreflightFailure"]>;

async function main() {
  let client: PrismaClient | undefined;
  let migrationClient: PrismaClient | undefined;
  let failure: PreflightModule["stagingPreflightFailure"] = () => ({ status: "FAILED", reason: "PREFLIGHT_FAILED" });
  let output: Output = failure(undefined);
  try {
    const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
    const [{ getPrismaClient }, { inspectStagingDatabase }, { verifyDatabaseTls }, { PrismaClient }, { PrismaPg }, preflight] = await Promise.all([
      jiti.import<typeof import("../src/lib/db/prisma")>("../src/lib/db/prisma"),
      jiti.import<typeof import("./lib/staging-database-probe")>("./lib/staging-database-probe"),
      jiti.import<typeof import("./lib/staging-database-tls")>("./lib/staging-database-tls"),
      jiti.import<typeof import("../src/generated/prisma/client")>("../src/generated/prisma/client"),
      jiti.import<typeof import("@prisma/adapter-pg")>("@prisma/adapter-pg"),
      jiti.import<PreflightModule>("./lib/staging-preflight"),
    ]);
    failure = preflight.stagingPreflightFailure;
    const directory = new URL("../prisma/migrations/", import.meta.url);
    const entries = await readdir(directory, { withFileTypes: true });
    const migrations = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const name of migrations) await access(fileURLToPath(new URL(`${name}/migration.sql`, directory)));
    output = await preflight.runStagingPreflight(process.env, migrations, async (expected) => {
      const runtimeUrl = process.env.DATABASE_URL!;
      const migrationUrl = process.env.NIUVA_STAGING_MIGRATION_DATABASE_URL!;
      if (!await verifyDatabaseTls(runtimeUrl) || !await verifyDatabaseTls(migrationUrl)) throw new preflight.DatabaseTlsError();
      client = getPrismaClient();
      migrationClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: migrationUrl, connectionTimeoutMillis: 5_000, max: 1 }) });
      return inspectStagingDatabase(client, expected, { migrationClient, tlsVerified: true });
    });
  } catch (error) {
    output = failure(error);
  } finally {
    for (const database of [client, migrationClient]) {
      try {
        await database?.$disconnect();
      } catch {
        output = failure(undefined);
      }
    }
  }
  console.log(JSON.stringify(output));
  if (output.status === "FAILED") process.exitCode = 1;
}

void main();
