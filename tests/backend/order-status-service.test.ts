import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import { issueAccessToken } from "@/modules/shared/access-token";
import {
  OrderStatusService,
  type OrderStatusRepository,
} from "@/modules/order/status-service";
import type { OrderMutationState } from "@/modules/order/repository";

const admin: AdminAccess = {
  clerkUserId: "user_admin",
  profile: {
    clerkUserId: "user_admin",
    id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
    isActive: true,
    role: "ADMIN",
  },
};

function repositoryFor(
  state: Omit<OrderMutationState, "shipment">,
  onUpdate: () => void,
): OrderStatusRepository {
  const mutationState: OrderMutationState = { ...state, shipment: null };
  return {
    async findForPublicStatusById() {
      return {
        cancelledAt: null,
        completedAt: null,
        createdAt: new Date("2026-09-20T00:00:00.000Z"),
        grandTotalRp: "10000",
        items: [],
        orderNumber: "ORD-TEST-1",
        orderType: state.orderType,
        paidAt: null,
        publicTokenHash: "token-hash",
        shipments: [],
        status: state.status,
      };
    },
    async findStatusForMutation() {
      return mutationState;
    },
    async updateStatusIfCurrent() {
      onUpdate();
      return mutationState;
    },
  };
}

describe("OrderStatusService payment authority", () => {
  it.each([
    { current: "PENDING_PAYMENT" as const, next: "PAID" as const, orderType: "RETAIL" as const },
    { current: "WAITING_PAYMENT" as const, next: "PAID" as const, orderType: "CUSTOM_PRINT" as const },
    { current: "WAITING_SHIPPING_PAYMENT" as const, next: "READY_TO_SHIP" as const, orderType: "CUSTOM_PRINT" as const },
  ])("rejects generic settlement from $current to $next", async ({ current, next, orderType }) => {
    let updates = 0;
    const audits: Array<Record<string, unknown>> = [];
    const service = new OrderStatusService({
      audit: async (event) => { audits.push(event); },
      authorizeAdmin: async () => admin,
      repository: repositoryFor(
        { id: "order-1", orderType, status: current },
        () => { updates += 1; },
      ),
    });

    await expect(service.transition("order-1", next)).rejects.toMatchObject({
      code: "PAYMENT_VERIFICATION_FAILED",
    });
    expect(updates).toBe(0);
    expect(audits.at(-1)).toMatchObject({
      action: "order.status.transition",
      metadata: { reason: "VERIFIED_PAYMENT_REQUIRED", result: "REJECTED" },
    });
  });

  it("keeps ordinary fulfillment transitions available", async () => {
    let updates = 0;
    const service = new OrderStatusService({
      audit: async () => undefined,
      authorizeAdmin: async () => admin,
      repository: repositoryFor(
        { id: "order-1", orderType: "RETAIL", status: "PAID" },
        () => { updates += 1; },
      ),
    });

    await expect(service.transition("order-1", "PROCESSING")).resolves.toMatchObject({
      status: "PAID",
    });
    expect(updates).toBe(1);
  });

  it("returns only the unexpired payment handoff for a token-authorized order", async () => {
    const orderId = "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4";
    const now = new Date("2026-09-20T00:00:00.000Z");
    const orderToken = issueAccessToken({
      entityId: orderId,
      now,
      randomBytes: (size) => new Uint8Array(size).fill(21),
      scope: "ORDER_STATUS",
    });
    const service = new OrderStatusService({
      repository: {
        async findForPublicStatusById() {
          return {
            cancelledAt: null,
            completedAt: null,
            createdAt: now,
            grandTotalRp: "55000",
            items: [],
            orderNumber: "ORD-PAYMENT-HANDOFF",
            orderType: "CUSTOM_PRINT" as const,
            paymentAttempts: [
              {
                expiresAt: new Date("2026-09-19T23:59:00.000Z"),
                provider: "MIDTRANS",
                purpose: "ORDER_TOTAL" as const,
                redirectUrl: "https://payment.example.test/expired",
                snapToken: null,
                status: "PENDING" as const,
              },
              {
                expiresAt: new Date("2026-09-20T00:15:00.000Z"),
                provider: "MIDTRANS",
                purpose: "ORDER_TOTAL" as const,
                redirectUrl: "https://payment.example.test/current",
                snapToken: null,
                status: "PENDING" as const,
              },
            ],
            paidAt: null,
            publicTokenHash: orderToken.tokenHash,
            shipments: [],
            status: "WAITING_PAYMENT" as const,
          };
        },
        async findStatusForMutation() { return null; },
        async updateStatusIfCurrent() { return null; },
      },
    });

    await expect(service.getPublicStatus({ orderId, now, token: orderToken.token })).resolves.toMatchObject({
      payment: {
        purpose: "ORDER_TOTAL",
        redirectUrl: "https://payment.example.test/current",
      },
    });
  });

  it("does not mark an order shipped before courier and tracking metadata exist", async () => {
    const audits: Array<Record<string, unknown>> = [];
    const service = new OrderStatusService({
      audit: async (event) => { audits.push(event); },
      authorizeAdmin: async () => admin,
      repository: repositoryFor(
        { id: "order-1", orderType: "RETAIL", status: "READY_TO_SHIP" },
        () => undefined,
      ),
    });

    await expect(service.transition("order-1", "SHIPPED")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(audits.at(-1)).toMatchObject({
      metadata: { reason: "SHIPMENT_METADATA_REQUIRED", result: "REJECTED" },
    });
  });
});
