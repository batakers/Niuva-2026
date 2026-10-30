import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { CHECKOUT_TRANSACTION_OPTIONS, CheckoutRepository } from "@/modules/checkout/repository";

describe("checkout transaction budget", () => {
  it("runs the checkout transaction with the bound 10 s wait and 20 s timeout, not Prisma's 5 s default", async () => {
    const transaction = vi.fn(async () => { throw new Error("stop after capturing options"); });
    const repository = new CheckoutRepository({ $transaction: transaction } as unknown as PrismaClient);
    const now = new Date("2026-10-30T17:00:00.000Z");
    await expect(repository.createCheckoutTransaction({
      address: { addressLine: "Jl. Uji No. 1", biteshipAreaId: "ID-AREA-FIXTURE", city: "Bandung", countryCode: "ID", phone: "+628000000000", postalCode: "40111", province: "Jawa Barat", recipientName: "Uji" },
      customerEmail: "fixture@example.test", customerName: "Fixture", customerPhone: "+628000000000",
      items: [
        { quantity: 1, variantId: "00000000-0000-4000-8000-000000000001" },
        { quantity: 1, variantId: "00000000-0000-4000-8000-000000000002" },
        { quantity: 1, variantId: "00000000-0000-4000-8000-000000000003" },
      ],
      now, orderId: "00000000-0000-4000-8000-0000000000aa", orderNumber: "ORD-TX-BUDGET", orderPublicTokenHash: "a".repeat(64),
      paymentProviderOrderId: "PAY-TX-BUDGET", reservationExpiresAt: new Date(now.getTime() + 60_000),
      shippingQuote: { catalogFingerprint: "b".repeat(64), courierCode: "jne", courierName: "JNE", expiresAt: new Date(now.getTime() + 60_000), priceRp: new Prisma.Decimal("9000"), providerPayload: {}, serviceCode: "reg", serviceName: "Reguler" },
    })).rejects.toThrow("stop after capturing options");
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), CHECKOUT_TRANSACTION_OPTIONS);
    expect(CHECKOUT_TRANSACTION_OPTIONS).toEqual({ maxWait: 10_000, timeout: 20_000 });
  });
});
