import Decimal from "decimal.js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const checkoutProviderMocks = vi.hoisted(() => ({
  createBiteshipProvider: vi.fn(),
  createMidtransProvider: vi.fn(),
  createPayment: vi.fn(),
  getRates: vi.fn(),
}));

vi.mock("@/modules/shipping/biteship", () => ({
  createBiteshipRateGatewayFromEnvironment:
    checkoutProviderMocks.createBiteshipProvider,
}));

vi.mock("@/modules/payment/midtrans", () => ({
  createMidtransSnapGatewayFromEnvironment:
    checkoutProviderMocks.createMidtransProvider,
}));

import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { PrismaActionQueueRepository } from "@/modules/admin/action-queue-repository";
import { ActionQueueService } from "@/modules/admin/action-queue-service";
import { PrismaAdminProfileRepository } from "@/modules/admin/repository";
import { requireAdminForSession } from "@/lib/auth/clerk";
import { POST as postCheckout } from "@/app/api/checkout/route";
import { POST as postProjectBrief } from "@/app/api/project-brief/route";
import { POST as postShippingRates } from "@/app/api/shipping/rates/route";

const prisma = getPrismaClient();

async function cleanIntegrationDatabase(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "audit_logs",
      "idempotency_records",
      "payment_events",
      "payment_attempts",
      "shipments",
      "shipment_rate_snapshots",
      "stock_reservations",
      "order_addresses",
      "order_items",
      "orders",
      "custom_print_quotes",
      "custom_print_reviews",
      "custom_print_request_files",
      "custom_print_requests",
      "b2b_inquiry_files",
      "b2b_inquiries",
      "stored_files",
      "product_media",
      "product_variants",
      "products",
      "categories",
      "portfolio_media",
      "portfolio_projects",
      "services",
      "pricing_rule_versions",
      "admin_profiles"
    RESTART IDENTITY CASCADE
  `;
}

beforeEach(async () => {
  await cleanIntegrationDatabase();
  checkoutProviderMocks.createBiteshipProvider.mockReset();
  checkoutProviderMocks.createMidtransProvider.mockReset();
  checkoutProviderMocks.createPayment.mockReset();
  checkoutProviderMocks.getRates.mockReset();
  checkoutProviderMocks.createBiteshipProvider.mockReturnValue({
    getRates: checkoutProviderMocks.getRates,
  });
  checkoutProviderMocks.createMidtransProvider.mockReturnValue({
    createPayment: checkoutProviderMocks.createPayment,
  });
});
afterAll(cleanIntegrationDatabase);

describe("Project Brief route integration", () => {
  it("persists a valid brief and exposes it to the Action Queue", async () => {
    const response = await postProjectBrief(
      new Request("http://127.0.0.1:3000/api/project-brief", {
        body: JSON.stringify({
          confidentialityAck: true,
          currentStage: "CAD",
          description: "Integration route-to-database smoke.",
          email: "integration@example.test",
          name: "Integration Client",
          phone: "+628000000000",
          projectGoal: "Verify the Project Brief operational path",
          referenceLink: "https://example.test/reference",
          targetDeadline: "2026-10-01",
          targetQuantity: "1 prototype",
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("x-correlation-id")).toMatch(/^[0-9a-f-]{36}$/);

    const body = (await response.json()) as Record<string, unknown>;
    expect(typeof body.accessToken).toBe("string");
    expect(body.accessToken).not.toBe("");
    expect(body.referenceNumber).toMatch(/^INQ-[0-9]{8}-[A-Z0-9]{8}$/);

    const referenceNumber = body.referenceNumber;
    if (typeof referenceNumber !== "string") {
      throw new Error("Response tidak mengembalikan reference number.");
    }

    const inquiry = await prisma.b2BInquiry.findUnique({
      select: {
        currentStage: true,
        email: true,
        id: true,
        name: true,
        referenceLink: true,
        referenceNumber: true,
        status: true,
      },
      where: { referenceNumber },
    });

    expect(inquiry).not.toBeNull();
    if (inquiry === null) {
      throw new Error("Inquiry tidak tersimpan pada database test.");
    }

    expect(inquiry).toMatchObject({
      currentStage: "CAD",
      email: "integration@example.test",
      name: "Integration Client",
      referenceLink: "https://example.test/reference",
      referenceNumber,
      status: "NEW",
    });

    await expect(
      prisma.auditLog.findFirst({
        select: { action: true, entityId: true, entityType: true },
        where: { action: "inquiry.submitted", entityId: inquiry.id },
      }),
    ).resolves.toEqual({
      action: "inquiry.submitted",
      entityId: inquiry.id,
      entityType: "B2BInquiry",
    });

    const queue = await new ActionQueueService({
      now: () => new Date("2026-09-14T00:00:00.000Z"),
      repository: new PrismaActionQueueRepository(prisma),
    }).list();

    expect(queue.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "B2B_INQUIRY",
          nextAction: "Tinjau brief proyek baru",
          reference: referenceNumber,
          title: "Brief proyek baru",
        }),
      ]),
    );
  });

  it("resolves an active Clerk user through the database-owned AdminProfile", async () => {
    await prisma.adminProfile.create({
      data: {
        clerkUserId: "clerk_test_owner",
        isActive: true,
        role: "OWNER",
      },
    });

    const access = await requireAdminForSession(
      { userId: "clerk_test_owner" },
      new PrismaAdminProfileRepository(prisma),
    );

    expect(access).toMatchObject({
      clerkUserId: "clerk_test_owner",
      profile: {
        clerkUserId: "clerk_test_owner",
        isActive: true,
        role: "OWNER",
      },
    });
    await expect(
      requireAdminForSession(
        { userId: "clerk_test_unknown" },
        new PrismaAdminProfileRepository(prisma),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("persists a checkout POST through the real route and replays it", async () => {
    await prisma.product.create({
      data: {
        description: "Route checkout fixture",
        isPublished: true,
        name: "Route Fixture",
        slug: "route-checkout-fixture",
        variants: {
          create: {
            heightCm: new Prisma.Decimal("4"),
            lengthCm: new Prisma.Decimal("12"),
            name: "Unit",
            priceRp: new Prisma.Decimal("12500"),
            sku: "ROUTE-CHECKOUT-FIXTURE",
            stockOnHand: 4,
            weightGrams: new Prisma.Decimal("250"),
            widthCm: new Prisma.Decimal("8"),
          },
        },
      },
      include: { variants: true },
    });
    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { sku: "ROUTE-CHECKOUT-FIXTURE" },
    });
    checkoutProviderMocks.getRates.mockResolvedValue([
      {
        courierCode: "JNE",
        courierName: "Jalur Nugraha Ekakurir",
        etaText: "2-3 hari",
        priceRp: new Decimal("15000"),
        providerPayload: {
          courierCode: "JNE",
          serviceCode: "REG",
          providerRequestId: "route-fixture-only",
        },
        serviceCode: "REG",
        serviceName: "Regular",
      },
    ]);
    checkoutProviderMocks.createPayment.mockResolvedValue({
      redirectUrl: "https://app.sandbox.example.test/payment/route-fixture",
      token: "route-fixture-token",
    });

    const rateResponse = await postShippingRates(
      new Request("http://127.0.0.1:3000/api/shipping/rates", {
        body: JSON.stringify({
          destination: {
            biteshipAreaId: "ID-AREA-FIXTURE",
            countryCode: "ID",
            postalCode: "40111",
          },
          items: [{ quantity: 2, variantId: variant.id }],
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );
    expect(rateResponse.status).toBe(200);
    const rateBody = (await rateResponse.json()) as {
      options?: Array<{ optionId?: unknown }>;
    };
    const shippingOptionId = rateBody.options?.[0]?.optionId;
    if (typeof shippingOptionId !== "string") {
      throw new Error("Route shipping tidak mengembalikan option ID.");
    }

    const payload = {
      address: {
        addressLine: "Jl. Route No. 1",
        biteshipAreaId: "ID-AREA-FIXTURE",
        city: "Bandung",
        countryCode: "ID",
        district: "Coblong",
        phone: "+628000000000",
        postalCode: "40111",
        province: "Jawa Barat",
        recipientName: "Route Client",
      },
      customerEmail: "route@example.test",
      customerName: "Route Client",
      customerPhone: "+628000000000",
      idempotencyKey: "route-checkout-1",
      items: [{ quantity: 2, variantId: variant.id }],
      shippingOptionId,
    };
    const makeRequest = () =>
      new Request("http://127.0.0.1:3000/api/checkout", {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      });

    const createdResponse = await postCheckout(makeRequest());
    expect(createdResponse.status).toBe(201);
    const createdBody = (await createdResponse.json()) as Record<string, unknown>;
    expect(createdBody).toMatchObject({
      kind: "CREATED",
      payment: {
        redirectUrl: "https://app.sandbox.example.test/payment/route-fixture",
        token: "route-fixture-token",
      },
      totalRp: "40000",
    });
    expect(typeof createdBody.accessToken).toBe("string");
    expect(typeof createdBody.orderId).toBe("string");
    expect(typeof createdBody.orderNumber).toBe("string");
    expect(checkoutProviderMocks.getRates).toHaveBeenCalledTimes(2);
    expect(checkoutProviderMocks.createPayment).toHaveBeenCalledTimes(1);
    expect(checkoutProviderMocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountRp: "40000" }),
    );

    const orderId = createdBody.orderId;
    if (typeof orderId !== "string") {
      throw new Error("Route checkout tidak mengembalikan order ID.");
    }
    await expect(
      prisma.order.findUnique({
        include: {
          items: true,
          paymentAttempts: true,
          reservations: true,
          shipmentRates: true,
        },
        where: { id: orderId },
      }),
    ).resolves.toMatchObject({
      grandTotalRp: new Prisma.Decimal("40000"),
      items: [
        expect.objectContaining({
          lineTotalRp: new Prisma.Decimal("25000"),
          quantity: 2,
          variantId: variant.id,
        }),
      ],
      orderType: "RETAIL",
      paymentAttempts: [
        expect.objectContaining({
          amountRp: new Prisma.Decimal("40000"),
          snapToken: "route-fixture-token",
        }),
      ],
      reservations: [
        expect.objectContaining({ quantity: 2, status: "ACTIVE" }),
      ],
      shipmentRates: [
        expect.objectContaining({
          courierCode: "JNE",
          priceRp: new Prisma.Decimal("15000"),
        }),
      ],
      status: "PENDING_PAYMENT",
    });

    const replayResponse = await postCheckout(makeRequest());
    expect(replayResponse.status).toBe(200);
    await expect(replayResponse.json()).resolves.toMatchObject({
      kind: "REPLAY",
      orderId,
      status: "PENDING_PAYMENT",
      totalRp: "40000",
    });
    expect(checkoutProviderMocks.getRates).toHaveBeenCalledTimes(2);
    expect(checkoutProviderMocks.createPayment).toHaveBeenCalledTimes(1);
    await expect(prisma.order.count()).resolves.toBe(1);
  });
});
