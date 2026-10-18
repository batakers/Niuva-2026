import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { seedApprovedPublicContent } from "../../src/modules/portfolio/seed-approved-public-content";
import { E2E_OUTBOX_ENV } from "./helpers/outbox";

export default async function setupE2EContent(): Promise<() => Promise<void>> {
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
  let createdMarker = false;
  try {
    const marker = await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } });
    if (marker && (marker.bindingId !== E2E_OUTBOX_ENV.NIUVA_DATABASE_BINDING_ID || marker.tier !== "local-test")) throw new Error("E2E refuses a foreign database marker.");
    if (!marker) {
      await prisma.deploymentDatabaseBinding.create({ data: { id: 1, bindingId: E2E_OUTBOX_ENV.NIUVA_DATABASE_BINDING_ID, tier: "local-test" } });
      createdMarker = true;
    }
    await seedApprovedPublicContent(prisma);
    // Mock OAuth exercises login to an existing isolated Customer. It must not
    // bypass the age/policy proof required by new-account creation.
    await prisma.customer.upsert({
      where: { googleSubject: "local-demo-google-subject" },
      create: { email: "demo-customer@example.test", normalizedEmail: "demo-customer@example.test", googleSubject: "local-demo-google-subject", displayName: "Demo Customer", emailVerifiedAt: new Date() },
      update: {},
    });
  } catch (error) {
    if (createdMarker) await prisma.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId: E2E_OUTBOX_ENV.NIUVA_DATABASE_BINDING_ID, tier: "local-test" } });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
  return async () => {
    if (!createdMarker) return;
    const cleanup = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });
    try { await cleanup.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId: E2E_OUTBOX_ENV.NIUVA_DATABASE_BINDING_ID, tier: "local-test" } }); }
    finally { await cleanup.$disconnect(); }
  };
}
