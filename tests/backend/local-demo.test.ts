import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { isLocalDemoMode } from "@/lib/env/server";
import {
  LocalDemoPaymentProvider,
  LocalDemoShippingProvider,
} from "@/modules/providers/local-demo";

describe("local demo runtime boundary", () => {
  it("enables demo only for a development loopback database", () => {
    expect(
      isLocalDemoMode({
        DATABASE_URL: "postgresql://niuva_dev@127.0.0.1:55433/niuva_dev",
        NIUVA_RUNTIME_MODE: "demo",
        NODE_ENV: "development",
      }),
    ).toBe(true);

    expect(
      isLocalDemoMode({
        DATABASE_URL: "postgresql://app@db.example.test/niuva_dev",
        NIUVA_RUNTIME_MODE: "demo",
        NODE_ENV: "development",
      }),
    ).toBe(false);
    expect(
      isLocalDemoMode({
        DATABASE_URL: "postgresql://niuva_dev@127.0.0.1:55433/niuva_dev",
        NIUVA_RUNTIME_MODE: "demo",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isLocalDemoMode({
        DATABASE_URL: "postgresql://niuva@127.0.0.1:55433/niuva",
        NIUVA_RUNTIME_MODE: "demo",
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });

  it("returns deterministic provider-neutral rates without a network boundary", async () => {
    const provider = new LocalDemoShippingProvider();
    const first = await provider.getRates({
      destination: { countryCode: "ID", postalCode: "40132" },
      items: [
        {
          heightCm: 5,
          lengthCm: 18,
          name: "Desk Organizer Demo",
          quantity: 1,
          sku: "LOCAL-DEMO-DESK-ORGANIZER-GREY",
          valueRp: 185000,
          weightGrams: 650,
          widthCm: 12,
        },
      ],
    });
    const second = await provider.getRates({
      destination: { countryCode: "ID", postalCode: "40132" },
      items: [
        {
          heightCm: 5,
          lengthCm: 18,
          name: "Desk Organizer Demo",
          quantity: 1,
          sku: "LOCAL-DEMO-DESK-ORGANIZER-GREY",
          valueRp: 185000,
          weightGrams: 650,
          widthCm: 12,
        },
      ],
    });

    expect(first).toEqual(second);
    expect(first.map((rate) => rate.priceRp)).toEqual([
      new Decimal("15000"),
      new Decimal("23000"),
    ]);
    expect(first.every((rate) => rate.provider === "DEMO")).toBe(true);
  });

  it("creates a pending demo payment token without claiming settlement", async () => {
    await expect(
      new LocalDemoPaymentProvider().createPayment({
        amountRp: "200000",
        expiresAt: new Date("2026-09-15T10:00:00.000Z"),
        orderId: "order-id",
        orderNumber: "ORD-20260915-ABCDEFGH",
        providerOrderId: "PAY-20260915-ABCDEFGH",
      }),
    ).resolves.toEqual({
      provider: "DEMO",
      token: "demo-token-PAY-20260915-ABCDEFGH",
    });
  });
});
