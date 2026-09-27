import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { seedApprovedPublicContent } from "../../src/modules/portfolio/seed-approved-public-content";

export default async function setupE2EContent(): Promise<void> {
  const localEnvPath = resolve(".env.test.local");
  if (!process.env.TEST_DATABASE_URL && existsSync(localEnvPath)) process.loadEnvFile(localEnvPath);
  const connectionString = process.env.TEST_DATABASE_URL ??
    (process.env.CI ? "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public" : "");
  if (!connectionString) throw new Error("TEST_DATABASE_URL wajib untuk menyiapkan konten E2E.");
  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !/(^|[-_])test([-_]|$)/i.test(databaseName)) {
    throw new Error("Setup E2E hanya boleh memakai PostgreSQL test di loopback.");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });
  try {
    await seedApprovedPublicContent(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
