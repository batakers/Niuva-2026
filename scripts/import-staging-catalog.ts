import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaDatabaseBindingRepository } from "../src/modules/database-binding/repository";
import { assertCatalogMediaFilesExist } from "../src/modules/catalog/media-files";
import { catalogSeedSchema } from "../src/modules/catalog/seed";
import { assertStagingCatalogImportEnvironment, importStagingCatalog, StagingCatalogImportError } from "../src/modules/catalog/staging-import";

// Uses only the explicitly supplied process environment (see
// scripts/import-staging-catalog.ps1); never loads private env files.
const seedFile = process.env.CATALOG_SEED_FILE?.trim() || "docs/source/Dataset Shop Niuva/catalog-seed.json";
let prisma: PrismaClient | undefined;
try {
  const expected = assertStagingCatalogImportEnvironment(process.env);
  const input = catalogSeedSchema.parse(JSON.parse(await readFile(seedFile, "utf8")));
  await assertCatalogMediaFilesExist(input, resolve(process.cwd(), "public"));
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "", max: 1 }) });
  const result = await importStagingCatalog(new PrismaDatabaseBindingRepository(prisma), expected, input);
  console.log(`Katalog staging diimpor: ${result.categories} kategori, ${result.products} produk, ${result.variants} varian, ${result.media} media.`);
} catch (error) {
  const reason = error instanceof StagingCatalogImportError ? error.reason : "DATABASE_OR_BINDING_REJECTED";
  console.error(`Impor katalog staging gagal (${reason}). Kredensial tidak ditampilkan.`);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
