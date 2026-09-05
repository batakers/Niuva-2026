import { describe, expect, it } from "vitest";

import { sanitizeAuditMetadata } from "@/modules/audit/metadata";
import { resolveIdempotency } from "@/modules/idempotency/state";
import { minimizePaymentEventPayload } from "@/modules/payment/payload";
import { minimizeShippingRatePayload } from "@/modules/shipping/snapshot";

describe("allowlisted operational payloads", () => {
  it("redacts arbitrary audit metadata and provider payload fields", () => {
    expect(
      sanitizeAuditMetadata({
        operation: "quote.send",
        password: "never-store",
        requestId: "req_123",
      }),
    ).toEqual({ operation: "quote.send", requestId: "req_123" });

    expect(
      minimizePaymentEventPayload({
        grossAmount: "10000",
        signatureKey: "secret",
        transactionStatus: "settlement",
      }),
    ).toEqual({ grossAmount: "10000", transactionStatus: "settlement" });

    expect(
      minimizeShippingRatePayload({
        courierCode: "jne",
        customerAddress: "private",
        priceRp: 15_000,
      }),
    ).toEqual({ courierCode: "jne", priceRp: 15_000 });
  });
});

describe("idempotency replay resolution", () => {
  const now = new Date("2026-09-04T00:00:00.000Z");

  it("reserves a new key and replays a matching completed request", () => {
    expect(resolveIdempotency(null, "hash_a", now)).toEqual({ kind: "RESERVED" });

    expect(
      resolveIdempotency(
        {
          completedAt: now,
          expiresAt: new Date("2026-09-04T01:00:00.000Z"),
          requestHash: "hash_a",
          responseJson: { orderNumber: "ORD-1" },
          responseStatus: 201,
          status: "COMPLETED",
        },
        "hash_a",
        now,
      ),
    ).toEqual({
      kind: "REPLAY",
      response: { orderNumber: "ORD-1" },
      responseStatus: 201,
    });
  });

  it("returns deterministic conflicts for reuse, races, and expiry", () => {
    const base = {
      completedAt: null,
      expiresAt: new Date("2026-09-04T01:00:00.000Z"),
      requestHash: "hash_a",
      responseJson: null,
      responseStatus: null,
      status: "IN_PROGRESS" as const,
    };

    expect(resolveIdempotency(base, "hash_b", now)).toEqual({
      kind: "CONFLICT",
      reason: "KEY_REUSED_WITH_DIFFERENT_REQUEST",
    });
    expect(resolveIdempotency(base, "hash_a", now)).toEqual({
      kind: "CONFLICT",
      reason: "IN_PROGRESS",
    });
    expect(
      resolveIdempotency(
        { ...base, expiresAt: new Date("2026-09-03T23:59:59.000Z") },
        "hash_a",
        now,
      ),
    ).toEqual({ kind: "CONFLICT", reason: "EXPIRED_RECORD" });
  });
});
