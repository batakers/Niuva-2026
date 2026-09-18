import { z } from "zod";

const sourceProductIdSchema = z.string().regex(/^[1-9]\d*$/);

const productDecisionSchema = z.object({
  decision: z.enum(["PUBLISH_READY_MADE", "HOLD_CUSTOM_FLOW"]),
  name: z.string().trim().min(1),
  sourceProductId: sourceProductIdSchema,
}).strict();

export const catalogPublishApprovalSchema = z
  .object({
    approvalStatus: z.literal("OWNER_APPROVED"),
    approvedAt: z.iso.date(),
    products: z.array(productDecisionSchema).min(1),
    skuPolicy: z.literal("SOURCE_ID_V1"),
    version: z.literal(1),
  })
  .strict()
  .superRefine((value, context) => {
    const sourceProductIds = new Set<string>();
    for (const [index, product] of value.products.entries()) {
      if (sourceProductIds.has(product.sourceProductId)) {
        context.addIssue({
          code: "custom",
          message: `Keputusan produk duplikat: ${product.sourceProductId}.`,
          path: ["products", index, "sourceProductId"],
        });
      }
      sourceProductIds.add(product.sourceProductId);
    }
  });

export type CatalogPublishDecision = z.infer<
  typeof productDecisionSchema
>["decision"];

export type ExpectedCatalogProduct = Readonly<{
  name: string;
  sourceProductId: string;
}>;

export type ResolvedCatalogPublishApproval = Readonly<{
  approvedAt: string;
  decisions: ReadonlyMap<string, CatalogPublishDecision>;
  skuPolicy: "SOURCE_ID_V1";
}>;

export function resolveCatalogPublishApproval(
  input: unknown,
  expectedProducts: readonly ExpectedCatalogProduct[],
): ResolvedCatalogPublishApproval {
  const parsed = catalogPublishApprovalSchema.parse(input);
  const expectedById = new Map(
    expectedProducts.map((product) => [product.sourceProductId, product.name]),
  );
  if (expectedById.size !== expectedProducts.length) {
    throw new Error("Dataset sumber memiliki product_id duplikat.");
  }

  const decisions = new Map<string, CatalogPublishDecision>();
  for (const product of parsed.products) {
    const expectedName = expectedById.get(product.sourceProductId);
    if (expectedName === undefined) {
      throw new Error(
        `Keputusan publish memuat produk yang tidak ada di dataset: ${product.sourceProductId}.`,
      );
    }
    if (expectedName !== product.name) {
      throw new Error(
        `Nama produk ${product.sourceProductId} tidak cocok dengan dataset sumber.`,
      );
    }
    decisions.set(product.sourceProductId, product.decision);
  }

  const missingProductIds = [...expectedById.keys()].filter(
    (sourceProductId) => !decisions.has(sourceProductId),
  );
  if (missingProductIds.length > 0) {
    throw new Error(
      `Keputusan publish belum mencakup product_id: ${missingProductIds.join(", ")}.`,
    );
  }

  return {
    approvedAt: parsed.approvedAt,
    decisions,
    skuPolicy: parsed.skuPolicy,
  };
}
