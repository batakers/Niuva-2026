import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedApprovedPublicContent } from "../src/modules/portfolio/seed-approved-public-content";

config({ path: ".env.test.local" });

function getSafeTestDatabaseUrl(): string {
  const candidate = process.env.TEST_DATABASE_URL?.trim();
  if (!candidate) {
    throw new Error("TEST_DATABASE_URL wajib tersedia untuk seed konten publik.");
  }

  const url = new URL(candidate);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL harus menggunakan PostgreSQL.");
  }

  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error("Seed konten publik hanya menerima TEST_DATABASE_URL loopback.");
  }

  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
    throw new Error("Nama database seed harus memuat marker test yang terpisah.");
  }

  return url.toString();
}

const databaseUrl = getSafeTestDatabaseUrl();
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    max: 1,
  }),
});

try {
  const result = await seedApprovedPublicContent(prisma);
  console.log(
    `Seed konten publik selesai: ${result.services} layanan, ${result.projects} proyek, ${result.media} media.`,
  );
} finally {
  await prisma.$disconnect();
}
