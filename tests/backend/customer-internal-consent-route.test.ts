import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ accept: vi.fn() }));
vi.mock("@/modules/customer-auth/internal-consent", () => ({ InternalGoogleConsentService: class { accept = mocks.accept; } }));
import { POST } from "@/app/api/auth/internal/google-consent/route";
function request(body: string, json = false, origin: string | null = "http://127.0.0.1:3000") {
  return new Request("http://localhost:3000/api/auth/internal/google-consent", { method: "POST", headers: { Host: "127.0.0.1:3000", ...(origin ? { Origin: origin } : {}), "Content-Type": "application/x-www-form-urlencoded", ...(json ? { Accept: "application/json" } : {}) }, body });
}
beforeEach(() => {
  mocks.accept.mockReset(); mocks.accept.mockResolvedValue("TEST-ONLY-CONSENT-PROOF");
  for (const [key, value] of Object.entries({ NODE_ENV: "development", DATABASE_URL: "postgresql://local@127.0.0.1:55433/niuva_dev", APP_URL: "http://127.0.0.1:3000", NIUVA_INTERNAL_AUTH_ENABLED: "true", NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test", NIUVA_INTERNAL_PASSWORD_EMAIL: "password@example.test", NIUVA_CUSTOMER_AUTH_MOCK: "false", NIUVA_RUNTIME_MODE: "live" })) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
describe("internal consent boundary", () => {
  it("requires consent and origin before issuing a proof", async () => {
    expect((await POST(request("returnTo=%2Fcheckout", true))).status).toBe(422);
    expect((await POST(request("consent=on", true, null))).status).toBe(403);
    expect((await POST(request("consent=on", true, "https://evil.test"))).status).toBe(403);
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it("keeps no-JS form redirects on our origin and the proof short-lived HttpOnly", async () => {
    const response = await POST(request("consent=on&returnTo=%2Fcheckout"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/internal-testing/google-consent?continue=1&returnTo=%2Fcheckout");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=600");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/google");
  });
  it("returns an allowlisted OAuth destination to JS and handles failure", async () => {
    const response = await POST(request("consent=on&returnTo=https%3A%2F%2Fevil.test", true));
    expect(await response.json()).toEqual({ destination: "/api/auth/google/start?returnTo=%2Faccount" });
    mocks.accept.mockRejectedValue(new Error("TEST-FAILURE"));
    const failed = await POST(request("consent=on", true));
    expect(failed.status).toBe(500); expect(failed.headers.get("set-cookie")).toBeNull();
  });
});
