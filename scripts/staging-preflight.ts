import { readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createJiti } from "jiti";

import type { PrismaClient } from "../src/generated/prisma/client";

type PreflightModule = typeof import("./lib/staging-preflight");
type Output = Awaited<ReturnType<PreflightModule["runStagingPreflight"]>> | ReturnType<PreflightModule["stagingPreflightFailure"]>;

async function main() {
  let client: PrismaClient | undefined;
  let failure: PreflightModule["stagingPreflightFailure"] = () => ({ status: "FAILED", reason: "PREFLIGHT_FAILED" });
  let output: Output = failure(undefined);
  try {
    const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
    const [{ getPrismaClient }, { inspectStagingDatabase }, preflight] = await Promise.all([
      jiti.import<typeof import("../src/lib/db/prisma")>("../src/lib/db/prisma"),
      jiti.import<typeof import("./lib/staging-database-probe")>("./lib/staging-database-probe"),
      jiti.import<PreflightModule>("./lib/staging-preflight"),
    ]);
    failure = preflight.stagingPreflightFailure;
    const directory = new URL("../prisma/migrations/", import.meta.url);
    const entries = await readdir(directory, { withFileTypes: true });
    const migrations = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const name of migrations) await access(fileURLToPath(new URL(`${name}/migration.sql`, directory)));
    output = await preflight.runStagingPreflight(process.env, migrations, async (expected) => {
      client = getPrismaClient();
      return inspectStagingDatabase(client, expected);
    });
  } catch (error) {
    output = failure(error);
  } finally {
    try {
      await client?.$disconnect();
    } catch {
      output = failure(undefined);
    }
  }
  console.log(JSON.stringify(output));
  if (output.status === "FAILED") process.exitCode = 1;
}

void main();
