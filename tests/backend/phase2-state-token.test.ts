import { describe, expect, it } from "vitest";

import {
  issueAccessToken,
  verifyAccessToken,
} from "@/modules/shared/access-token";
import { AppError } from "@/modules/shared/errors";
import { createHumanReference, createUniqueHumanReference } from "@/modules/shared/reference";
import {
  transitionStatus,
  type TransitionMap,
} from "@/modules/shared/transition";
import { INQUIRY_TRANSITIONS } from "@/modules/inquiry/transitions";
import { RESERVATION_TRANSITIONS } from "@/modules/inventory/transitions";
import {
  CUSTOM_ORDER_TRANSITIONS,
  RETAIL_ORDER_TRANSITIONS,
  transitionRetailOrder,
} from "@/modules/order/transitions";
import { CUSTOM_REQUEST_TRANSITIONS } from "@/modules/custom-print/transitions";
import { QUOTE_TRANSITIONS } from "@/modules/quote/transitions";
import { PAYMENT_TRANSITIONS } from "@/modules/payment/transitions";
import { SHIPMENT_TRANSITIONS } from "@/modules/shipping/transitions";

const now = new Date("2026-09-04T00:00:00.000Z");

function expectAppError(action: () => unknown, code: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected ${code}.`);
}

function expectKeys<Status extends string>(
  map: TransitionMap<Status>,
  statuses: readonly Status[],
): void {
  expect(Object.keys(map).sort()).toEqual([...statuses].sort());
}

describe("Phase 2 transition contracts", () => {
  it("keeps every persisted workflow status represented exactly once", () => {
    expectKeys(INQUIRY_TRANSITIONS, [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "QUOTED",
      "WON",
      "LOST",
      "CLOSED",
    ]);
    expectKeys(RESERVATION_TRANSITIONS, ["ACTIVE", "CONSUMED", "RELEASED"]);
    expectKeys(RETAIL_ORDER_TRANSITIONS, [
      "PENDING_PAYMENT",
      "PAID",
      "PROCESSING",
      "READY_TO_SHIP",
      "SHIPPED",
      "COMPLETED",
      "CANCELLED",
      "SUBMITTED",
      "UNDER_REVIEW",
      "WAITING_FOR_APPROVAL",
      "WAITING_PAYMENT",
      "IN_PRODUCTION",
      "FINISHING_QC",
      "WAITING_SHIPPING_PAYMENT",
    ]);
    expectKeys(CUSTOM_ORDER_TRANSITIONS, Object.keys(RETAIL_ORDER_TRANSITIONS) as (keyof typeof CUSTOM_ORDER_TRANSITIONS)[]);
    expectKeys(CUSTOM_REQUEST_TRANSITIONS, [
      "SUBMITTED",
      "UNDER_REVIEW",
      "QUOTE_READY",
      "QUOTE_SENT",
      "APPROVED",
      "DECLINED",
      "CANCELLED",
    ]);
    expectKeys(QUOTE_TRANSITIONS, ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"]);
    expectKeys(PAYMENT_TRANSITIONS, ["PENDING", "SETTLED", "FAILED", "EXPIRED", "CANCELLED", "REFUNDED"]);
    expectKeys(SHIPMENT_TRANSITIONS, ["PENDING", "SHIPPED", "DELIVERED", "EXCEPTION"]);
  });

  it("emits a rejected transition audit before returning a typed failure", async () => {
    const events: Array<Record<string, unknown>> = [];

    await expect(
      transitionStatus(
        INQUIRY_TRANSITIONS,
        {
          audit: (event) => {
            events.push(event);
          },
          current: "CLOSED",
          entityId: "inquiry-1",
          entityType: "B2BInquiry",
          next: "NEW",
        },
      ),
    ).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
      details: { from: "CLOSED", to: "NEW" },
    });

    expect(events).toEqual([
      {
        entityId: "inquiry-1",
        entityType: "B2BInquiry",
        from: "CLOSED",
        outcome: "REJECTED",
        to: "NEW",
      },
    ]);
  });

  it("gates policy-dependent edges without changing invalid-edge semantics", async () => {
    const policyEvents: Array<Record<string, unknown>> = [];
    await expect(
      transitionRetailOrder({
        audit: (event) => {
          policyEvents.push(event);
        },
        current: "PENDING_PAYMENT",
        next: "CANCELLED",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(policyEvents.at(-1)).toMatchObject({
      from: "PENDING_PAYMENT",
      outcome: "REJECTED",
      to: "CANCELLED",
    });

    await expect(
      transitionRetailOrder({
        allowCancellation: true,
        current: "PENDING_PAYMENT",
        next: "CANCELLED",
      }),
    ).resolves.toBe("CANCELLED");

    await expect(
      transitionRetailOrder({
        current: "COMPLETED",
        next: "CANCELLED",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
  });
});

describe("Phase 2 public references and access tokens", () => {
  it("retries a colliding human reference and keeps the date/prefix readable", async () => {
    const first = createHumanReference({
      now,
      prefix: "ORD",
      randomBytes: () => new Uint8Array(8).fill(1),
    });
    let calls = 0;
    const reference = await createUniqueHumanReference({
      exists: async (candidate) => candidate === first,
      now,
      prefix: "ORD",
      randomBytes: (size) => new Uint8Array(size).fill(++calls),
    });

    expect(reference).not.toBe(first);
    expect(reference).toMatch(/^ORD-20260904-[A-Z2-9]{8}$/);
    expect(calls).toBe(2);
  });

  it("binds a high-entropy token to scope/entity and enforces expiry/revocation", () => {
    const expiresAt = new Date("2026-09-04T01:00:00.000Z");
    const issued = issueAccessToken({
      entityId: "order-1",
      expiresAt,
      now,
      randomBytes: (size) => new Uint8Array(size).fill(7),
      scope: "ORDER_STATUS",
    });

    expect(issued.token).not.toBe(issued.tokenHash);
    expect(issued.token.length).toBeGreaterThan(40);
    expect(() =>
      verifyAccessToken({
        entityId: issued.entityId,
        expectedHash: issued.tokenHash,
        expiresAt,
        now,
        scope: issued.scope,
        token: issued.token,
      }),
    ).not.toThrow();

    expectAppError(
      () =>
        verifyAccessToken({
          entityId: issued.entityId,
          expectedHash: issued.tokenHash,
          now,
          scope: "CUSTOM_PRINT_QUOTE",
          token: issued.token,
        }),
      "UNAUTHORIZED",
    );
    expectAppError(
      () =>
        verifyAccessToken({
          entityId: issued.entityId,
          expectedHash: issued.tokenHash,
          expiresAt,
          now: new Date("2026-09-04T01:00:00.000Z"),
          scope: issued.scope,
          token: issued.token,
        }),
      "UNAUTHORIZED",
    );
    expectAppError(
      () =>
        verifyAccessToken({
          entityId: issued.entityId,
          expectedHash: issued.tokenHash,
          now,
          revokedAt: now,
          scope: issued.scope,
          token: issued.token,
        }),
      "UNAUTHORIZED",
    );
  });
});
