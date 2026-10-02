import { createRequire } from "node:module";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CustomerPrivacyCleanupRepository } from "../src/modules/customer-privacy/cleanup";
import { isInternalAuthDatabase } from "../src/modules/customer-auth/internal-testing";
const root = join(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const dotenv: typeof import("dotenv") = require("dotenv");
dotenv.config({ path: join(root, ".env.local"), quiet: true });
if (!process.env.NODE_ENV) Object.assign(process.env, { NODE_ENV: "development" });
const dryRun = !process.argv.includes("--execute");
let prisma: PrismaClient | undefined;
async function log(result: Record<string, unknown>) {
  const directory = join(root, ".local", "customer-privacy");
  await mkdir(directory, { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), ...result });
  await appendFile(join(directory, "cleanup.jsonl"), line + "\n");
  console.log(line);
}
try {
  const args = process.argv.slice(2);
  if (args.some(arg => !["--execute", "--dry-run"].includes(arg)) || args.includes("--execute") && args.includes("--dry-run")) throw new Error("INVALID_ARGUMENTS");
  // Independent of the registration switch: already-created data still expires.
  if (!isInternalAuthDatabase()) throw new Error("ENVIRONMENT_REJECTED");
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, connectionTimeoutMillis: 5000, max: 1 }) });
  await log({ status: "completed", ...await new CustomerPrivacyCleanupRepository(prisma).cleanup(new Date(), dryRun) });
} catch (error) {
  const category = error instanceof Error && ["ENVIRONMENT_REJECTED", "INVALID_ARGUMENTS"].includes(error.message) ? error.message : "DATABASE_OR_JOB_FAILED";
  await log({ status: "failed", category }); process.exitCode = 1;
} finally { await prisma?.$disconnect(); }
if (process.exitCode) process.exit(process.exitCode);
