import type { DatabaseBindingExpectation } from "../database-binding/core";
import type { DatabaseBindingRepository } from "../database-binding/repository";
import { checkStagingOperatorEnvironment, type StagingOperatorEnvironmentFailure } from "../database-binding/staging-operator";
import { seedCatalogInTransaction, type CatalogSeedInput, type CatalogSeedResult } from "./seed";

// One-off Owner import of the reviewed Shop catalog into the staging database
// (Owner decision 28 October 2026). Upserts by slug/SKU, records opening stock
// for new variants, never deletes other rows and never calls a provider.

export const STAGING_CATALOG_CONFIRMATION = "I_UNDERSTAND_STAGING_CATALOG_IMPORT";

export class StagingCatalogImportError extends Error {
  constructor(readonly reason: "CONFIRMATION_REQUIRED" | "NOT_SHIPPABLE" | StagingOperatorEnvironmentFailure) {
    super(`Impor katalog staging ditolak (${reason}).`);
    this.name = "StagingCatalogImportError";
  }
}

export function assertStagingCatalogImportEnvironment(source: Readonly<Record<string, string | undefined>>): DatabaseBindingExpectation {
  if (source.CATALOG_IMPORT_CONFIRMATION !== STAGING_CATALOG_CONFIRMATION) throw new StagingCatalogImportError("CONFIRMATION_REQUIRED");
  const checked = checkStagingOperatorEnvironment(source);
  if (!checked.ok) throw new StagingCatalogImportError(checked.reason);
  return checked.expected;
}

/** Retail shipping rates need package dimensions on every active variant of a published product. */
export function assertShippableCatalog(input: CatalogSeedInput): void {
  for (const product of input.products) {
    if (!product.isPublished) continue;
    for (const variant of product.variants) {
      if (variant.isActive && !(variant.lengthCm && variant.widthCm && variant.heightCm)) throw new StagingCatalogImportError("NOT_SHIPPABLE");
    }
  }
}

export async function importStagingCatalog(bindings: DatabaseBindingRepository, expected: DatabaseBindingExpectation, input: CatalogSeedInput): Promise<CatalogSeedResult> {
  assertShippableCatalog(input);
  return bindings.withVerifiedBinding(expected, async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-staging-catalog-import'))`;
    return seedCatalogInTransaction(tx, input);
  }, { maxWait: 10_000, timeout: 180_000 });
}
