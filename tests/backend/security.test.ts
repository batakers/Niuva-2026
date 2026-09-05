import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/http/body";
import { getContentSecurityPolicy, getSecurityHeaders } from "@/lib/security/headers";
import {
  isLoopbackRequest,
  isSameOriginRequest,
} from "@/lib/security/origin";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { AppError } from "@/modules/shared/errors";

describe("bounded JSON reader", () => {
  it("parses valid JSON within the byte limit", async () => {
    const body = await readJsonBody(
      new Request("http://localhost/api/example", {
        body: JSON.stringify({ ok: true }),
        method: "POST",
      }),
      { maxBytes: 128 },
    );

    expect(body).toEqual({ ok: true });
  });

  it("rejects invalid JSON and oversized content", async () => {
    await expect(
      readJsonBody(
        new Request("http://localhost/api/example", {
          body: "{",
          method: "POST",
        }),
        { maxBytes: 128 },
      ),
    ).rejects.toMatchObject({ code: "INVALID_JSON" } satisfies Partial<AppError>);

    await expect(
      readJsonBody(
        new Request("http://localhost/api/example", {
          body: JSON.stringify({ content: "0123456789" }),
          method: "POST",
        }),
        { maxBytes: 12 },
      ),
    ).rejects.toMatchObject({
      code: "REQUEST_TOO_LARGE",
    } satisfies Partial<AppError>);
  });
});

describe("origin boundary", () => {
  it("accepts a same-origin loopback request", () => {
    const request = new Request("http://127.0.0.1:3000/api/example", {
      headers: { origin: "http://127.0.0.1:3000" },
      method: "POST",
    });

    expect(isLoopbackRequest(request)).toBe(true);
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("does not trust spoofed forwarded headers", () => {
    const request = new Request("http://192.0.2.10:3000/api/example", {
      headers: {
        origin: "http://192.0.2.10:3000",
        "x-forwarded-for": "127.0.0.1",
      },
      method: "POST",
    });

    expect(isLoopbackRequest(request)).toBe(false);
    expect(isSameOriginRequest(request)).toBe(true);
  });
});

describe("in-memory rate limiter", () => {
  it("returns a 429-ready denial after the configured limit and resets", () => {
    let currentTime = 0;
    const limiter = createInMemoryRateLimiter({
      limit: 2,
      now: () => currentTime,
      windowMs: 1_000,
    });

    expect(limiter.check("local").allowed).toBe(true);
    expect(limiter.check("local").remaining).toBe(0);
    expect(limiter.check("local")).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });

    currentTime = 1_000;

    expect(limiter.check("local")).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });
});

describe("security response headers", () => {
  it("uses a self-only production CSP and HSTS", () => {
    const headers = getSecurityHeaders("production");
    const csp = getContentSecurityPolicy("production");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
    expect(headers).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  });

  it("keeps development HMR compatible without enabling HSTS", () => {
    const headers = getSecurityHeaders("development");
    const csp = getContentSecurityPolicy("development");

    expect(csp).toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self' ws: wss:");
    expect(headers).not.toContainEqual(
      expect.objectContaining({ key: "Strict-Transport-Security" }),
    );
  });
});
