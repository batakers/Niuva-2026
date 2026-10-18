import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
import { createRuntimeRateLimiter, PrismaRequestRateLimitStore } from "@/lib/security/shared-rate-limit";
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("runtime rate limit store selection", () => {
  it("keeps an isolated memory allowance for local fixtures", async () => {
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "local-test");
    const store = vi.spyOn(PrismaRequestRateLimitStore.prototype, "consume");
    const limiter = createRuntimeRateLimiter({ namespace: "fixture", limit: 1, windowMs: 60000 });
    expect(await limiter.check("actor")).toMatchObject({ allowed: true });
    expect(await limiter.check("actor")).toMatchObject({ allowed: false });
    expect(store).not.toHaveBeenCalled();
  });
  it.each(["staging", "production"])("uses the shared store in %s and never falls back when it fails", async tier => {
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("NIUVA_DEPLOYMENT_TIER", tier);
    const store = vi.spyOn(PrismaRequestRateLimitStore.prototype, "consume").mockRejectedValue(new Error("DB fixture unavailable"));
    const limiter = createRuntimeRateLimiter({ namespace: "fixture", limit: 1, windowMs: 60000 });
    await expect(limiter.check("actor")).rejects.toThrow("DB fixture unavailable");
    await expect(limiter.check("actor")).rejects.toThrow("DB fixture unavailable");
    expect(store).toHaveBeenCalledTimes(2);
  });
});
