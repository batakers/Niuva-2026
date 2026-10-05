import Decimal from "decimal.js";
import { describe, expect, it, vi } from "vitest";

import { appError } from "@/modules/shared/errors";
import {
  CheckoutService,
  type CheckoutShippingProvider,
} from "@/modules/checkout/service";
import type { CheckoutShippingQuote } from "@/modules/checkout/repository";

// Req 28.12 / Invariant 5.3: the server re-resolves the shipping option and
// price itself; the browser's optionId is only a lookup key, never a price.

const VARIANT_ID = "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4";

const serverQuote: CheckoutShippingQuote = {
  catalogFingerprint: "a".repeat(64),
  courierCode: "jne",
  courierName: "JNE",
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  priceRp: new Decimal("12500"),
  providerPayload: {},
  serviceCode: "reg",
  serviceName: "Reguler",
};

function browserPayload(extra: Record<string, unknown> = {}) {
  return {
    address: {
      addressLine: "Jalan Contoh Nomor 1",
      city: "Bandung",
      countryCode: "ID",
      phone: "+6281234567890",
      postalCode: "40111",
      province: "Jawa Barat",
      recipientName: "Penerima",
    },
    customerEmail: "buyer@example.com",
    customerName: "Buyer",
    customerPhone: "+6281234567890",
    idempotencyKey: "shipping-revalidation-1",
    items: [{ quantity: 1, variantId: VARIANT_ID }],
    shippingOptionId: "browser-chosen-option",
    ...extra,
  };
}

function buildService(shippingProvider: CheckoutShippingProvider) {
  const createCheckoutTransaction = vi.fn(async (input: { shippingQuote: CheckoutShippingQuote }) => ({
    grandTotalRp: new Decimal("100000").plus(input.shippingQuote.priceRp),
    orderId: "order-id",
    orderNumber: "ORD-TEST-1",
    paymentAttemptId: "payment-attempt-id",
  }));
  const createPayment = vi.fn(async () => ({ token: "test-payment-token" }));
  const service = new CheckoutService({
    audit: async () => {},
    idempotency: {
      async reserve() {
        return { kind: "RESERVED" as const };
      },
      async complete() {},
    },
    paymentProvider: { provider: "TEST", createPayment },
    repository: {
      async attachPaymentProviderResult() {},
      createCheckoutTransaction,
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
    shippingProvider,
  });

  return { createCheckoutTransaction, createPayment, service };
}

describe("checkout server-side shipping revalidation", () => {
  it("re-resolves the browser optionId through the server provider on every checkout", async () => {
    const getRate = vi.fn<CheckoutShippingProvider["getRate"]>(async () => serverQuote);
    const { service } = buildService({ getRate });

    await service.create(browserPayload());

    expect(getRate).toHaveBeenCalledTimes(1);
    expect(getRate).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ quantity: 1, variantId: VARIANT_ID }],
        optionId: "browser-chosen-option",
      }),
    );
  });

  it("ignores browser-supplied prices and persists only the server-resolved quote", async () => {
    const getRate = vi.fn<CheckoutShippingProvider["getRate"]>(async () => serverQuote);
    const { createCheckoutTransaction, createPayment, service } = buildService({ getRate });

    await service.create(
      browserPayload({
        grandTotalRp: "1",
        priceRp: "1",
        shippingPriceRp: "1",
        shippingTotalRp: "1",
      }),
    );

    const providerInput = getRate.mock.calls[0]![0] as Record<string, unknown>;
    expect(Object.keys(providerInput).sort()).toEqual(["address", "items", "optionId"]);

    const transactionInput = createCheckoutTransaction.mock.calls[0]![0];
    expect(transactionInput.shippingQuote).toBe(serverQuote);
    expect(transactionInput.shippingQuote.priceRp.toString()).toBe("12500");
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountRp: "112500" }),
    );
  });

  it("fails closed without creating an order or payment when the server rejects the optionId", async () => {
    const getRate = vi.fn<CheckoutShippingProvider["getRate"]>(async () => {
      throw appError("CONFLICT", { message: "Opsi pengiriman tidak lagi tersedia." });
    });
    const { createCheckoutTransaction, createPayment, service } = buildService({ getRate });

    await expect(
      service.create(browserPayload({ shippingOptionId: "forged-cheap-option" })),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(getRate).toHaveBeenCalledWith(
      expect.objectContaining({ optionId: "forged-cheap-option" }),
    );
    expect(createCheckoutTransaction).not.toHaveBeenCalled();
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("fails closed by default when no shipping provider is configured", async () => {
    const { createCheckoutTransaction, service } = buildService(
      undefined as unknown as CheckoutShippingProvider,
    );

    await expect(service.create(browserPayload())).rejects.toMatchObject({
      code: "SHIPPING_PROVIDER_UNAVAILABLE",
    });
    expect(createCheckoutTransaction).not.toHaveBeenCalled();
  });
});
