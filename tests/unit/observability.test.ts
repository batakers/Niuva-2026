import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyUnknownError,
  failureKindForErrorCode,
} from "@/lib/observability/classify";
import {
  FAILURE_KINDS,
  createConsoleFailureLogger,
  sanitizeSafeContext,
  type FailureEvent,
} from "@/lib/observability/logger";
import { ERROR_CODES, appError } from "@/modules/shared/errors";

function namedError(name: string, message = "x", extra: object = {}): Error {
  const error = Object.assign(new Error(message), extra);
  error.name = name;
  return error;
}

describe("classifyUnknownError", () => {
  it("menandai kegagalan koneksi database sebagai DATABASE_UNAVAILABLE", () => {
    for (const code of ["P1001", "P1002", "P1008", "P1017", "ECONNREFUSED", "ETIMEDOUT"]) {
      expect(classifyUnknownError(Object.assign(new Error("db"), { code }))).toBe(
        "DATABASE_UNAVAILABLE",
      );
    }
    expect(
      classifyUnknownError(
        new Error("Can't reach database server at `db.internal:5432`"),
      ),
    ).toBe("DATABASE_UNAVAILABLE");
    expect(
      classifyUnknownError(namedError("PrismaClientInitializationError")),
    ).toBe("DATABASE_UNAVAILABLE");
  });

  it("mengenali kegagalan database yang terbungkus di cause", () => {
    const wrapped = new Error("query gagal", {
      cause: Object.assign(new Error("inner"), { code: "ECONNREFUSED" }),
    });
    expect(classifyUnknownError(wrapped)).toBe("DATABASE_UNAVAILABLE");
  });

  it("tidak menganggap error Prisma non-koneksi sebagai database tidak tersedia", () => {
    const unique = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    expect(classifyUnknownError(unique)).toBe("CODE_DEFECT");
  });

  it("menandai AbortError dan TimeoutError sebagai PROVIDER_TIMEOUT", () => {
    expect(classifyUnknownError(namedError("AbortError"))).toBe("PROVIDER_TIMEOUT");
    expect(classifyUnknownError(namedError("TimeoutError"))).toBe("PROVIDER_TIMEOUT");
    expect(
      classifyUnknownError(new DOMException("The operation timed out.", "TimeoutError")),
    ).toBe("PROVIDER_TIMEOUT");
    expect(
      classifyUnknownError(new TypeError("fetch failed", { cause: namedError("AbortError") })),
    ).toBe("PROVIDER_TIMEOUT");
  });

  it("memetakan kode provider pada AppError ke PROVIDER_REJECTED", () => {
    expect(classifyUnknownError(appError("PROVIDER_UNAVAILABLE"))).toBe("PROVIDER_REJECTED");
    expect(classifyUnknownError(appError("SHIPPING_PROVIDER_UNAVAILABLE"))).toBe(
      "PROVIDER_REJECTED",
    );
    expect(classifyUnknownError(appError("PAYMENT_VERIFICATION_FAILED"))).toBe(
      "PROVIDER_REJECTED",
    );
  });

  it("menandai nilai tak dikenal sebagai CODE_DEFECT", () => {
    const unknowns: unknown[] = [
      new Error("boom"),
      new TypeError("x is undefined"),
      null,
      undefined,
      "string error",
      42,
      Symbol("oops"),
      {},
      { code: "P2002" },
      [],
    ];
    for (const value of unknowns) {
      expect(classifyUnknownError(value)).toBe("CODE_DEFECT");
    }
  });

  it("memetakan VALIDATION_REJECTED, AUTHORIZATION_REJECTED, dan RATE_LIMITED dari AppError", () => {
    expect(classifyUnknownError(appError("VALIDATION_ERROR"))).toBe("VALIDATION_REJECTED");
    expect(classifyUnknownError(appError("NOT_FOUND"))).toBe("VALIDATION_REJECTED");
    expect(classifyUnknownError(appError("UNAUTHORIZED"))).toBe("AUTHORIZATION_REJECTED");
    expect(classifyUnknownError(appError("FORBIDDEN"))).toBe("AUTHORIZATION_REJECTED");
    expect(classifyUnknownError(appError("RATE_LIMITED"))).toBe("RATE_LIMITED");
    expect(classifyUnknownError(appError("INTERNAL_ERROR"))).toBe("CODE_DEFECT");
  });

  it("memberi kategori yang valid untuk setiap ErrorCode", () => {
    for (const code of ERROR_CODES) {
      expect(FAILURE_KINDS).toContain(failureKindForErrorCode(code));
      expect(classifyUnknownError(appError(code))).toBe(failureKindForErrorCode(code));
    }
  });

  it("tidak pernah melempar, termasuk untuk objek bermusuhan", () => {
    const throwingGetter = {
      get name(): string {
        throw new Error("getter");
      },
    };
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    const hostileProxy = new Proxy(
      {},
      {
        get() {
          throw new Error("trap");
        },
        getPrototypeOf() {
          throw new Error("trap");
        },
      },
    );

    for (const value of [throwingGetter, cyclic, hostileProxy]) {
      expect(() => classifyUnknownError(value)).not.toThrow();
      expect(classifyUnknownError(value)).toBe("CODE_DEFECT");
    }
  });

  it("hanya mengembalikan nilai FailureKind, bukan pesan mentah", () => {
    const kind = classifyUnknownError(new Error("token=abc123 user@example.com"));
    expect(FAILURE_KINDS).toContain(kind);
    expect(kind).not.toContain("abc123");
  });
});

describe("sanitizeSafeContext", () => {
  it("menyimpan id/enum pendek dan membuang entri sensitif", () => {
    expect(
      sanitizeSafeContext({
        orderId: "ord_123",
        status: "PENDING",
        attempt: "2",
        email: "a@b.co",
        accessToken: "abc",
        note: "ada spasi di sini",
        contact: "user@example.com",
        long: "x".repeat(65),
      }),
    ).toEqual({ orderId: "ord_123", status: "PENDING", attempt: "2" });
  });

  it("membuang nilai non-string (objek, angka, array) dan tidak melempar untuk getter/proxy bermusuhan", () => {
    expect(
      sanitizeSafeContext({
        request: { url: "/x" },
        count: 3,
        list: ["a"],
        route: "/admin/orders",
      }),
    ).toEqual({ route: "/admin/orders" });

    const throwing = {
      get orderId(): string {
        throw new Error("getter");
      },
    };
    const proxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("trap");
        },
      },
    );
    expect(() => sanitizeSafeContext(throwing)).not.toThrow();
    expect(sanitizeSafeContext(throwing)).toBeUndefined();
    expect(() => sanitizeSafeContext(proxy)).not.toThrow();
    expect(sanitizeSafeContext(proxy)).toBeUndefined();
  });

  it("mengembalikan undefined untuk input bukan objek atau tanpa entri valid", () => {
    expect(sanitizeSafeContext(null)).toBeUndefined();
    expect(sanitizeSafeContext("x")).toBeUndefined();
    expect(sanitizeSafeContext({ email: "a@b.co" })).toBeUndefined();
  });
});

describe("createConsoleFailureLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseEvent: FailureEvent = {
    boundary: "api:POST /api/uploads/intents",
    correlationId: "11111111-2222-3333-4444-555555555555",
    errorCode: "INTERNAL_ERROR",
    kind: "CODE_DEFECT",
    occurredAt: new Date("2026-10-03T10:00:00.000Z"),
  };

  it("mencatat correlationId, boundary, kind, errorCode, dan occurredAt", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    createConsoleFailureLogger().record({
      ...baseEvent,
      safeContext: { orderId: "ord_1", email: "a@b.co" },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0]?.[0];
    expect(typeof line).toBe("string");
    const parsed: unknown = JSON.parse(String(line));
    expect(parsed).toEqual({
      event: "failure",
      boundary: baseEvent.boundary,
      correlationId: baseEvent.correlationId,
      errorCode: "INTERNAL_ERROR",
      kind: "CODE_DEFECT",
      occurredAt: "2026-10-03T10:00:00.000Z",
      safeContext: { orderId: "ord_1" },
    });
    expect(String(line)).not.toContain("a@b.co");
  });

  it("tidak melempar saat occurredAt tidak valid atau console gagal", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = createConsoleFailureLogger();

    expect(() =>
      logger.record({ ...baseEvent, occurredAt: new Date(Number.NaN) }),
    ).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockImplementation(() => {
      throw new Error("console rusak");
    });
    expect(() => logger.record(baseEvent)).not.toThrow();
  });
});
