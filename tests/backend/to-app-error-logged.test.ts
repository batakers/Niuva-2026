import { afterEach, describe, expect, it, vi } from "vitest";

import { apiError } from "@/lib/http/response";
import type { FailureEvent, FailureLogger } from "@/lib/observability/logger";
import {
  resetReportFailureLogger,
  setReportFailureLogger,
  toAppErrorLogged,
} from "@/lib/observability/report";
import { appError, toAppError } from "@/modules/shared/errors";

function capture(): { events: FailureEvent[]; logger: FailureLogger } {
  const events: FailureEvent[] = [];
  return { events, logger: { record: (event) => void events.push(event) } };
}

afterEach(() => {
  resetReportFailureLogger();
});

describe("toAppErrorLogged", () => {
  it("mengembalikan AppError yang sama dan tidak mencatat apa pun", () => {
    const { events, logger } = capture();
    const original = appError("NOT_FOUND");

    expect(toAppErrorLogged(original, { boundary: "action:admin", logger })).toBe(
      original,
    );
    expect(events).toHaveLength(0);
  });

  it("mengembalikan INTERNAL_ERROR berpesan identik dengan toAppError dan mencatat tepat satu kali", () => {
    const { events, logger } = capture();
    const failure = new Error("password=hunter2 rahasia@contoh.test");

    const logged = toAppErrorLogged(failure, {
      boundary: "action:admin",
      correlationId: "corr-1",
      logger,
      safeContext: { action: "updateStock" },
    });
    const plain = toAppError(failure);

    expect(logged.code).toBe(plain.code);
    expect(logged.message).toBe(plain.message);
    expect(logged.status).toBe(plain.status);
    expect(logged).not.toBe(failure);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      boundary: "action:admin",
      correlationId: "corr-1",
      errorCode: "INTERNAL_ERROR",
      kind: "CODE_DEFECT",
      safeContext: { action: "updateStock" },
    });
    expect(JSON.stringify(events)).not.toContain("hunter2");
    expect(JSON.stringify(events)).not.toContain("contoh.test");
  });

  it("mengklasifikasi dari error asli dan membuat correlation id bila tidak diberikan", () => {
    const { events, logger } = capture();

    toAppErrorLogged(
      Object.assign(new Error("db"), { code: "ECONNREFUSED" }),
      { boundary: "action:admin", logger },
    );

    expect(events[0]?.kind).toBe("DATABASE_UNAVAILABLE");
    expect(events[0]?.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("memakai logger modul dan tidak melempar bila logger rusak", () => {
    const { events, logger } = capture();
    setReportFailureLogger(logger);
    toAppErrorLogged("bukan error", { boundary: "action:admin" });
    expect(events).toHaveLength(1);

    const throwing: FailureLogger = {
      record: () => {
        throw new Error("logger rusak");
      },
    };
    expect(
      toAppErrorLogged(new Error("x"), { boundary: "b", logger: throwing }).code,
    ).toBe("INTERNAL_ERROR");
  });

  it("default menulis satu baris JSON ke console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    toAppErrorLogged(new Error("x"), { boundary: "action:admin" });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("satu apiError() tetap menghasilkan tepat satu catatan dan tidak menyentuh logger pelapor", () => {
    const api = capture();
    const report = capture();
    setReportFailureLogger(report.logger);

    apiError(new Error("bug"), "c-api", { logger: api.logger });

    expect(api.events).toHaveLength(1);
    expect(report.events).toHaveLength(0);
  });
});

describe("toAppError", () => {
  it("tidak mencatat dan perilaku pengembaliannya tidak berubah", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const original = appError("CONFLICT");

    expect(toAppError(original)).toBe(original);
    expect(toAppError(new Error("x")).code).toBe("INTERNAL_ERROR");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
