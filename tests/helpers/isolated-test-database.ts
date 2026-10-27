import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";

export async function isolatedTestDatabase(scope: "status" | "staging") {
  const url = new URL(getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }));
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Isolated test database must use a loopback host");
  const name = `niuva_${scope}_test_${randomUUID().replaceAll("-", "")}`;
  if (!/^niuva_(?:status|staging)_test_[a-f0-9]{32}$/.test(name)) throw new Error("Invalid isolated fixture database");
  const parent = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) });
  try {
    await parent.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await parent.$disconnect();
  }
  url.pathname = `/${name}`;
  const isolatedUrl = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: url.href });
  try {
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: isolatedUrl, TEST_DATABASE_URL: isolatedUrl, NODE_ENV: "test" }, stdio: "pipe", timeout: 60000,
    });
  } catch {
    throw new Error(`Migration failed for isolated fixture ${name}; database retained`);
  }
  console.info(`Isolated test database: ${name}`);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: isolatedUrl }) });
  return { prisma, url: isolatedUrl, async dispose() { await prisma.$disconnect(); } };
}
