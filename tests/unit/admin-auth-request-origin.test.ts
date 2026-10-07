import { describe, expect, it, vi } from "vitest";
import type { createAdminAuthEngine } from "@/lib/auth/admin-engine";
import { handleAdminAuthRequest } from "@/modules/admin-auth/handler";
import { withAdminAuthOrigin } from "@/modules/admin-auth/request-origin";

type Engine = ReturnType<typeof createAdminAuthEngine>;
const origin = "http://127.0.0.1:3000";
const dependencies = { profiles: { findByAuthUserId: vi.fn() }, mailReady: () => true };
function signIn(browserOrigin: string | null) {
  return new Request("http://localhost:3000/api/admin/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", ...(browserOrigin ? { origin: browserOrigin } : {}) },
    body: JSON.stringify({ email: "fixture@example.test", password: "Synthetic-23!" }),
  });
}

describe("Admin public auth origin", () => {
  it("accepts the configured browser origin when Next uses an internal listener URL", async () => {
    const handler = vi.fn(async (request: Request) => {
      expect(request.url).toBe(origin + "/api/admin/auth/sign-in/email");
      expect(request.headers.get("origin")).toBe(origin);
      expect(await request.json()).toMatchObject({ email: "fixture@example.test", rememberMe: false, callbackURL: origin + "/admin/sign-in?verified=1" });
      return Response.json({ code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
    });
    const response = await handleAdminAuthRequest(withAdminAuthOrigin(signIn(origin), origin), { handler } as unknown as Engine, dependencies);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "EMAIL_NOT_VERIFIED" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it.each(["https://foreign.example.test", "http://localhost:3000", null])("continues to reject foreign or missing browser origin %s", async browserOrigin => {
    const handler = vi.fn();
    const response = await handleAdminAuthRequest(withAdminAuthOrigin(signIn(browserOrigin), origin), { handler } as unknown as Engine, dependencies);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("uses the public callback and preserves only the original verification path/query", async () => {
    const url = "/api/admin/auth/verify-email?token=synthetic-verification-token&callbackURL=" + encodeURIComponent(origin + "/admin/sign-in?verified=1");
    const handler = vi.fn(async (request: Request) => {
      expect(request.url).toBe(origin + url);
      return new Response(null, { status: 302, headers: { location: origin + "/admin/sign-in?verified=1" } });
    });
    const response = await handleAdminAuthRequest(withAdminAuthOrigin(new Request("http://localhost:3000" + url), origin), { handler } as unknown as Engine, dependencies);
    expect(response.headers.get("location")).toBe(origin + "/admin/sign-in?verified=1");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("ignores spoofed forwarding headers when choosing the origin", () => {
    const request = new Request("http://localhost:3000/api/admin/auth/status", { headers: { "x-forwarded-host": "foreign.example.test", "x-forwarded-proto": "https" } });
    expect(withAdminAuthOrigin(request, origin).url).toBe(origin + "/api/admin/auth/status");
  });

  it("removes the internal listener port when the public origin uses default HTTPS", () => {
    const request = new Request("http://localhost:3000/api/admin/auth/status");
    expect(withAdminAuthOrigin(request, "https://admin.example.test").url).toBe("https://admin.example.test/api/admin/auth/status");
  });

  it.each([undefined, "https://user:password@example.test", "https://example.test/path", "https://example.test?query=1", "https://example.test#fragment", "ftp://example.test"])("rejects invalid configured origin %s", baseUrl => {
    expect(() => withAdminAuthOrigin(new Request("http://localhost:3000/api/admin/auth/status"), baseUrl)).toThrow();
  });
});
