import { describe, expect, it } from "vitest";

import {
  CUSTOM_FLOW_PRODUCT_OPTIONS,
  CUSTOM_PRODUCT_UNSPECIFIED,
  customProductInterestInputSchema,
  formatCustomPrintIntakeNotes,
} from "@/modules/custom-print/product-intake";

describe("custom product intake catalog", () => {
  it("exposes exactly the five Owner-approved custom-flow products", () => {
    expect(CUSTOM_FLOW_PRODUCT_OPTIONS).toHaveLength(5);
    expect(CUSTOM_FLOW_PRODUCT_OPTIONS.every((product) => product.imagePath !== null)).toBe(true);
    expect(new Set(CUSTOM_FLOW_PRODUCT_OPTIONS.map((product) => product.sourceProductId)).size).toBe(5);
  });

  it("defaults legacy requests to an explicitly unspecified product", () => {
    expect(customProductInterestInputSchema.parse(undefined)).toBe(CUSTOM_PRODUCT_UNSPECIFIED);
    expect(customProductInterestInputSchema.parse("")).toBe(CUSTOM_PRODUCT_UNSPECIFIED);
  });

  it("rejects arbitrary product ids and keeps the operator note canonical", () => {
    expect(customProductInterestInputSchema.safeParse("not-a-source-id").success).toBe(false);

    const product = CUSTOM_FLOW_PRODUCT_OPTIONS[0];
    expect(product).toBeDefined();
    const notes = formatCustomPrintIntakeNotes({
      faculty: "Fakultas Teknik",
      notes: "Tali toga warna biru",
      productInterest: product?.sourceProductId ?? CUSTOM_PRODUCT_UNSPECIFIED,
      requestedSize: "12 cm",
      targetDeadline: "2026-10-01",
    });

    expect(notes).toContain("[Intake produk custom]");
    expect(notes).toContain(`source ID ${product?.sourceProductId}`);
    expect(notes).toContain("Ukuran target: 12 cm");
    expect(notes).toContain("Fakultas/identitas: Fakultas Teknik");
    expect(notes).toContain("Target diperlukan: 2026-10-01");
    expect(notes).toContain("Tali toga warna biru");
  });
});
