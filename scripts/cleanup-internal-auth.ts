import { createRequire } from "node:module";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { InternalAuthCleanupRepository } from "../src/modules/customer-auth/internal-cleanup";
import { isInternalAuthDatabase } from "../src/modules/customer-auth/internal-testing";

// Paths resolve from this repository, independent of the scheduler working dir.
const root = join(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const dotenv: typeof import("dotenv") = require("dotenv");
dotenv.config({ path: join(root, ".env.local"), quiet: true });
if (!process.env.NODE_ENV) Object.assign(process.env, { NODE_ENV: "development" });
const dryRun = !process.argv.includes("--execute");
let prisma: PrismaClient | undefined;
async function log(result: Record<string, unknown>) {
  const directory = join(root, ".local", "internal-auth");
  await mkdir(directory, { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), ...result });
  await appendFile(join(directory, "cleanup.jsonl"), line + "\n");
  console.log(line);
}
try {
  if (process.argv.slice(2).some(arg => !["--execute", "--dry-run"].includes(arg)) || process.argv.includes("--execute") && process.argv.includes("--dry-run")) throw new Error("INVALID_ARGUMENTS");
  if (!isInternalAuthDatabase()) throw new Error("ENVIRONMENT_REJECTED");
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, connectionTimeoutMillis: 5000, max: 1 }) });
  await log({ status: "completed", ...await new InternalAuthCleanupRepository(prisma).cleanup(new Date(), dryRun) });
} catch (error) {
  const code = error instanceof Error && ["ENVIRONMENT_REJECTED", "INVALID_ARGUMENTS"].includes(error.message) ? error.message : "DATABASE_OR_JOB_FAILED";
  await log({ status: "failed", category: code });
  process.exitCode = 1;
} finally { await prisma?.$disconnect(); }
if (process.exitCode) process.exit(process.exitCode);
