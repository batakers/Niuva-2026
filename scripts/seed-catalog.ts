import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { catalogSeedSchema, seedCatalog } from "../src/modules/catalog/seed";

process.loadEnvFile(".env.local");

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed katalog tidak boleh berjalan pada NODE_ENV production.");
}
if (process.env.CATALOG_SEED_CONFIRMATION !== "I_UNDERSTAND_NON_PRODUCTION") {
  throw new Error("Set CATALOG_SEED_CONFIRMATION=I_UNDERSTAND_NON_PRODUCTION untuk seed loopback yang disengaja.");
}

const seedFile = process.env.CATALOG_SEED_FILE?.trim();
if (!seedFile) throw new Error("CATALOG_SEED_FILE wajib menunjuk dataset katalog Owner.");

function getSafeDatabaseUrl(): string {
  const candidate = process.env.CATALOG_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!candidate) throw new Error("CATALOG_DATABASE_URL atau DATABASE_URL wajib tersedia.");
  const url = new URL(candidate);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("Seed katalog hanya menerima PostgreSQL loopback.");
  }
  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!/(^|[-_])(dev|demo|test)([-_]|$)/i.test(databaseName)) {
    throw new Error("Nama database seed harus memuat marker dev, demo, atau test yang terpisah.");
  }
  return url.toString();
}

const raw = await readFile(seedFile, "utf8");
const parsed = catalogSeedSchema.parse(JSON.parse(raw));

async function assertMappedProductMediaExists(): Promise<void> {
  const publicRoot = resolve(process.cwd(), "public");
  for (const product of parsed.products) {
    for (const media of product.media) {
      const assetPath = resolve(publicRoot, ...media.storageKey.split("/"));
      const relativePath = relative(publicRoot, assetPath);
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new Error(`Mapping media tidak berada di public/: ${media.storageKey}.`);
      }
      try {
        const asset = await stat(assetPath);
        if (!asset.isFile()) throw new Error("not a file");
      } catch {
        throw new Error(`Asset media belum tersedia untuk mapping ${media.storageKey}.`);
      }
    }
  }
}

await assertMappedProductMediaExists();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getSafeDatabaseUrl(), max: 1 }) });

try {
  const result = await seedCatalog(prisma, parsed);
  console.log(`Seed katalog selesai: ${result.categories} kategori, ${result.products} produk, ${result.variants} varian, ${result.media} media.`);
} finally {
  await prisma.$disconnect();
}
