import { afterEach, describe, expect, it, vi } from "vitest";

const getProjectPreview = vi.hoisted(() => vi.fn());

vi.mock("@/features/frontend-preview/server", () => ({ getProjectPreview }));

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
  afterEach(() => {
    vi.unstubAllEnvs();
    getProjectPreview.mockReset();
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
  });
});
