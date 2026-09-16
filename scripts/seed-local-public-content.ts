import { stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { getApprovedPortfolioProjects } from "../src/modules/portfolio/public-content";
import { seedApprovedPublicContent } from "../src/modules/portfolio/seed-approved-public-content";

process.loadEnvFile(".env.local");

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed konten publik tidak boleh berjalan pada NODE_ENV production.");
}

if (process.env.PUBLIC_CONTENT_SEED_CONFIRMATION !== "I_UNDERSTAND_NON_PRODUCTION") {
  throw new Error(
    "Set PUBLIC_CONTENT_SEED_CONFIRMATION=I_UNDERSTAND_NON_PRODUCTION untuk seed loopback yang disengaja.",
  );
}

function getSafeDatabaseUrl(): string {
  const candidate =
    process.env.PUBLIC_CONTENT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!candidate) {
    throw new Error("PUBLIC_CONTENT_DATABASE_URL atau DATABASE_URL wajib tersedia.");
  }

  const url = new URL(candidate);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  ) {
    throw new Error("Seed konten publik hanya menerima PostgreSQL loopback.");
  }

  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!/(^|[-_])(dev|demo|test)([-_]|$)/i.test(databaseName)) {
    throw new Error(
      "Nama database seed harus memuat marker dev, demo, atau test yang terpisah.",
    );
  }

  return url.toString();
}

async function assertMappedPortfolioMediaExists(): Promise<void> {
  const publicRoot = resolve(process.cwd(), "public");

  for (const project of getApprovedPortfolioProjects()) {
    for (const media of project.media) {
      const assetPath = resolve(publicRoot, ...media.storageKey.split("/"));
      const relativePath = relative(publicRoot, assetPath);
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new Error(`Mapping media portfolio tidak berada di public/: ${media.storageKey}.`);
      }

      try {
        const asset = await stat(assetPath);
        if (!asset.isFile()) throw new Error("not a file");
      } catch {
        throw new Error(`Asset media portfolio belum tersedia: ${media.storageKey}.`);
      }
    }
  }
}

await assertMappedPortfolioMediaExists();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: getSafeDatabaseUrl(),
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
