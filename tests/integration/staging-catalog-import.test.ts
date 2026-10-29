import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { catalogSeedSchema } from "@/modules/catalog/seed";
import { importStagingCatalog } from "@/modules/catalog/staging-import";
import { PrismaDatabaseBindingRepository } from "@/modules/database-binding/repository";

import { isolatedTestDatabase } from "../helpers/isolated-test-database";

let database: Awaited<ReturnType<typeof isolatedTestDatabase>> | undefined;
let prisma: PrismaClient;
const bindingId = randomUUID();
const input = catalogSeedSchema.parse(JSON.parse(readFileSync(resolve("docs/source/Dataset Shop Niuva/catalog-seed.json"), "utf8")));

beforeAll(async () => {
  database = await isolatedTestDatabase("staging");
  prisma = database.prisma;
  if (await prisma.product.count() || await prisma.deploymentDatabaseBinding.count()) throw new Error("Catalog import fixture requires a fresh isolated database.");
  await prisma.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "staging" } });
}, 90000);

afterAll(async () => { await database?.dispose(); });

const counts = async () => ({
  categories: await prisma.category.count(),
  products: await prisma.product.count({ where: { isPublished: true } }),
  variants: await prisma.productVariant.count({ where: { lengthCm: { gt: 0 }, widthCm: { gt: 0 }, heightCm: { gt: 0 } } }),
  media: await prisma.productMedia.count(),
  openings: await prisma.stockMovement.count({ where: { kind: "OPENING_BALANCE" } }),
});

describe("staging catalog import (isolated database)", () => {
  it("rejects a database whose binding marker does not match, without writing", async () => {
    await expect(importStagingCatalog(new PrismaDatabaseBindingRepository(prisma), { tier: "staging", bindingId: randomUUID() }, input)).rejects.toThrow();
    expect(await prisma.product.count()).toBe(0);
  });

  it("imports the published, shippable catalog once and is idempotent on a second run", async () => {
    const repository = new PrismaDatabaseBindingRepository(prisma);
    expect(await importStagingCatalog(repository, { tier: "staging", bindingId }, input)).toEqual({ categories: 4, products: 8, variants: 34, media: 50 });
    const first = await counts();
    expect(first).toEqual({ categories: 4, products: 8, variants: 34, media: 50, openings: 34 });

    await importStagingCatalog(repository, { tier: "staging", bindingId }, input);
    expect(await counts()).toEqual(first);
  });
});
