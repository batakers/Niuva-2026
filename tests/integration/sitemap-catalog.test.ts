import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/frontend-preview/server", async importOriginal => {
  const original = await importOriginal<typeof import("@/features/frontend-preview/server")>();
  return { ...original, getProjectPreview: async () => ({ projects: [], scenario: null }) };
});
import sitemap from "@/app/sitemap";
import { getLiveShopProducts } from "@/features/frontend-preview/server";
import { getPrismaClient } from "@/lib/db/prisma";
import { LOCAL_DEMO_PRODUCT_SLUG } from "@/modules/demo/seed";
const prisma = getPrismaClient();
const ids: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } });
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  ids.length = 0;
});

describe("sitemap published catalog PostgreSQL boundary", () => {
  it("includes only published runtime-visible products, including published out-of-stock products", async () => {
    const suffix = randomUUID();
    const published = await prisma.product.create({ data: { slug: `sitemap-published-${suffix}`, name: "Sitemap fixture", description: "Test only", isPublished: true } }); ids.push(published.id);
    const hidden = await prisma.product.create({ data: { slug: `sitemap-unpublished-${suffix}`, name: "Sitemap fixture", description: "Test only", isPublished: false } }); ids.push(hidden.id);
    const empty = await prisma.product.create({ data: { slug: `sitemap-empty-${suffix}`, name: "Sitemap fixture", description: "Test only", isPublished: true, variants: { create: { sku: `SITEMAP-${suffix}`, name: "Test", priceRp: "1", weightGrams: "1", stockOnHand: 0 } } } }); ids.push(empty.id);
    const existingDemo = await prisma.product.findUnique({ where: { slug: LOCAL_DEMO_PRODUCT_SLUG } });
    if (!existingDemo) {
      const demo = await prisma.product.create({ data: { slug: LOCAL_DEMO_PRODUCT_SLUG, name: "Sitemap demo fixture", description: "Test only", isPublished: true } }); ids.push(demo.id);
    }
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production"); vi.stubEnv("NIUVA_RUNTIME_MODE", "live"); vi.stubEnv("APP_URL", "https://niuva.example.test");
    const visible = await getLiveShopProducts();
    const urls = (await sitemap()).map(entry => entry.url);
    expect(visible.some(product => product.slug === published.slug)).toBe(true);
    expect(visible.some(product => product.slug === empty.slug)).toBe(true);
    expect(visible.some(product => product.slug === hidden.slug || product.slug === LOCAL_DEMO_PRODUCT_SLUG)).toBe(false);
    expect(urls).toContain(`https://niuva.example.test/shop/${published.slug}`);
    expect(urls).toContain(`https://niuva.example.test/shop/${empty.slug}`);
    expect(urls).not.toContain(`https://niuva.example.test/shop/${hidden.slug}`);
    expect(urls).not.toContain(`https://niuva.example.test/shop/${LOCAL_DEMO_PRODUCT_SLUG}`);
  });
});
