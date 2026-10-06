// Feature: system-pages-and-error-states, Property 3
// Property 3: Classification is total and the no-credentials responses are consistent.
// Validates: Requirements 9.1, 9.2, 9.3, 9.11
import type { NextFetchEvent, NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acceptHeaderCorpus, DEFAULT_SEED, forEachCase, MIN_GENERATED, pathnameCorpus } from "../helpers/corpus";


const clerkMocks = vi.hoisted(() => ({
  protect: vi.fn(),
  delegated: vi.fn(),
}));



import { classifyAdminProxyRequest } from "@/lib/auth/admin-proxy-response";
import proxy from "@/proxy";

type Kind = "browser-navigation" | "api";

const EXPECTED_JSON = {
  error: { code: "AUTH_UNAVAILABLE", message: "Layanan autentikasi admin belum tersedia." },
};

/**
 * Independent oracle for the documented rule (design, Property 3), written
 * differently from the implementation: regex-based range parsing.
 */
function expectedKind(pathname: string, accept: string | null): Kind {
  const lower = pathname.toLowerCase();
  if (lower === "/api" || lower.startsWith("/api/")) return "api";
  if (accept === null) return "api";

  for (const range of accept.split(",")) {
    const match = /^\s*text\/html\s*((?:;[^;]*)*)$/i.exec(range);
    if (!match) continue;
    const qParam = (match[1] ?? "")
      .split(";")
      .slice(1)
      .map((p) => p.trim())
      .find((p) => /^q\s*(=|$)/i.test(p));
    if (qParam === undefined) return "browser-navigation";
    const value = /^q\s*=\s*(\d+(?:\.\d+)?)$/i.exec(qParam)?.[1];
    if (value !== undefined && Number(value) > 0) return "browser-navigation";
  }
  return "api";
}

/** Minimal request double: the proxy only reads `nextUrl.pathname` and `headers`. */
function makeRequest(pathname: string, accept: string | null): NextRequest {
  const headers = new Headers();
  if (accept !== null) headers.set("accept", accept);
  return { nextUrl: { pathname }, headers, url: `http://localhost:3000${pathname}` } as unknown as NextRequest;
}

/** Runs the proxy and narrows the result: without credentials it must always return a Response. */
async function run(pathname: string, accept: string | null): Promise<Response> {
  const response = await proxy(makeRequest(pathname, accept), {} as NextFetchEvent);
  if (!(response instanceof Response)) throw new Error("proxy did not return a Response");
  return response;
}

const acceptCorpus: Array<string | null> = [
  null,
  "text/x-component",
  "text/html;q=0.5",
  "text/html;q=1.0",
  "TEXT/HTML;Q=0",
  "text/html;q=",
  "text/html;q=-1",
  "text/html;q=1e2",
  ...acceptHeaderCorpus(),
];

const pathCorpus: string[] = [
  "/admin/orders",
  "/admin/sign-in",
  "/api/admin/orders",
  "/API/admin/x",
  "/Api",
  "/api/",
  "/apix",
  ...pathnameCorpus(),
];

beforeEach(() => {
  clerkMocks.protect.mockReset();
  clerkMocks.delegated.mockReset();
  vi.stubEnv("BETTER_AUTH_SECRET", "");
  vi.stubEnv("BETTER_AUTH_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Property 3: proxy classification without Clerk credentials", () => {
  it("uses corpora of at least 100 cases per axis", () => {
    expect(pathCorpus.length).toBeGreaterThanOrEqual(MIN_GENERATED);
    expect(acceptCorpus.length).toBeGreaterThanOrEqual(MIN_GENERATED);
  });

  it("classifies every pathname x Accept pair as exactly one kind, deterministically, per the documented rule", () => {
    for (const pathname of pathCorpus) {
      forEachCase(
        acceptCorpus.map((a) => a ?? "\u0000null"),
        (marker) => {
          const accept = marker === "\u0000null" ? null : marker;
          const kind = classifyAdminProxyRequest({ pathname, accept });
          expect(["browser-navigation", "api"]).toContain(kind);
          expect(classifyAdminProxyRequest({ pathname, accept })).toBe(kind);
          expect(kind, `pathname=${JSON.stringify(pathname)}`).toBe(expectedKind(pathname, accept));
        },
        DEFAULT_SEED,
      );
    }
  });

  it("always classifies /api and /api/... as api, whatever Accept says", () => {
    for (const pathname of ["/api", "/API", "/api/", "/api/admin/orders", "/API/admin/x", "/Api/Admin"]) {
      for (const accept of ["text/html", "TEXT/HTML", "text/html;q=1", "*/*", null]) {
        expect(classifyAdminProxyRequest({ pathname, accept })).toBe("api");
      }
    }
  });

  it("keeps wildcard, missing, q=0, malformed q and RSC Accept values as api on a non-API path", () => {
    for (const accept of [null, "", "*/*", "text/*", "application/json", "text/x-component", "text/html;q=0", "text/html;q=0.0", "text/html;q=abc", "text/html;q="]) {
      expect(classifyAdminProxyRequest({ pathname: "/admin/orders", accept }), String(accept)).toBe("api");
    }
    for (const accept of ["text/html", "TEXT/HTML", "text/html;q=0.001", "application/json, text/html"]) {
      expect(classifyAdminProxyRequest({ pathname: "/admin/orders", accept }), accept).toBe("browser-navigation");
    }
  });

  it("returns 503 with the matching body kind for every input and never runs the Clerk handler", async () => {
    const seen = { html: 0, json: 0 };

    for (const pathname of pathCorpus) {
      for (const accept of acceptCorpus) {
        const kind = expectedKind(pathname, accept);
        const label = `pathname=${JSON.stringify(pathname)} accept=${JSON.stringify(accept)}`;

        const response = await run(pathname, accept);

        expect(response.status, label).toBe(503);

        if (kind === "browser-navigation") {
          seen.html += 1;
          expect(response.headers.get("cache-control"), label).toBe("no-store");
          expect(response.headers.get("content-type"), label).toBe("text/html; charset=utf-8");
          const body = await response.text();
          expect(body, label).toContain('<html lang="id">');
          expect(body, label).not.toContain("AUTH_UNAVAILABLE");
        } else {
          seen.json += 1;
          expect(response.headers.get("content-type"), label).toContain("application/json");
          expect(await response.json(), label).toEqual(EXPECTED_JSON);
        }
      }
    }

    // Both branches were genuinely exercised.
    expect(seen.html).toBeGreaterThan(0);
    expect(seen.json).toBeGreaterThan(0);
    expect(clerkMocks.delegated).not.toHaveBeenCalled();
    expect(clerkMocks.protect).not.toHaveBeenCalled();
  }, 30_000);

  it("treats a single missing credential as no credentials", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-only-admin-secret-at-least-32-characters");
    vi.stubEnv("BETTER_AUTH_URL", "   ");

    const response = await run("/admin/orders", "text/html");

    expect(response.status).toBe(503);
    expect(clerkMocks.delegated).not.toHaveBeenCalled();
  });
});
