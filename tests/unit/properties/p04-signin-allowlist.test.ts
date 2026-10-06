// Feature: system-pages-and-error-states, Property 4: Exact sign-in allowlist
// Validates: Requirements 10.3, 10.5, 10.6, 9.10
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forEachCase, pathnameCorpus } from "../helpers/corpus";

const mocks = vi.hoisted(() => ({ session: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth/admin-engine", () => ({ getAdminAuth: () => ({ api: { getSession: mocks.session } }) }));
import proxy from "@/proxy";
import { isAdminSignInPath } from "@/lib/auth/admin-proxy-response";

const ORIGIN = "http://localhost:3000";
const SIGN_IN_URL = `${ORIGIN}/admin/sign-in`;

/** Independent oracle for the allowlist: exact path or prefix `/admin/sign-in/`. */
function expectedAllowlisted(pathname: string): boolean {
  return pathname === "/admin/sign-in" || pathname.startsWith("/admin/sign-in/");
}

const requiredCases: ReadonlyArray<Readonly<{ pathname: string; allowed: boolean }>> = [
  { pathname: "/admin/sign-in", allowed: true },
  { pathname: "/admin/sign-in/", allowed: true },
  { pathname: "/admin/sign-in/factor-one", allowed: true },
  { pathname: "/admin/sign-in/sso-callback", allowed: true },
  { pathname: "/admin/sign-in/factor-one/", allowed: true },
  { pathname: "/admin/sign-in-other", allowed: false },
  { pathname: "/admin/sign-inx", allowed: false },
  { pathname: "/admin/sign-in%2Fx", allowed: false },
  { pathname: "/admin/sign-in%2fx", allowed: false },
  { pathname: "/admin/Sign-In", allowed: false },
  { pathname: "/admin/sign-i", allowed: false },
  { pathname: "/admin", allowed: false },
  { pathname: "/admin/", allowed: false },
  { pathname: "/admin/pricing", allowed: false },
  { pathname: "/api/admin/sign-in", allowed: false },
];

async function runProxy(pathname: string) {
  const target = pathname.startsWith("/") ? pathname : "/" + pathname;
  const request = new NextRequest(ORIGIN + target, { headers: { accept: "text/html" } });
  return { response: await proxy(request), pathname: request.nextUrl.pathname };
}
beforeEach(() => {
  mocks.session.mockClear();
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-admin-secret-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/niuva_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Property 4: exact sign-in allowlist", () => {
  it("recognizes only the sign-in path and its children", () => {
    for (const { pathname, allowed } of requiredCases) expect(isAdminSignInPath(pathname), pathname).toBe(allowed);
    forEachCase(pathnameCorpus(), pathname => expect(isAdminSignInPath(pathname)).toBe(expectedAllowlisted(pathname)));
  });
  it("keeps look-alike paths behind the session gate", async () => {
    for (const { pathname, allowed } of requiredCases) {
      const { response } = await runProxy(pathname);
      expect(response.status, pathname).toBe(allowed ? 200 : pathname.startsWith("/api/") ? 401 : 307);
      if (!allowed && !pathname.startsWith("/api/")) expect(response.headers.get("location")).toBe(SIGN_IN_URL);
      if (allowed) expect(response.headers.get("content-security-policy")).toContain("'nonce-");
    }
  });
  it("applies the gate after URL normalization to generated Admin paths", async () => {
    for (const pathname of pathnameCorpus()) {
      const { response, pathname: normalized } = await runProxy(pathname);
      if (!normalized.startsWith("/admin")) continue;
      expect(response.status, pathname).toBe(expectedAllowlisted(normalized) ? 200 : 307);
    }
  });
});
