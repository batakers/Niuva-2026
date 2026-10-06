import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getProjectPreview = vi.hoisted(() => vi.fn());
const getLiveShopProducts = vi.hoisted(() => vi.fn());

vi.mock("@/features/frontend-preview/server", () => ({ getProjectPreview, getLiveShopProducts }));

import sitemap, { revalidate } from "@/app/sitemap";

const EXCLUDED = [
  "/auth-test-policy",
  "/internal-testing",
  "/demo/action-queue",
  "/api/frontend-preview",
  "/preview",
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/login",
];

describe("sitemap (Req 16.3, 16.7)", () => {
  beforeEach(() => { getLiveShopProducts.mockResolvedValue([]); });
  afterEach(() => {
    vi.unstubAllEnvs();
    getProjectPreview.mockReset();
    getLiveShopProducts.mockReset();
  });

  it("uses an explicit static revalidate literal", () => {
    expect(revalidate).toBe(300);
  });

  it("lists public routes and detail-ready projects on the canonical origin, never internal routes", async () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
    vi.stubEnv("APP_URL", "https://niuva.example.com");
    getProjectPreview.mockResolvedValue({
      scenario: null,
      projects: [
        { slug: "alpha", detailReadiness: "summary-only" },
        { slug: "beta", detailReadiness: "card-only" },
      ],
    });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://niuva.example.com/");
    expect(urls).toContain("https://niuva.example.com/services/research-development");
    expect(urls).toContain("https://niuva.example.com/projects/alpha");
    expect(urls).not.toContain("https://niuva.example.com/projects/beta");

    for (const url of urls) {
      const path = new URL(url).pathname;
      expect(EXCLUDED.some((prefix) => path.startsWith(prefix))).toBe(false);
    }
  });

  it("still returns static routes when the database read fails", async () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
    vi.stubEnv("APP_URL", "https://niuva.example.com");
    getProjectPreview.mockRejectedValue(new Error("database unavailable"));

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://niuva.example.com/projects");
    expect(urls.some((url) => url.includes("/projects/"))).toBe(false);
  });

  it("returns an empty list without a valid origin instead of guessing", async () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
    vi.stubEnv("APP_URL", "");

    expect(await sitemap()).toEqual([]);
    expect(getProjectPreview).not.toHaveBeenCalled();
    expect(getLiveShopProducts).not.toHaveBeenCalled();
  });
  it("adds catalog detail URLs with encoding and deduplicates each URL", async () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production"); vi.stubEnv("APP_URL", "https://niuva.example.com");
    getProjectPreview.mockResolvedValue({ projects: [{ slug: "alpha", detailReadiness: "summary-only" }, { slug: "alpha", detailReadiness: "summary-only" }] });
    getLiveShopProducts.mockResolvedValue([{ slug: "published part" }, { slug: "published part" }]);
    const urls = (await sitemap()).map(entry => entry.url);
    expect(urls.filter(url => url === "https://niuva.example.com/shop/published%20part")).toHaveLength(1);
    expect(urls.filter(url => url === "https://niuva.example.com/projects/alpha")).toHaveLength(1);
  });
  it("retains products when the portfolio read fails", async () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production"); vi.stubEnv("APP_URL", "https://niuva.example.com");
    getProjectPreview.mockRejectedValue(new Error("database unavailable"));
    getLiveShopProducts.mockResolvedValue([{ slug: "published" }]);
    const urls = (await sitemap()).map(entry => entry.url);
    expect(urls).toContain("https://niuva.example.com/shop/published");
    expect(urls).toContain("https://niuva.example.com/projects");
  });
  it("retains projects and static routes when the catalog read fails", async () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production"); vi.stubEnv("APP_URL", "https://niuva.example.com");
    getProjectPreview.mockResolvedValue({ projects: [{ slug: "alpha", detailReadiness: "summary-only" }] });
    getLiveShopProducts.mockRejectedValue(new Error("database unavailable"));
    const urls = (await sitemap()).map(entry => entry.url);
    expect(getLiveShopProducts).toHaveBeenCalledOnce();
    expect(urls).toContain("https://niuva.example.com/projects/alpha"); expect(urls).toContain("https://niuva.example.com/shop");
    expect(urls.some(url => url.includes("/shop/"))).toBe(false);
  });
});
