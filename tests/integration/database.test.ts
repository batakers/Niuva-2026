import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { InventoryRepository } from "@/modules/inventory/repository";
import { B2BInquiryRepository } from "@/modules/inquiry/repository";
import { PaymentWebhookRepository } from "@/modules/payment/webhook-repository";
import { PaymentWebhookService } from "@/modules/payment/webhook-service";
import { ShippingRepository } from "@/modules/shipping/repository";
import { ShippingService } from "@/modules/shipping/service";
import { createHash } from "node:crypto";

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

beforeEach(cleanIntegrationDatabase);

afterAll(async () => {
  await cleanIntegrationDatabase();
  await prisma.$disconnect();
});

describe("isolated PostgreSQL integration harness", () => {
  it("runs the reviewed migration only inside the named test database", async () => {
    const rows = await prisma.$queryRaw<
      Array<{
        databaseName: string;
        orderTable: string | null;
        snapshotTrigger: string | null;
      }>
    >`
      SELECT
        current_database() AS "databaseName",
        to_regclass('public.orders')::text AS "orderTable",
        (
          SELECT tgname
          FROM pg_trigger
          WHERE tgname = 'orders_commercial_snapshot_immutable'
        ) AS "snapshotTrigger"
    `;

    expect(rows).toEqual([
      {
        databaseName: "niuva_test",
        orderTable: "orders",
        snapshotTrigger: "orders_commercial_snapshot_immutable",
      },
    ]);
  });

  it("starts each case with deterministic empty domain tables", async () => {
    await expect(prisma.order.count()).resolves.toBe(0);
    await expect(prisma.stockReservation.count()).resolves.toBe(0);
  });

  it("serializes concurrent reservations so stock cannot be oversold", async () => {
    const product = await prisma.product.create({
      data: {
        description: "Integration fixture",
        isPublished: true,
        name: "Fixture",
        slug: "integration-fixture",
        variants: {
          create: {
            isActive: true,
            name: "Only unit",
            priceRp: new Prisma.Decimal("10000"),
            sku: "INTEGRATION-ONE",
            stockOnHand: 1,
            weightGrams: new Prisma.Decimal("10"),
          },
        },
      },
      include: { variants: true },
    });
    const variant = product.variants[0];
    if (variant === undefined) {
      throw new Error("Fixture variant gagal dibuat.");
    }

    const orderData = (suffix: string) => ({
      currency: "IDR",
      customerEmail: `${suffix}@example.test`,
      customerName: suffix,
      customerPhone: "+628000000000",
      grandTotalRp: new Prisma.Decimal("0"),
      itemsSubtotalRp: new Prisma.Decimal("0"),
      orderNumber: `ORD-INTEGRATION-${suffix}`,
      orderType: "RETAIL" as const,
      publicTokenHash: `token-${suffix}`,
      shippingTotalRp: new Prisma.Decimal("0"),
    });
    const [firstOrder, secondOrder] = await Promise.all([
      prisma.order.create({ data: orderData("ONE") }),
      prisma.order.create({ data: orderData("TWO") }),
    ]);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1_000);
    const inventory = new InventoryRepository(prisma);
    const results = await Promise.allSettled([
      inventory.reserve({
        expiresAt,
        orderId: firstOrder.id,
        quantity: 1,
        variantId: variant.id,
      }),
      inventory.reserve({
        expiresAt,
        orderId: secondOrder.id,
        quantity: 1,
        variantId: variant.id,
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      reason: { code: "OUT_OF_STOCK" },
      status: "rejected",
    });
    await expect(
      prisma.stockReservation.aggregate({
        where: { status: "ACTIVE", variantId: variant.id },
        _sum: { quantity: true },
      }),
    ).resolves.toMatchObject({ _sum: { quantity: 1 } });
  });

  it("attaches an uploaded private file before atomically marking it verified", async () => {
    const file = await prisma.storedFile.create({
      data: {
        bucketScope: "PRIVATE_CUSTOMER",
        extension: "stl",
        mimeType: "model/stl",
        originalName: "fixture.stl",
        sizeBytes: BigInt(3),
        storageKey: "private/customer/integration-uploaded-file",
        uploadStatus: "UPLOADED",
      },
    });
    const repository = new B2BInquiryRepository(prisma);
    const inquiry = await repository.create({
      attachmentFileIds: [file.id],
      confidentialityAck: true,
      currentStage: "CAD",
      description: "Fixture private file ownership",
      email: "client@example.test",
      id: "c4b0b03a-5dad-49b4-b9cc-d2c4ca0c8e31",
      name: "Client",
      phone: "+628000000000",
      projectGoal: "Verify ownership transaction",
      publicTokenHash: "inquiry-public-token-hash",
      referenceLink: undefined,
      referenceNumber: "INQ-INTEGRATION-FILE",
      targetDeadline: "2026-10-01",
      targetQuantity: "1",
    });

    await expect(
      prisma.storedFile.findUnique({
        where: { id: file.id },
        include: { b2bInquiryLinks: true },
      }),
    ).resolves.toMatchObject({
      b2bInquiryLinks: [{ inquiryId: inquiry.id }],
      uploadStatus: "VERIFIED",
      verifiedAt: expect.any(Date),
    });
  });

  it("reuses pending custom shipping attempts and replaces only expired attempts", async () => {
    const shippingNow = new Date();
    const shippingExpiry = new Date(shippingNow.getTime() + 86400000);
    const order = await prisma.order.create({
      data: {
        customerEmail: "custom@example.test",
        customerName: "Custom client",
        customerPhone: "+628000000000",
        grandTotalRp: new Prisma.Decimal("0"),
        itemsSubtotalRp: new Prisma.Decimal("0"),
        orderNumber: "ORD-CUSTOM-SHIPPING-RETRY",
        orderType: "CUSTOM_PRINT",
        publicTokenHash: "custom-shipping-token",
        shippingTotalRp: new Prisma.Decimal("0"),
        status: "WAITING_SHIPPING_PAYMENT",
      },
    });
    const shipment = await prisma.shipment.create({
      data: {
        courierCode: "JNE",
        finalHeightCm: new Prisma.Decimal("10"),
        finalLengthCm: new Prisma.Decimal("10"),
        finalWeightGrams: new Prisma.Decimal("100"),
        finalWidthCm: new Prisma.Decimal("10"),
        orderId: order.id,
        serviceCode: "REG",
        shippingAmountRp: new Prisma.Decimal("25000"),
      },
    });
    const attempt = await prisma.paymentAttempt.create({
      data: {
        amountRp: new Prisma.Decimal("25000"),
        expiresAt: shippingExpiry,
        orderId: order.id,
        providerOrderId: "SHP-CUSTOM-ORIGINAL",
        purpose: "CUSTOM_SHIPPING",
        redirectUrl: "https://payment.example.test/original",
        snapToken: "original-token",
      },
    });
    const repository = new ShippingRepository(prisma);
    const input = {
      courierCode: "JNE",
      courierName: "JNE",
      etaText: "2-3 days",
      finalHeightCm: new Prisma.Decimal("10"),
      finalLengthCm: new Prisma.Decimal("10"),
      finalWeightGrams: new Prisma.Decimal("100"),
      finalWidthCm: new Prisma.Decimal("10"),
      orderId: order.id,
      paymentExpiresAt: shippingExpiry,
      paymentProviderOrderId: "SHP-CUSTOM-UNUSED",
      priceRp: new Prisma.Decimal("30000"),
      providerPayload: { courierCode: "JNE", price: 30000 },
      serviceCode: "REG",
      serviceName: "Regular",
      now: shippingNow,
    };

    await expect(repository.createCustomShippingPayment(input)).resolves.toMatchObject({
      amountRp: new Prisma.Decimal("25000"),
      payment: {
        redirectUrl: "https://payment.example.test/original",
        token: "original-token",
      },
      paymentAttemptId: attempt.id,
      paymentProviderOrderId: "SHP-CUSTOM-ORIGINAL",
      shipmentId: shipment.id,
    });
    await expect(prisma.paymentAttempt.count({ where: { orderId: order.id } })).resolves.toBe(1);
    await expect(prisma.shipment.count({ where: { orderId: order.id } })).resolves.toBe(1);

    await expect(repository.createCustomShippingPayment({
      ...input, now: shippingExpiry,
    })).rejects.toMatchObject({ code: "CONFLICT" });

    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });

    const replacements = await Promise.all([
      repository.createCustomShippingPayment(input),
      repository.createCustomShippingPayment({ ...input, paymentProviderOrderId: "SHP-CONCURRENT" }),
    ]);
    const replacement = replacements[0];
    expect(replacements[1].paymentAttemptId).toBe(replacement.paymentAttemptId);
    expect(replacements.filter((result) => result.created)).toHaveLength(1);
    expect(replacement).toMatchObject({
      amountRp: new Prisma.Decimal("30000"),
      paymentProviderOrderId: expect.stringMatching(/^SHP-(CUSTOM-UNUSED|CONCURRENT)$/),
    });
    expect(replacement.paymentAttemptId).not.toBe(attempt.id);
    await expect(prisma.paymentAttempt.count({ where: { orderId: order.id } })).resolves.toBe(2);
    await expect(prisma.shipment.count({ where: { orderId: order.id } })).resolves.toBe(2);
    await expect(prisma.paymentAttempt.findUnique({ where: { id: attempt.id } })).resolves.toMatchObject({
      providerOrderId: "SHP-CUSTOM-ORIGINAL",
      status: "EXPIRED",
    });
    await prisma.paymentAttempt.update({
      where: { id: replacement.paymentAttemptId }, data: { status: "FAILED" },
    });
    let providerCalls = 0;
    const service = new ShippingService({
      repository,
      audit: async () => undefined,
      authorizeAdmin: async () => ({
        clerkUserId: "fixture-admin",
        profile: { clerkUserId: "fixture-admin", id: "fixture-admin", isActive: true, role: "ADMIN" },
      }),
      shippingProvider: { async getRate() { return input; } },
      paymentProvider: { async createPayment(payment) {
        providerCalls += 1;
        const stored = await prisma.paymentAttempt.findUniqueOrThrow({ where: { providerOrderId: payment.providerOrderId } });
        expect(payment.expiresAt).toEqual(stored.expiresAt);
        return { token: "fixture-provider-result" };
      } },
    });
    const measurement = { finalHeightCm: "10", finalLengthCm: "10", finalWeightGrams: "100", finalWidthCm: "10" };
    const calls = await Promise.allSettled([
      service.createCustomShippingPayment(order.id, measurement),
      service.createCustomShippingPayment(order.id, measurement),
    ]);
    expect(calls.some((result) => result.status === "fulfilled")).toBe(true);
    for (const result of calls) {
      if (result.status === "rejected") expect(result.reason).toMatchObject({ code: "CONFLICT" });
    }
    expect(providerCalls).toBe(1);
    await expect(prisma.paymentAttempt.count({ where: { orderId: order.id, status: "PENDING" } })).resolves.toBe(1);
  });

  it("settles a verified Midtrans event exactly once and cancels a late payment", async () => {
    const now = new Date("2026-09-05T08:00:00.000Z");
    const variant = await createWebhookFixtureVariant("WEBHOOK-SETTLED", 1);
    const payable = await createRetailPaymentFixture({
      expiresAt: new Date(now.getTime() + 30 * 60 * 1_000),
      orderNumber: "ORD-WEBHOOK-SETTLED",
      providerOrderId: "PAY-WEBHOOK-SETTLED",
      publicTokenHash: "order-token-settled",
      variantId: variant.id,
    });
    const service = new PaymentWebhookService({
      audit: async () => undefined,
      now: () => now,
      repository: new PaymentWebhookRepository(prisma),
      serverKey: "midtrans-server-key",
    });
    const payload = signedPaymentPayload({
      gross_amount: "12500.00",
      order_id: payable.providerOrderId,
      transaction_id: "transaction-settled",
      transaction_status: "settlement",
    });

    await expect(service.handleMidtransNotification(payload)).resolves.toMatchObject({
      kind: "PROCESSED",
      processingResult: "SETTLED",
    });
    await expect(service.handleMidtransNotification(payload)).resolves.toMatchObject({
      kind: "DUPLICATE",
    });
    await expect(prisma.order.findUnique({ where: { id: payable.orderId } })).resolves.toMatchObject({
      paidAt: now,
      status: "PAID",
    });
    await expect(
      prisma.paymentAttempt.findUnique({ where: { id: payable.paymentAttemptId } }),
    ).resolves.toMatchObject({
      providerTransactionId: "transaction-settled",
      status: "SETTLED",
    });
    await expect(
      prisma.stockReservation.findUnique({ where: { id: payable.reservationId } }),
    ).resolves.toMatchObject({ status: "CONSUMED" });
    await expect(prisma.productVariant.findUnique({ where: { id: variant.id } })).resolves.toMatchObject({
      stockOnHand: 0,
    });
    await expect(prisma.paymentEvent.count()).resolves.toBe(1);

    const lateVariant = await createWebhookFixtureVariant("WEBHOOK-LATE", 1);
    const late = await createRetailPaymentFixture({
      expiresAt: new Date(now.getTime() - 1_000),
      orderNumber: "ORD-WEBHOOK-LATE",
      providerOrderId: "PAY-WEBHOOK-LATE",
      publicTokenHash: "order-token-late",
      variantId: lateVariant.id,
    });

    await expect(
      service.handleMidtransNotification(
        signedPaymentPayload({
          gross_amount: "12500.00",
          order_id: late.providerOrderId,
          transaction_id: "transaction-late",
          transaction_status: "settlement",
        }),
      ),
    ).resolves.toMatchObject({
      kind: "LATE_SETTLEMENT_REFUND_REQUIRED",
    });
    await expect(prisma.order.findUnique({ where: { id: late.orderId } })).resolves.toMatchObject({
      status: "CANCELLED",
    });
    await expect(
      prisma.paymentAttempt.findUnique({ where: { id: late.paymentAttemptId } }),
    ).resolves.toMatchObject({ status: "EXPIRED" });
    await expect(
      prisma.stockReservation.findUnique({ where: { id: late.reservationId } }),
    ).resolves.toMatchObject({ status: "RELEASED" });
    await expect(
      prisma.productVariant.findUnique({ where: { id: lateVariant.id } }),
    ).resolves.toMatchObject({ stockOnHand: 1 });
  });
});

async function createWebhookFixtureVariant(sku: string, stockOnHand: number) {
  const product = await prisma.product.create({
    data: {
      description: "Webhook fixture",
      isPublished: true,
      name: sku,
      slug: sku.toLowerCase(),
      variants: {
        create: {
          isActive: true,
          name: "Unit",
          priceRp: new Prisma.Decimal("12500"),
          sku,
          stockOnHand,
          weightGrams: new Prisma.Decimal("10"),
        },
      },
    },
    include: { variants: true },
  });
  const variant = product.variants[0];

  if (variant === undefined) {
    throw new Error("Variant fixture webhook gagal dibuat.");
  }

  return variant;
}

async function createRetailPaymentFixture(input: Readonly<{
  expiresAt: Date;
  orderNumber: string;
  providerOrderId: string;
  publicTokenHash: string;
  variantId: string;
}>) {
  const order = await prisma.order.create({
    data: {
      currency: "IDR",
      customerEmail: "client@example.test",
      customerName: "Client",
      customerPhone: "+628000000000",
      grandTotalRp: new Prisma.Decimal("12500"),
      itemsSubtotalRp: new Prisma.Decimal("12500"),
      orderNumber: input.orderNumber,
      orderType: "RETAIL",
      publicTokenHash: input.publicTokenHash,
      shippingTotalRp: new Prisma.Decimal("0"),
    },
  });
  const reservation = await prisma.stockReservation.create({
    data: {
      expiresAt: input.expiresAt,
      orderId: order.id,
      quantity: 1,
      variantId: input.variantId,
    },
  });
  const paymentAttempt = await prisma.paymentAttempt.create({
    data: {
      amountRp: new Prisma.Decimal("12500"),
      createdAt: new Date(input.expiresAt.getTime() - 60_000),
      expiresAt: input.expiresAt,
      orderId: order.id,
      providerOrderId: input.providerOrderId,
      purpose: "ORDER_TOTAL",
    },
  });

  return {
    orderId: order.id,
    paymentAttemptId: paymentAttempt.id,
    providerOrderId: paymentAttempt.providerOrderId,
    reservationId: reservation.id,
  };
}

function signedPaymentPayload(overrides: Readonly<Record<string, string>>) {
  const base = {
    gross_amount: "12500.00",
    order_id: "PAY-DEFAULT",
    status_code: "200",
    transaction_id: "transaction-default",
    transaction_status: "settlement",
    ...overrides,
  };

  return {
    ...base,
    signature_key: createHash("sha512")
      .update(
        `${base.order_id}${base.status_code}${base.gross_amount}midtrans-server-key`,
        "utf8",
      )
      .digest("hex"),
  };
}
