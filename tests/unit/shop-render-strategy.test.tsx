import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/shop",
}));

const getShopPreview = vi.fn();
const getLiveShopProducts = vi.fn();
const getShopProductPreview = vi.fn();
const getLiveShopProduct = vi.fn();
vi.mock("@/features/frontend-preview/server", () => ({
  getLiveShopProduct: (...args: unknown[]) => getLiveShopProduct(...args),
  getLiveShopProducts: (...args: unknown[]) => getLiveShopProducts(...args),
  getShopPreview: (...args: unknown[]) => getShopPreview(...args),
  getShopProductPreview: (...args: unknown[]) => getShopProductPreview(...args),
}));

import nextConfig from "../../next.config";
import * as detailModule from "@/app/shop/[slug]/page";
import * as listModule from "@/app/shop/page";
import ShopPreviewPage from "@/app/preview/shop/page";
import ProductPreviewPage from "@/app/preview/shop/[slug]/page";
import { ShopIndexView } from "@/app/shop/shop-index-view";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("/shop and /shop/[slug] render strategy (Req 16.1)", () => {
  it("use short time-based revalidation because stock is visible", () => {
    expect(listModule.revalidate).toBe(60);
    expect(detailModule.revalidate).toBe(60);
    expect(detailModule.generateStaticParams()).toEqual([]);
  });

  it("ignore the preview parameter on the public path", async () => {
    getShopPreview.mockResolvedValueOnce({ products: [], scenario: null });
    getLiveShopProducts.mockResolvedValue([]);
    render(await ShopIndexView({ preview: undefined }));
    expect(getShopPreview).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("does not read request-time APIs in the public route files", () => {
    const files = [
      "src/app/shop/page.tsx",
      "src/app/shop/[slug]/page.tsx",
      "src/app/shop/shop-index-view.tsx",
      "src/app/shop/[slug]/product-detail-view.tsx",
    ];
    for (const file of files) {
      const source = read(file).replace(/\/\/.*$/gm, "");
      expect(source, file).not.toMatch(/searchParams|connection\s*\(|cookies\s*\(|headers\s*\(/);
    }
  });

  it("serves the preview scenarios from dynamic, noindex routes behind rewrites", async () => {
    getShopPreview.mockResolvedValueOnce({ products: [], scenario: "empty" });
    render(await ShopPreviewPage({ searchParams: Promise.resolve({ preview: "empty" }) }));
    expect(getShopPreview).toHaveBeenLastCalledWith("empty");

    getShopProductPreview.mockResolvedValueOnce({ product: null, scenario: "loading" });
    render(await ProductPreviewPage({
      params: Promise.resolve({ slug: "contoh" }),
      searchParams: Promise.resolve({ preview: "loading" }),
    }));
    expect(getShopProductPreview).toHaveBeenLastCalledWith("contoh", "loading");

    const rewrites = await nextConfig.rewrites?.();
    const beforeFiles = Array.isArray(rewrites) ? [] : rewrites?.beforeFiles ?? [];
    const query = [{ type: "query", key: "preview" }];
    expect(beforeFiles).toContainEqual({ has: query, destination: "/preview/shop", source: "/shop" });
    expect(beforeFiles).toContainEqual({ has: query, destination: "/preview/shop/:slug", source: "/shop/:slug" });
  });
});

describe("admin product actions invalidate the detail pattern (Req 16.2)", () => {
  it("call revalidatePath('/shop/[slug]', 'page') next to '/shop' for product, variant, stock, and media", () => {
    const source = read("src/app/admin/actions.ts");
    const pattern = /revalidatePath\("\/shop"\);\s*revalidatePath\("\/shop\/\[slug\]", "page"\);/g;
    expect(source.match(pattern)).toHaveLength(4);
  });
});
