import { describe, expect, it } from "vitest";

import {
  CUSTOM_FLOW_PRODUCT_OPTIONS,
  CUSTOM_PRODUCT_UNSPECIFIED,
  customProductInterestInputSchema,
  formatCustomPrintIntakeNotes,
} from "@/modules/custom-print/product-intake";

describe("custom product intake catalog", () => {
  it("offers no catalog products: Custom Print takes customer designs only (Owner, 28 October 2026)", () => {
    // The former custom-flow listings are now sold in the Shop.
    expect(CUSTOM_FLOW_PRODUCT_OPTIONS).toHaveLength(0);
  });

  it("defaults legacy requests to an explicitly unspecified product", () => {
    expect(customProductInterestInputSchema.parse(undefined)).toBe(CUSTOM_PRODUCT_UNSPECIFIED);
    expect(customProductInterestInputSchema.parse("")).toBe(CUSTOM_PRODUCT_UNSPECIFIED);
  });

  it("rejects arbitrary product ids and keeps the operator note canonical", () => {
    expect(customProductInterestInputSchema.safeParse("not-a-source-id").success).toBe(false);

    // A former custom-flow source ID is no longer a valid intake choice.
    expect(customProductInterestInputSchema.safeParse("103339597166").success).toBe(false);
    const notes = formatCustomPrintIntakeNotes({
      faculty: "Fakultas Teknik",
      notes: "Tali toga warna biru",
      productInterest: CUSTOM_PRODUCT_UNSPECIFIED,
      requestedSize: "12 cm",
      targetDeadline: "2026-10-01",
    });

    expect(notes).toContain("[Intake produk custom]");
    expect(notes).toContain("Produk referensi: Belum menentukan produk katalog / kebutuhan custom lain");
    expect(notes).toContain("Ukuran target: 12 cm");
    expect(notes).toContain("Fakultas/identitas: Fakultas Teknik");
    expect(notes).toContain("Target diperlukan: 2026-10-01");
    expect(notes).toContain("Tali toga warna biru");
  });
});
