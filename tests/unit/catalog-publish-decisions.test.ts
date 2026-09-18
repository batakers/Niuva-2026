import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  catalogPublishApprovalSchema,
  resolveCatalogPublishApproval,
} from "@/modules/catalog/publish-decisions";

const expectedProducts = [
  { name: "Ready product", sourceProductId: "101" },
  { name: "Custom product", sourceProductId: "202" },
] as const;

function approval(products: unknown) {
  return {
    approvalStatus: "OWNER_APPROVED",
    approvedAt: "2026-09-18",
    products,
    skuPolicy: "SOURCE_ID_V1",
    version: 1,
  };
}

describe("catalog publish approval", () => {
  it("resolves an exact Owner decision for every source product", () => {
    const resolved = resolveCatalogPublishApproval(
      approval([
        {
          decision: "PUBLISH_READY_MADE",
          name: "Ready product",
          sourceProductId: "101",
        },
        {
          decision: "HOLD_CUSTOM_FLOW",
          name: "Custom product",
          sourceProductId: "202",
        },
      ]),
      expectedProducts,
    );

    expect(resolved.skuPolicy).toBe("SOURCE_ID_V1");
    expect(resolved.decisions.get("101")).toBe("PUBLISH_READY_MADE");
    expect(resolved.decisions.get("202")).toBe("HOLD_CUSTOM_FLOW");
  });

  it("rejects approval that omits a source product", () => {
    expect(() => resolveCatalogPublishApproval(
      approval([
        {
          decision: "PUBLISH_READY_MADE",
          name: "Ready product",
          sourceProductId: "101",
        },
      ]),
      expectedProducts,
    )).toThrow("202");
  });

  it("rejects a product name that does not match its source ID", () => {
    expect(() => resolveCatalogPublishApproval(
      approval([
        {
          decision: "PUBLISH_READY_MADE",
          name: "Wrong product",
          sourceProductId: "101",
        },
        {
          decision: "HOLD_CUSTOM_FLOW",
          name: "Custom product",
          sourceProductId: "202",
        },
      ]),
      expectedProducts,
    )).toThrow("tidak cocok");
  });

  it("rejects an invalid approval date", () => {
    const parsed = catalogPublishApprovalSchema.safeParse({
      ...approval([
        {
          decision: "PUBLISH_READY_MADE",
          name: "Ready product",
          sourceProductId: "101",
        },
      ]),
      approvedAt: "2026-99-99",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ["approvedAt"] }),
      ]));
    }
  });

  it("records the approved 3/5 split while retaining media for every draft", () => {
    const datasetRoot = resolve(
      process.cwd(),
      "docs/source/Dataset Shop Niuva",
    );
    const approved = JSON.parse(
      readFileSync(resolve(datasetRoot, "catalog-publish-decisions.json"), "utf8"),
    ) as unknown;
    const source = JSON.parse(
      readFileSync(resolve(datasetRoot, "Niuva_Tokopedia_Products.json"), "utf8"),
    ) as { products: { nama_produk: string; product_id: string }[] };
    const manifest = JSON.parse(
      readFileSync(resolve(datasetRoot, "catalog-seed.json"), "utf8"),
    ) as {
      products: {
        isPublished: boolean;
        media: unknown[];
        name: string;
      }[];
    };
    const resolved = resolveCatalogPublishApproval(
      approved,
      source.products.map((product) => ({
        name: product.nama_produk,
        sourceProductId: product.product_id,
      })),
    );

    const publishedSourceIds = [...resolved.decisions.entries()]
      .filter(([, decision]) => decision === "PUBLISH_READY_MADE")
      .map(([sourceProductId]) => sourceProductId)
      .sort();

    expect(publishedSourceIds).toEqual([
      "103342790916",
      "103343689816",
      "103726663896",
    ]);
    expect([...resolved.decisions.values()].filter(
      (decision) => decision === "HOLD_CUSTOM_FLOW",
    )).toHaveLength(5);
    expect(manifest.products.filter((product) => product.isPublished)).toHaveLength(3);
    expect(manifest.products.every((product) => product.media.length > 0)).toBe(true);
  });
});
