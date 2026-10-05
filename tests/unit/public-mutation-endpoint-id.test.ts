import { describe, expect, it } from "vitest";

import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";

function makeRequest(ip: string): Request {
  return new Request("http://localhost:3000/api/x", {
    headers: { origin: "http://localhost:3000", "x-real-ip": ip },
    method: "POST",
  });
}

function makeLimiter() {
  return createInMemoryRateLimiter({ limit: 2, now: () => 1_000, windowMs: 60_000 });
}

describe("assertPublicMutationRequest endpointId", () => {
  it("does not let actor A exhaust the quota for actor B", () => {
    const limiter = makeLimiter();
    const options = { endpointId: "ep-a" };

    assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter, options);
    assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter, options);
    expect(() =>
      assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter, options),
    ).toThrow();
    expect(() =>
      assertPublicMutationRequest(makeRequest("2.2.2.2"), limiter, options),
    ).not.toThrow();
  });

  it("keeps a separate bucket per endpointId for the same actor", () => {
    const limiter = makeLimiter();

    for (let i = 0; i < 2; i += 1) {
      assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter, {
        endpointId: "ep-a",
      });
    }
    expect(() =>
      assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter, {
        endpointId: "ep-a",
      }),
    ).toThrow();
    expect(() =>
      assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter, {
        endpointId: "ep-b",
      }),
    ).not.toThrow();
  });

  it("rejects calls without endpointId at compile time", () => {
    // Never invoked: only type-checked by `tsc` (the directives fail if the
    // calls below ever compile).
    const compileOnly = () => {
      const limiter = makeLimiter();

      // @ts-expect-error endpointId is required
      assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter, {});
      // @ts-expect-error options (with endpointId) are required
      assertPublicMutationRequest(makeRequest("1.1.1.1"), limiter);
    };

    expect(typeof compileOnly).toBe("function");
  });
});
