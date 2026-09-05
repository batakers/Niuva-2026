import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import { CatalogService } from "@/modules/catalog/service";
import type { CatalogRepositoryPort } from "@/modules/catalog/repository";
import { CheckoutService } from "@/modules/checkout/service";
import type {
  CheckoutRepositoryPort,
  CheckoutShippingQuote,
} from "@/modules/checkout/repository";
import { InquiryService } from "@/modules/inquiry/service";
import type { InquiryServiceRepository } from "@/modules/inquiry/service";
import type {
  InventoryRepositoryPort,
  ReservationRecord,
  ReservationTransitionResult,
} from "@/modules/inventory/repository";
import { InventoryService } from "@/modules/inventory/service";
import { ShippingService } from "@/modules/shipping/service";
import type {
  CustomShippingContext,
  ShippingServiceRepository,
} from "@/modules/shipping/repository";
import type { StoredIdempotencyResponse } from "@/modules/idempotency/state";

const admin: AdminAccess = {
  clerkUserId: "user_admin",
  profile: {
    clerkUserId: "user_admin",
    id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
    isActive: true,
    role: "ADMIN",
  },
};

const now = new Date("2026-09-04T00:00:00.000Z");

function auditRecorder() {
  const events: Array<Record<string, unknown>> = [];
  const record = (event: Record<string, unknown>): void => {
    events.push(event);
  };
  return { events, record };
}

describe("Phase 2 catalog and inventory services", () => {
  it("keeps catalog mutations behind admin authorization and audits stock changes", async () => {
    const audit = auditRecorder();
    let calls = 0;
    const repository: CatalogRepositoryPort = {
      async createProduct() {
        return { id: "product-1" };
      },
      async createVariant() {
        return { id: "variant-1" };
      },
      async findPublishedProductBySlug() {
        return null;
      },
      async findPublishedProducts() {
        return [];
      },
      async findPurchasableVariantBySku() {
        return null;
      },
      async updateProduct() {
        return { id: "product-1" };
      },
      async updateStock() {
        calls += 1;
        return { id: "variant-1", previousStockOnHand: 2, stockOnHand: 5 };
      },
      async updateVariant() {
        return { id: "variant-1" };
      },
    };
    const service = new CatalogService({
      audit: audit.record,
      authorizeAdmin: async () => admin,
      repository,
    });

    await expect(
      service.setStock("variant-1", { stockOnHand: 5 }),
    ).resolves.toEqual({
      id: "variant-1",
      previousStockOnHand: 2,
      stockOnHand: 5,
    });
    expect(calls).toBe(1);
    expect(audit.events.at(-1)).toMatchObject({
      action: "catalog.stock.adjusted",
      actorType: "ADMIN",
      entityId: "variant-1",
    });
  });

  it("records idempotent reservation consumption without decrementing twice", async () => {
    const audit = auditRecorder();
    const result: ReservationTransitionResult = {
      expiresAt: new Date("2026-09-04T01:00:00.000Z"),
      id: "reservation-1",
      orderId: "order-1",
      previousStatus: "CONSUMED",
      quantity: 2,
      status: "CONSUMED",
      variantId: "variant-1",
    };
    const reservation: ReservationRecord = {
      expiresAt: result.expiresAt,
      id: result.id,
      orderId: result.orderId,
      quantity: result.quantity,
      status: "ACTIVE",
      variantId: result.variantId,
    };
    const repository: InventoryRepositoryPort = {
      async findAvailableQuantity() {
        return 3;
      },
      async releaseExpired() {
        return [];
      },
      async reserve() {
        return reservation;
      },
      async transition() {
        return result;
      },
      async updateStock() {
        return { id: "variant-1", previousStockOnHand: 2, stockOnHand: 4 };
      },
    };
    const service = new InventoryService({ audit: audit.record, repository });

    await expect(service.consume("reservation-1", now)).resolves.toEqual(result);
    expect(audit.events.at(-1)).toMatchObject({
      action: "inventory.reservation.idempotent",
      entityId: "reservation-1",
    });
  });
});

describe("Phase 2 inquiry and checkout services", () => {
  it("creates a tokenized inquiry and schedules notification only after persistence", async () => {
    const audit = auditRecorder();
    const calls: string[] = [];
    const repository: InquiryServiceRepository = {
      async create(input) {
        calls.push(`create:${input.referenceNumber}`);
        return { id: input.id, referenceNumber: input.referenceNumber };
      },
      async findUploadReadyFileIds() {
        return [];
      },
      async referenceExists() {
        return false;
      },
      async updateStatusIfCurrent() {
        return null;
      },
    };
    const service = new InquiryService({
      audit: audit.record,
      notification: async (input) => {
        calls.push(`notify:${input.inquiryId}`);
      },
      randomBytes: (size) => new Uint8Array(size).fill(9),
      repository,
    });

    const result = await service.submit({
      confidentialityAck: true,
      currentStage: "CAD",
      description: "Prototype housing",
      email: "client@example.test",
      name: "Client",
      phone: "+628000000000",
      projectGoal: "Validate prototype",
      referenceLink: "https://example.test/reference",
      targetDeadline: "2026-10-01",
      targetQuantity: "10",
    });

    expect(result.accessToken.scope).toBe("B2B_INQUIRY");
    expect(result.accessToken.token).not.toBe(result.accessToken.tokenHash);
    expect(calls[0]).toMatch(/^create:/);
    expect(calls[1]).toMatch(/^notify:/);
    expect(audit.events.at(-1)).toMatchObject({
      action: "inquiry.submitted",
      entityType: "B2BInquiry",
    });
  });

  it("ignores client totals and never calls payment provider inside the repository transaction", async () => {
    const audit = auditRecorder();
    const orderCalls: string[] = [];
    const idempotency = {
      async reserve() {
        return { kind: "RESERVED" as const };
      },
      async complete(input: { response: StoredIdempotencyResponse }) {
        orderCalls.push(`complete:${input.response.grandTotalRp}`);
      },
    };
    const shippingQuote: CheckoutShippingQuote = {
      catalogFingerprint: "0".repeat(64),
      courierCode: "JNE",
      courierName: "JNE",
      expiresAt: new Date("2026-09-04T01:00:00.000Z"),
      priceRp: new Decimal("2500"),
      providerPayload: { courierCode: "JNE", secret: "discard" },
      serviceCode: "REG",
      serviceName: "Regular",
    };
    let paymentCalled = false;
    const repository: CheckoutRepositoryPort = {
      async attachPaymentProviderResult() {
        orderCalls.push("attach");
      },
      async createCheckoutTransaction(input) {
        expect(input.shippingQuote).toBe(shippingQuote);
        expect(input).not.toHaveProperty("grandTotalRp");
        orderCalls.push("transaction");
        return {
          grandTotalRp: new Decimal("12500"),
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          paymentAttemptId: "payment-attempt-1",
        };
      },
      async orderNumberExists() {
        return false;
      },
      async paymentProviderOrderIdExists() {
        return false;
      },
    };
    const service = new CheckoutService({
      audit: audit.record,
      idempotency,
      now: () => now,
      paymentProvider: {
        async createPayment(input) {
          paymentCalled = true;
          orderCalls.push(`payment:${input.amountRp}`);
          return { token: "provider-token" };
        },
      },
      randomBytes: (size) => new Uint8Array(size).fill(3),
      repository,
      reservationExpiry: (value) => new Date(value.getTime() + 900_000),
      shippingProvider: {
        async getRate() {
          return shippingQuote;
        },
      },
    });

    const result = await service.create({
      address: {
        addressLine: "Jl. Test 1",
        city: "Bandung",
        countryCode: "ID",
        phone: "+628000000000",
        postalCode: "40111",
        province: "Jawa Barat",
        recipientName: "Client",
      },
      customerEmail: "client@example.test",
      customerName: "Client",
      customerPhone: "+628000000000",
      grandTotalRp: "1",
      idempotencyKey: "checkout-key-1",
      items: [{ quantity: 1, variantId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4" }],
      shippingOptionId: "jne-reg",
    });

    expect(result.kind).toBe("CREATED");
    if (result.kind === "CREATED") {
      expect(result.totalRp).toBe("12500");
    }
    expect(paymentCalled).toBe(true);
    expect(orderCalls).toEqual([
      "transaction",
      "payment:12500",
      "attach",
      "complete:12500",
    ]);
  });
});

describe("Phase 2 custom shipping guard", () => {
  it("does not invoke a shipping provider for a retail order", async () => {
    const retailContext: CustomShippingContext = {
      address: null,
      orderNumber: "ORD-20260904-ABCDEFGH",
      orderType: "RETAIL",
      status: "FINISHING_QC",
    };
    let providerCalls = 0;
    const repository: ShippingServiceRepository = {
      async attachPaymentProviderResult() {
        throw new Error("must not attach");
      },
      async createCustomShippingPayment() {
        throw new Error("must not create");
      },
      async findCustomShippingContext() {
        return retailContext;
      },
      async paymentProviderOrderIdExists() {
        return false;
      },
    };
    const service = new ShippingService({
      authorizeAdmin: async () => admin,
      repository,
      shippingProvider: {
        async getRate() {
          providerCalls += 1;
          throw new Error("must not call");
        },
      },
    });

    await expect(
      service.createCustomShippingPayment("order-1", {
        finalHeightCm: "1",
        finalLengthCm: "1",
        finalWeightGrams: "1",
        finalWidthCm: "1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(providerCalls).toBe(0);
  });
});
