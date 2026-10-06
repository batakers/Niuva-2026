import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/auth/admin-engine", () => ({ getAdminAuth: () => ({ api: { getSession: mocks.session } }) }));
vi.mock("@/modules/admin/repository", () => ({ PrismaAdminProfileRepository: class { findByAuthUserId = mocks.profile; } }));
import proxy from "@/proxy";
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-admin-auth-secret-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/niuva_test");
  mocks.session.mockReset().mockResolvedValue(null);
  mocks.profile.mockReset().mockResolvedValue({ isActive: true });
});
afterEach(() => vi.unstubAllEnvs());
const request = (path: string, accept = "application/json") => new NextRequest("http://localhost:3000" + path, { headers: { accept } });
describe("Admin proxy with native auth", () => {
  it("redirects an anonymous browser and rejects an anonymous API call", async () => {
    const browser = await proxy(request("/admin/orders", "text/html"));
    expect(browser.status).toBe(307);
    expect(browser.headers.get("location")).toBe("http://localhost:3000/admin/sign-in");
    expect((await proxy(request("/api/admin/orders"))).status).toBe(401);
  });
  it("keeps sign-in and restricted auth endpoints reachable with a nonce CSP", async () => {
    for (const path of ["/admin/sign-in", "/api/admin/auth/sign-in/email"]) {
      const response = await proxy(request(path));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-security-policy")).toContain("'nonce-");
    }
  });
  it("rejects a password-only session even for an enrolled account", async () => {
    mocks.session.mockResolvedValue({ user: { id: "admin-user", twoFactorEnabled: true }, session: { mfaVerified: false } });
    expect((await proxy(request("/api/admin/orders"))).status).toBe(401);
  });
  it("rejects inactive profiles and allows only a verified second-factor session", async () => {
    mocks.session.mockResolvedValue({ user: { id: "admin-user", twoFactorEnabled: true }, session: { mfaVerified: true } });
    mocks.profile.mockResolvedValueOnce({ isActive: false });
    expect((await proxy(request("/api/admin/orders"))).status).toBe(403);
    const response = await proxy(request("/admin/orders"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeTruthy();
  });
  it("fails closed with HTML for navigation and JSON for APIs when configuration is missing", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const browser = await proxy(request("/admin", "text/html"));
    expect(browser.status).toBe(503);
    expect(browser.headers.get("content-type")).toContain("text/html");
    expect(browser.headers.get("cache-control")).toBe("no-store");
    expect((await browser.text())).toContain('lang="id"');
    const api = await proxy(request("/api/admin/orders", "application/json,text/html"));
    expect(api.status).toBe(503);
    expect(await api.json()).toMatchObject({ error: { code: "AUTH_UNAVAILABLE" } });
  });
  it("fails closed when the session database is unavailable", async () => {
    mocks.session.mockRejectedValue(new Error("unavailable"));
    expect((await proxy(request("/api/admin/orders"))).status).toBe(503);
  });
});
