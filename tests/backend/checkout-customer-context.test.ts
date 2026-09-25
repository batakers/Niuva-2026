import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";

import { CheckoutService } from "@/modules/checkout/service";

describe("checkout Customer context", () => {
  it("uses the session identity instead of the browser email or name", async () => {
    let transactionInput: Record<string, unknown> | undefined;
    const service = new CheckoutService({
      audit: async () => {},
      idempotency: {
        async reserve() {
          return { kind: "RESERVED" as const };
        },
        async complete() {},
      },
      paymentProvider: {
        provider: "TEST",
        async createPayment() {
          return { token: "test-payment-token" };
        },
      },
      repository: {
        async attachPaymentProviderResult() {},
        async createCheckoutTransaction(input) {
          transactionInput = input as unknown as Record<string, unknown>;
          return {
            grandTotalRp: new Decimal("12500"),
            orderId: "order-id",
            orderNumber: "ORD-TEST-1",
            paymentAttemptId: "payment-attempt-id",
          };
        },
        async findForRecovery() {
          return null;
        },
        async orderNumberExists() {
          return false;
        },
        async paymentProviderOrderIdExists() {
          return false;
        },
        async replacePublicTokenHash() {
          return true;
        },
      },
      shippingProvider: {
        async getRate() {
          return {
            catalogFingerprint: "a".repeat(64),
            courierCode: "TEST",
            courierName: "Test Courier",
            expiresAt: new Date("2026-09-26T00:00:00.000Z"),
            priceRp: new Decimal("2500"),
            providerPayload: {},
            serviceCode: "REG",
            serviceName: "Regular",
          };
        },
      },
    });

    await service.create(
      {
        address: {
          addressLine: "Jalan Contoh Nomor 1",
          city: "Bandung",
          countryCode: "ID",
          phone: "+6281234567890",
          postalCode: "40111",
          province: "Jawa Barat",
          recipientName: "Penerima",
        },
        customerEmail: "attacker@example.com",
        customerName: "Browser Name",
        customerPhone: "+6281234567890",
        idempotencyKey: "customer-context-test",
        items: [{ quantity: 1, variantId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4" }],
        shippingOptionId: "test-rate",
      },
      {
        customerId: "customer-id",
        displayName: "Verified Google Name",
        email: "verified@example.com",
      },
    );

    expect(transactionInput).toMatchObject({
      customerEmail: "verified@example.com",
      customerId: "customer-id",
      customerName: "Verified Google Name",
    });
  });
});
