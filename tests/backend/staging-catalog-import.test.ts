import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { applyPackageEstimates } from "@/modules/catalog/package-estimates";
import { catalogSeedSchema, type CatalogSeedInput } from "@/modules/catalog/seed";
import { assertShippableCatalog, assertStagingCatalogImportEnvironment, STAGING_CATALOG_CONFIRMATION } from "@/modules/catalog/staging-import";

const dataset = (name: string): unknown => JSON.parse(readFileSync(resolve("docs/source/Dataset Shop Niuva", name), "utf8"));
const seed = catalogSeedSchema.parse(dataset("catalog-seed.json"));
const estimates = dataset("catalog-package-estimates.json") as { packages: { sku: string }[] } & Record<string, unknown>;
const staging = {
  NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_PROVIDER_MODE: "sandbox", NIUVA_DATABASE_BINDING_ID: "00000000-0000-4000-8000-000000000001",
  DATABASE_URL: "postgresql://fixture@db.example.test/niuva_staging?sslmode=verify-full", CATALOG_IMPORT_CONFIRMATION: STAGING_CATALOG_CONFIRMATION,
};

describe("Owner catalog decisions (28 October 2026)", () => {
  it("publishes all eight products with package dimensions on every variant", () => {
    expect(seed.products).toHaveLength(8);
    expect(seed.products.every((product) => product.isPublished)).toBe(true);
    const variants = seed.products.flatMap((product) => product.variants);
    expect(variants).toHaveLength(34);
    for (const variant of variants) expect([variant.lengthCm, variant.widthCm, variant.heightCm].every((value) => Number(value) > 0), variant.sku).toBe(true);
    expect(() => assertShippableCatalog(seed)).not.toThrow();
  });

  it("requires exactly one positive estimate per SKU", () => {
    const withoutDims: CatalogSeedInput = { ...seed, products: seed.products.map((product) => ({ ...product, variants: product.variants.map((variant) => ({ ...variant, lengthCm: undefined, widthCm: undefined, heightCm: undefined })) })) };
    expect(applyPackageEstimates(withoutDims, estimates).products[0].variants[0].lengthCm).toBeDefined();
    expect(() => applyPackageEstimates(withoutDims, { ...estimates, packages: estimates.packages.slice(1) })).toThrow(/belum ada/);
    expect(() => applyPackageEstimates(withoutDims, { ...estimates, packages: [...estimates.packages, { ...estimates.packages[0], sku: "999" }] })).toThrow(/tidak ada di katalog/);
    expect(() => applyPackageEstimates(withoutDims, { ...estimates, packages: [{ ...estimates.packages[0], lengthCm: "0" }, ...estimates.packages.slice(1)] })).toThrow();
    expect(() => assertShippableCatalog(withoutDims)).toThrow(expect.objectContaining({ reason: "NOT_SHIPPABLE" }));
  });
});

describe("staging catalog import environment", () => {
  it("accepts only a confirmed, explicit staging tier with verify-full TLS and a binding", () => {
    expect(assertStagingCatalogImportEnvironment(staging)).toEqual({ tier: "staging", bindingId: staging.NIUVA_DATABASE_BINDING_ID });
    const cases: [Record<string, string | undefined>, string][] = [
      [{ CATALOG_IMPORT_CONFIRMATION: "yes" }, "CONFIRMATION_REQUIRED"],
      [{ NIUVA_DEPLOYMENT_TIER: "production" }, "NOT_STAGING"],
      [{ NIUVA_DEPLOYMENT_TIER: undefined }, "NOT_STAGING"],
      [{ DATABASE_URL: "postgresql://fixture@db.example.test/niuva_staging?sslmode=require" }, "DATABASE_TLS_REQUIRED"],
      [{ NIUVA_DATABASE_BINDING_ID: "" }, "BINDING_CONFIG_INVALID"],
    ];
    for (const [change, reason] of cases) expect(() => assertStagingCatalogImportEnvironment({ ...staging, ...change }), reason).toThrow(expect.objectContaining({ reason }));
  });
});
