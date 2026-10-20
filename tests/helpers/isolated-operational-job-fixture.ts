import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";
import { operationalJobFixture } from "./operational-job-fixture";

export async function isolatedOperationalJobFixture() {
  const url = new URL(getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }));
  const name = `niuva_status_test_${randomUUID().replaceAll("-", "")}`;
  if (!/^niuva_status_test_[a-f0-9]{32}$/.test(name)) throw new Error("Invalid isolated fixture database");
  await getPrismaClient().$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  url.pathname = `/${name}`;
  const isolatedUrl = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: url.href });
  try {
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: isolatedUrl, TEST_DATABASE_URL: isolatedUrl, NODE_ENV: "test" }, stdio: "pipe", timeout: 60000,
    });
  } catch { throw new Error(`Migration failed for isolated fixture ${name}; database retained`); }
  console.info(`Isolated payment fixture database: ${name}`);
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: isolatedUrl }) });
  try {
    const fixture = await operationalJobFixture({ prisma: admin, url: isolatedUrl });
    return { ...fixture, async dispose() { try { await fixture.dispose(); } finally { await admin.$disconnect(); } } };
  } catch (error) { await admin.$disconnect(); throw error; }
}
