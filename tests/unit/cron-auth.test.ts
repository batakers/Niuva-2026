import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/http/cron-auth";

describe("cron bearer authorization", () => {
  it("distinguishes missing configuration from an invalid caller", () => {
    const request = new Request("https://niuva.example.test/api/internal/jobs/outbox");
    expect(authorizeCronRequest(request, undefined)).toBe("missing-secret");
    expect(authorizeCronRequest(request, "configured-secret-for-test")).toBe("invalid");
  });

  it("accepts only the exact configured bearer value", () => {
    const secret = "configured-secret-for-test";
    const request = new Request("https://niuva.example.test/api/internal/jobs/outbox", {
      headers: { authorization: `Bearer ${secret}` },
    });
    expect(authorizeCronRequest(request, secret)).toBe("authorized");
    const extra = new Request("https://niuva.example.test/api/internal/jobs/outbox", {
      headers: { authorization: `Bearer ${secret} extra` },
    });
    expect(authorizeCronRequest(extra, secret)).toBe("invalid");
  });
});
