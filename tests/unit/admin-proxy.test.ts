import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import proxy from "@/proxy";
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-admin-auth-secret-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/niuva_test");
});
afterEach(() => vi.unstubAllEnvs());
const request = (path: string, accept = "application/json", cookie?: string) =>
  new NextRequest("http://localhost:3000" + path, { headers: cookie === undefined ? { accept } : { accept, cookie } });
// Session, second factor and active profile are verified by requireAdmin()
// (tests/backend/admin-auth.test.ts); the proxy only gates on cookie presence.
describe("Admin proxy with native auth", () => {
  it("redirects an anonymous browser and rejects an anonymous API call", async () => {
    const browser = await proxy(request("/admin/orders", "text/html"));
    expect(browser.status).toBe(307);
    expect(browser.headers.get("location")).toBe("http://localhost:3000/admin/sign-in");
    const api = await proxy(request("/api/admin/orders"));
    expect(api.status).toBe(401);
    expect(api.headers.get("cache-control")).toBe("no-store");
    expect(await api.json()).toEqual({ error: { code: "UNAUTHORIZED" } });
  });
  it("keeps sign-in and restricted auth endpoints reachable with a nonce CSP", async () => {
    for (const path of ["/admin/sign-in", "/api/admin/auth/sign-in/email"]) {
      const response = await proxy(request(path));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-security-policy")).toContain("'nonce-");
    }
  });
  it("passes a request carrying an Admin session cookie on to the route with a nonce CSP", async () => {
    for (const cookie of ["niuva_admin.session_token=opaque", "__Secure-niuva_admin.session_token=opaque"]) {
      const response = await proxy(request("/admin/orders", "text/html", cookie));
      expect(response.status, cookie).toBe(200);
      expect(response.headers.get("x-middleware-request-x-nonce"), cookie).toBeTruthy();
    }
  });
  it("rejects empty and look-alike cookies", async () => {
    for (const cookie of ["niuva_admin.session_token=", "niuva_admin.session_token=%20", "better-auth.session_token=opaque", "niuva_admin.session_data=opaque", "niuva_customer_session=opaque"]) {
      expect((await proxy(request("/api/admin/orders", "application/json", cookie))).status, cookie).toBe(401);
    }
  });
  it("fails closed with HTML for navigation and JSON for APIs when configuration is missing", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const browser = await proxy(request("/admin", "text/html", "niuva_admin.session_token=opaque"));
    expect(browser.status).toBe(503);
    expect(browser.headers.get("content-type")).toContain("text/html");
    expect(browser.headers.get("cache-control")).toBe("no-store");
    expect((await browser.text())).toContain('lang="id"');
    const api = await proxy(request("/api/admin/orders", "application/json,text/html"));
    expect(api.status).toBe(503);
    expect(await api.json()).toMatchObject({ error: { code: "AUTH_UNAVAILABLE" } });
  });
});
