import { z } from "zod";
import type { CatalogSeedInput } from "./seed";

// Owner instruction (28 October 2026): the source dataset has no package
// dimensions, so the catalog carries reviewed estimates per SKU that the Owner
// can edit per variant in Admin. Retail shipping rates require all three.

const dimension = z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/).refine((value) => Number(value) > 0, "Dimensi harus positif.");

const packageSchema = z.strictObject({
  sku: z.string().trim().min(1),
  sizeClass: z.string().trim().regex(/^[A-Z0-9_]{1,40}$/),
  lengthCm: dimension,
  widthCm: dimension,
  heightCm: dimension,
});

export const catalogPackageEstimatesSchema = z.strictObject({
  version: z.literal(1),
  basis: z.string().trim().regex(/^OWNER_ESTIMATE_\d{4}-\d{2}-\d{2}$/),
  approvedAt: z.iso.date(),
  note: z.string().trim().min(1),
  sizeClasses: z.record(z.string(), z.strictObject({ lengthCm: dimension, widthCm: dimension, heightCm: dimension })),
  packages: z.array(packageSchema).min(1),
});

export type CatalogPackageEstimates = z.infer<typeof catalogPackageEstimatesSchema>;

/** Fills package dimensions per SKU; every seed SKU needs exactly one estimate and nothing extra. */
export function applyPackageEstimates(input: CatalogSeedInput, raw: unknown): CatalogSeedInput {
  const estimates = catalogPackageEstimatesSchema.parse(raw);
  const bySku = new Map<string, CatalogPackageEstimates["packages"][number]>();
  for (const estimate of estimates.packages) {
    if (bySku.has(estimate.sku)) throw new Error(`Estimasi paket duplikat untuk SKU ${estimate.sku}.`);
    if (!(estimate.sizeClass in estimates.sizeClasses)) throw new Error(`Kelas ukuran tidak dikenal untuk SKU ${estimate.sku}.`);
    bySku.set(estimate.sku, estimate);
  }
  const seen = new Set<string>();
  const products = input.products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => {
      const estimate = bySku.get(variant.sku);
      if (estimate === undefined) throw new Error(`Estimasi paket belum ada untuk SKU ${variant.sku}.`);
      seen.add(variant.sku);
      return { ...variant, lengthCm: estimate.lengthCm, widthCm: estimate.widthCm, heightCm: estimate.heightCm };
    }),
  }));
  const extra = [...bySku.keys()].filter((sku) => !seen.has(sku));
  if (extra.length > 0) throw new Error(`Estimasi paket untuk SKU yang tidak ada di katalog: ${extra.join(", ")}.`);

  return { ...input, products };
}
