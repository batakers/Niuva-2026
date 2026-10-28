import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "../../next.config";
import { isSearchIndexingAllowed } from "@/lib/env/deployment";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function robotsTagFor(tier: string): Promise<string | undefined> {
  vi.stubEnv("NIUVA_DEPLOYMENT_TIER", tier);
  const rules = (await nextConfig.headers?.()) ?? [];

  return rules
    .filter((rule) => rule.source === "/:path*")
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "X-Robots-Tag")?.value;
}

describe("search indexing by deployment tier", () => {
  it("allows indexing only for an explicit production tier", () => {
    expect(isSearchIndexingAllowed({ NIUVA_DEPLOYMENT_TIER: "production" })).toBe(true);
    expect(isSearchIndexingAllowed({ NIUVA_DEPLOYMENT_TIER: " Production " })).toBe(true);

    for (const tier of ["staging", "local-test", "", "unknown", undefined]) {
      expect(isSearchIndexingAllowed({ NIUVA_DEPLOYMENT_TIER: tier, NODE_ENV: "production" }), String(tier)).toBe(false);
    }
  });

  it("sends noindex on every route for staging and none for production", async () => {
    expect(await robotsTagFor("staging")).toBe("noindex, nofollow");
    expect(await robotsTagFor("production")).toBeUndefined();
  });
});
