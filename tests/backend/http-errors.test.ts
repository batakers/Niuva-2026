import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "@/lib/http/response";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { z } from "zod";

describe("typed HTTP error contract", () => {
  it.each([
    ["INVALID_JSON", 400],
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["VALIDATION_ERROR", 422],
    ["RATE_LIMITED", 429],
    ["INTERNAL_ERROR", 500],
  ] as const)("maps %s to HTTP %i", async (code, status) => {
    const response = apiError(appError(code), "test-correlation-id");

    expect(response.status).toBe(status);
    expect(response.headers.get("x-correlation-id")).toBe(
      "test-correlation-id",
    );
    await expect(response.json()).resolves.toMatchObject({
      code,
      correlationId: "test-correlation-id",
      error: expect.any(String),
    });
  });

  it("redacts unknown internal failures", async () => {
    const response = apiError(
      new Error("database password should never reach a response"),
      "test-correlation-id",
    );

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.not.toContain("database password");
  });

  it("sets Retry-After for rate-limited responses", () => {
    const response = apiError(
      appError("RATE_LIMITED", {
        details: { retryAfterSeconds: "12" },
      }),
      "test-correlation-id",
    );

    expect(response.headers.get("retry-after")).toBe("12");
  });

  it("keeps a real rate limit as RATE_LIMITED (429) without touching RESOURCE_BUSY", () => {
    const response = apiError(appError("RATE_LIMITED"), "test-correlation-id");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeNull();
  });

  it("maps RESOURCE_BUSY to 503 with a short Retry-After", () => {
    const response = apiError(appError("RESOURCE_BUSY"), "test-correlation-id");
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("5");

    const explicit = apiError(
      appError("RESOURCE_BUSY", { details: { retryAfterSeconds: "3" } }),
      "test-correlation-id",
    );
    expect(explicit.headers.get("retry-after")).toBe("3");
  });

  it("adds an internally generated correlation ID to success responses", async () => {
    const response = apiSuccess({ ok: true });

    expect(response.headers.get("x-correlation-id")).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("turns malformed service input into a redacted typed validation error", () => {
    try {
      parseWithValidation(z.object({ email: z.email() }), {
        email: "not-an-email",
      });
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toMatchObject({
        code: "VALIDATION_ERROR",
        status: 422,
      });
    }
  });
});
