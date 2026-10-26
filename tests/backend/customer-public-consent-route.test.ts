import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), allowed: true }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({ customerGoogleConsent: { create: mocks.create } }) }));
vi.mock("@/lib/security/shared-rate-limit", () => ({ createRuntimeRateLimiter: () => ({ check: async () => ({ allowed: mocks.allowed }) }) }));
import { POST } from "@/app/api/auth/google/consent/route";

const form = "consent=on&ageDeclaration=on&termsVersion=NIUVA-TERMS-v1.0&privacyVersion=NIUVA-PRIVACY-v1.0&returnTo=%2Fcheckout";
function request(body = form, json = true, origin: string | null = "http://127.0.0.1:3000", host = "127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/auth/google/consent", { method: "POST", headers: { Host: host,
    ...(origin ? { Origin: origin } : {}), ...(json ? { Accept: "application/json" } : {}), "Content-Type": "application/x-www-form-urlencoded" }, body });
}
beforeEach(() => {
  mocks.create.mockReset(); mocks.create.mockResolvedValue({}); mocks.allowed = true;
  for (const [key, value] of Object.entries({ NODE_ENV: "test", NIUVA_CUSTOMER_AUTH_MOCK: "true", NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "true", DATABASE_URL: "postgresql://fixture@127.0.0.1/niuva_public_test", APP_URL: "http://127.0.0.1:3000", NIUVA_INTERNAL_AUTH_ENABLED: "false", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock" })) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());

describe("public Google consent HTTP boundary", () => {
  it("sets a short-lived HttpOnly proof and exposes only a safe destination to JavaScript", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ destination: "/api/auth/google/start?returnTo=%2Fcheckout" });
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("niuva_google_consent=");
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/api/auth/google"); expect(cookie).toContain("Max-Age=600");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("keeps native POST redirects on our origin before the explicit OAuth link", async () => {
    const response = await POST(request(form, false));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/register/google?continue=1&returnTo=%2Fcheckout");
  });
  it.each([null, "null", "https://attacker.test"])("rejects missing/opaque/foreign Origin %j before persistence", async origin => {
    const response = await POST(request(form, true, origin));
    expect(response.status).toBe(403); expect(mocks.create).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("rejects Host mismatch, excessive body, invalid declarations, and stale versions", async () => {
    expect((await POST(request(form, true, "http://127.0.0.1:3000", "attacker.test"))).status).toBe(403);
    expect((await POST(request(form + "&extra=" + "x".repeat(8192)))).status).toBe(413);
    for (const body of [form.replace("ageDeclaration=on", "ageDeclaration=off"), form.replace("consent=on&", ""), form.replace("NIUVA-TERMS-v1.0", "DRAFT-TERMS-v6")]) {
      expect((await POST(request(body))).status).toBeGreaterThanOrEqual(400);
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("fails closed on rate limit or unavailable fixture without issuing a cookie", async () => {
    mocks.allowed = false;
    expect((await POST(request())).status).toBe(429);
    mocks.allowed = true; vi.stubEnv("NODE_ENV", "production");
    const response = await POST(request());
    expect(response.status).toBe(503); expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
