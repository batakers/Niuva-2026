import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedLocalDemoCatalog } from "../src/modules/demo/seed";

const DEFAULT_LOCAL_DEMO_DATABASE_URL =
  "postgresql://niuva_dev@127.0.0.1:55433/niuva_dev?schema=public";

function getSafeLocalDemoDatabaseUrl(): string {
  const candidate =
    process.env.DEMO_DATABASE_URL?.trim() || DEFAULT_LOCAL_DEMO_DATABASE_URL;
  const url = new URL(candidate);

  if (
    (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  ) {
    throw new Error("DEMO_DATABASE_URL harus menunjuk PostgreSQL loopback.");
  }

  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!/(^|[-_])(dev|demo|test)([-_]|$)/i.test(databaseName)) {
    throw new Error(
      "Nama database demo harus memuat marker dev, demo, atau test yang terpisah.",
    );
  }

  return url.toString();
}

const databaseUrl = getSafeLocalDemoDatabaseUrl();
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    max: 1,
  }),
});

try {
  const result = await seedLocalDemoCatalog(prisma);
  console.log(
    `Seed demo lokal selesai: product ${result.productId}, variant ${result.variantId}.`,
  );
} finally {
  await prisma.$disconnect();
}
