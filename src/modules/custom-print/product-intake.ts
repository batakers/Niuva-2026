import { z } from "zod";

import catalogApproval from "../../../docs/source/Dataset Shop Niuva/catalog-publish-decisions.json";
import catalogSeed from "../../../docs/source/Dataset Shop Niuva/catalog-seed.json";
import { catalogPublishApprovalSchema } from "@/modules/catalog/publish-decisions";
import { catalogSeedSchema } from "@/modules/catalog/seed";

export const CUSTOM_PRODUCT_UNSPECIFIED = "CUSTOM_UNSPECIFIED" as const;

export type CustomFlowProductOption = Readonly<{
  imagePath: string | null;
  name: string;
  slug: string;
  sourceProductId: string;
  variantNames: readonly string[];
}>;

const resolvedSeed = catalogSeedSchema.parse(catalogSeed);
const resolvedApproval = catalogPublishApprovalSchema.parse(catalogApproval);

const productsByName = new Map(
  resolvedSeed.products.map((product) => [product.name, product]),
);

export const CUSTOM_FLOW_PRODUCT_OPTIONS: readonly CustomFlowProductOption[] =
  resolvedApproval.products
    .filter((decision) => decision.decision === "HOLD_CUSTOM_FLOW")
    .map((decision) => {
      const product = productsByName.get(decision.name);
      if (product === undefined) {
        throw new Error(
          `Produk custom ${decision.sourceProductId} tidak ditemukan di manifest katalog.`,
        );
      }

      return {
        imagePath: product.media[0] === undefined
          ? null
          : `/${product.media[0].storageKey}`,
        name: product.name,
        slug: product.slug,
        sourceProductId: decision.sourceProductId,
        variantNames: product.variants.map((variant) => variant.name),
      };
    });

const customFlowProductIds = new Set(
  CUSTOM_FLOW_PRODUCT_OPTIONS.map((product) => product.sourceProductId),
);

export const customProductInterestSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value === CUSTOM_PRODUCT_UNSPECIFIED || customFlowProductIds.has(value),
    "Pilih produk custom yang tersedia atau tandai kebutuhan custom lain.",
  );

export const customProductInterestInputSchema = z.preprocess(
  (value) => (
    typeof value !== "string" || value.trim().length === 0
      ? CUSTOM_PRODUCT_UNSPECIFIED
      : value
  ),
  customProductInterestSchema,
);

export function getCustomFlowProductOption(
  sourceProductId: string,
): CustomFlowProductOption | null {
  return CUSTOM_FLOW_PRODUCT_OPTIONS.find(
    (product) => product.sourceProductId === sourceProductId,
  ) ?? null;
}

export function formatCustomPrintIntakeNotes(input: Readonly<{
  faculty?: string;
  notes?: string;
  productInterest: string;
  requestedSize?: string;
  targetDeadline?: string;
}>): string {
  const product = input.productInterest === CUSTOM_PRODUCT_UNSPECIFIED
    ? null
    : getCustomFlowProductOption(input.productInterest);
  const productLabel = product === null
    ? "Belum menentukan produk katalog / kebutuhan custom lain"
    : `${product.name} (source ID ${product.sourceProductId})`;
  const lines = [
    "[Intake produk custom]",
    `Produk referensi: ${productLabel}`,
  ];

  if (input.requestedSize?.trim()) {
    lines.push(`Ukuran target: ${input.requestedSize.trim()}`);
  }
  if (input.faculty?.trim()) {
    lines.push(`Fakultas/identitas: ${input.faculty.trim()}`);
  }
  if (input.targetDeadline?.trim()) {
    lines.push(`Target diperlukan: ${input.targetDeadline.trim()}`);
  }
  if (input.notes?.trim()) {
    lines.push("Catatan customer:", input.notes.trim());
  }

  return lines.join("\n");
}
