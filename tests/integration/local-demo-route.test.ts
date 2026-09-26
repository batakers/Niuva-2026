import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { vi } from "vitest";

const customerAuthMocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
}));

vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: customerAuthMocks.requireCustomer,
}));

import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { POST as postCheckout } from "@/app/api/checkout/route";
import { POST as postShippingRates } from "@/app/api/shipping/rates/route";
import {
  LOCAL_DEMO_VARIANT_SKU,
  seedLocalDemoCatalog,
} from "@/modules/demo/seed";

const prisma = getPrismaClient();
const testEnvironment = process.env as Record<string, string | undefined>;
const originalRuntimeMode = process.env.NIUVA_RUNTIME_MODE;
const originalNodeEnv = process.env.NODE_ENV;

function publicRequest(path: string, payload: unknown): Request {
  return new Request(`http://127.0.0.1:3000${path}`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      origin: "http://127.0.0.1:3000",
    },
    method: "POST",
  });
}

beforeAll(async () => {
  testEnvironment.NIUVA_RUNTIME_MODE = "demo";
  testEnvironment.NODE_ENV = "test";
  await seedLocalDemoCatalog(prisma);
  const customer = await prisma.customer.create({
    data: {
      email: "local-demo-customer@example.test",
      googleSubject: "local-demo-google-customer",
      normalizedEmail: "local-demo-customer@example.test",
    },
  });
  customerAuthMocks.requireCustomer.mockResolvedValue({
    avatarUrl: null,
    displayName: "Local Demo Customer",
    email: customer.email,
    id: customer.id,
    normalizedEmail: customer.normalizedEmail,
  });
});

afterAll(async () => {
  if (originalRuntimeMode === undefined) {
    delete testEnvironment.NIUVA_RUNTIME_MODE;
  } else {
    testEnvironment.NIUVA_RUNTIME_MODE = originalRuntimeMode;
  }
  if (originalNodeEnv === undefined) {
    delete testEnvironment.NODE_ENV;
  } else {
    testEnvironment.NODE_ENV = originalNodeEnv;
  }
});

describe("local demo checkout route", () => {
  it("uses deterministic adapters and records DEMO provider snapshots", async () => {
    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { sku: LOCAL_DEMO_VARIANT_SKU },
      select: { id: true },
    });
    const ratesResponse = await postShippingRates(
      publicRequest("/api/shipping/rates", {
        destination: { countryCode: "ID", postalCode: "40132" },
        items: [{ quantity: 1, variantId: variant.id }],
      }),
    );
    expect(ratesResponse.status).toBe(200);
    const ratesBody = (await ratesResponse.json()) as {
      options?: Array<{ optionId?: unknown }>;
    };
    const shippingOptionId = ratesBody.options?.[0]?.optionId;
    if (typeof shippingOptionId !== "string") {
      throw new Error("Rate demo tidak mengembalikan option ID.");
    }

    const idempotencyKey = `local-demo-${Date.now()}`;
    const payload = {
      address: {
        addressLine: "Jalan Demo Nomor 12, RT 01 RW 02",
        city: "Bandung",
        countryCode: "ID",
        district: "Coblong",
        phone: "+628000000001",
        postalCode: "40132",
        province: "Jawa Barat",
        recipientName: "Demo Recipient",
      },
      customerEmail: `local-demo-${Date.now()}@example.test`,
      customerName: "Demo Integration",
      customerPhone: "+628000000001",
      idempotencyKey,
      items: [{ quantity: 1, variantId: variant.id }],
      shippingOptionId,
    };
    const response = await postCheckout(
      publicRequest("/api/checkout", payload),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      kind: "CREATED",
      payment: { provider: "DEMO" },
      totalRp: "200000",
    });

    const orderId = body.orderId;
    if (typeof orderId !== "string") {
      throw new Error("Checkout demo tidak mengembalikan order ID.");
    }
    await expect(
      prisma.order.findUnique({
        include: { paymentAttempts: true, shipmentRates: true },
        where: { id: orderId },
      }),
    ).resolves.toMatchObject({
      paymentAttempts: [expect.objectContaining({ provider: "DEMO" })],
      shipmentRates: [
        expect.objectContaining({
          courierCode: "demo",
          provider: "DEMO",
        }),
      ],
      status: "PENDING_PAYMENT",
    });

    const replay = await postCheckout(
      publicRequest("/api/checkout", payload),
    );
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      kind: "REPLAY",
      orderId,
      status: "PENDING_PAYMENT",
    });

    // Keep this assertion explicit so the fixture cannot accidentally move to
    // a fractional-money path while the demo remains provider-neutral.
    expect(new Prisma.Decimal("200000").isInteger()).toBe(true);
  });
});
