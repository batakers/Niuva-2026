import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiError,
  resetApiFailureLogger,
  setApiFailureLogger,
} from "@/lib/http/response";
import type { FailureEvent, FailureLogger } from "@/lib/observability/logger";
import { ERROR_CODES, appError } from "@/modules/shared/errors";

function capture(): { events: FailureEvent[]; logger: FailureLogger } {
  const events: FailureEvent[] = [];
  return { events, logger: { record: (event) => void events.push(event) } };
}

afterEach(() => {
  resetApiFailureLogger();
});

describe("apiError failure logging", () => {
  it.each(ERROR_CODES)(
    "memakai correlation id yang sama di header, body, dan log untuk %s",
    async (code) => {
      const { events, logger } = capture();
      const correlationId = `corr-${code.toLowerCase()}`;

      const response = apiError(appError(code), correlationId, { logger });
      const body = (await response.json()) as { code: string; correlationId: string };

      expect(events).toHaveLength(1);
      expect(response.headers.get("x-correlation-id")).toBe(correlationId);
      expect(body.correlationId).toBe(correlationId);
      expect(events[0]?.correlationId).toBe(correlationId);
      expect(events[0]?.errorCode).toBe(code);
      expect(body.code).toBe(code);
    },
  );

  it("menghasilkan satu id yang sama di ketiga tempat saat id tidak diberikan", async () => {
    const { events, logger } = capture();

    const response = apiError(appError("NOT_FOUND"), undefined, { logger });
    const body = (await response.json()) as { correlationId: string };

    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("x-correlation-id")).toBe(body.correlationId);
    expect(events[0]?.correlationId).toBe(body.correlationId);
  });

  it("mengklasifikasi dari error asli dan memakai boundary default atau yang diberikan", () => {
    const { events, logger } = capture();

    apiError(
      Object.assign(new Error("db"), { code: "ECONNREFUSED" }),
      "c1",
      { logger },
    );
    apiError(new Error("bug"), "c2", { boundary: "api:POST /api/x", logger });
    apiError(appError("RATE_LIMITED"), "c3", { logger });

    expect(events.map((event) => [event.kind, event.errorCode, event.boundary])).toEqual([
      ["DATABASE_UNAVAILABLE", "INTERNAL_ERROR", "api"],
      ["CODE_DEFECT", "INTERNAL_ERROR", "api:POST /api/x"],
      ["RATE_LIMITED", "RATE_LIMITED", "api"],
    ]);
  });

  it("tidak mencatat pesan error, details, atau body ke log", () => {
    const { events, logger } = capture();

    apiError(
      appError("VALIDATION_ERROR", {
        details: { field: "rahasia@contoh.test" },
        message: "pesan khusus pengguna@contoh.test",
      }),
      "c-secret",
      { logger },
    );
    apiError(new Error("password=hunter2"), "c-secret-2", { logger });

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("rahasia@contoh.test");
    expect(serialized).not.toContain("pengguna@contoh.test");
    expect(serialized).not.toContain("hunter2");
    expect(events[0]?.safeContext).toEqual({ status: "422" });
  });

  it("menjaga bentuk respons tetap sama dengan atau tanpa logger yang melempar", async () => {
    const throwing: FailureLogger = {
      record: () => {
        throw new Error("logger rusak");
      },
    };
    const { logger } = capture();
    const make = () =>
      appError("RATE_LIMITED", { details: { retryAfterSeconds: "12" } });

    const baseline = apiError(make(), "same-id", { logger });
    const withThrowing = apiError(make(), "same-id", { logger: throwing });

    expect(withThrowing.status).toBe(baseline.status);
    expect([...withThrowing.headers.entries()].sort()).toEqual(
      [...baseline.headers.entries()].sort(),
    );
    expect(await withThrowing.json()).toEqual(await baseline.json());
  });

  it("mempertahankan kunci body: code, correlationId, error, fields", async () => {
    const { logger } = capture();

    const withFields = apiError(
      appError("VALIDATION_ERROR", { details: { path: "email" } }),
      "shape-1",
      { logger },
    );
    const withoutFields = apiError(appError("NOT_FOUND"), "shape-2", { logger });

    expect(Object.keys(await withFields.json() as object).sort()).toEqual([
      "code",
      "correlationId",
      "error",
      "fields",
    ]);
    expect(Object.keys(await withoutFields.json() as object).sort()).toEqual([
      "code",
      "correlationId",
      "error",
    ]);
  });

  it("memakai logger modul yang bisa diinjeksi dan direset, dan default menulis JSON ke console.error", () => {
    const { events, logger } = capture();
    setApiFailureLogger(logger);
    apiError(appError("CONFLICT"), "module-logger");
    expect(events[0]?.correlationId).toBe("module-logger");

    resetApiFailureLogger();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    apiError(appError("CONFLICT"), "default-logger");

    expect(events).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    const line: unknown = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line).toMatchObject({
      boundary: "api",
      correlationId: "default-logger",
      errorCode: "CONFLICT",
      event: "failure",
    });
  });
});
