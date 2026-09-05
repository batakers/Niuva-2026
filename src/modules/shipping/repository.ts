import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";

import { minimizeShippingRatePayload } from "./snapshot";

export type ShippingRateSnapshotInput = Readonly<{
  courierCode: string;
  courierName: string;
  etaText?: string;
  orderId: string;
  priceRp: Prisma.Decimal;
  providerPayload: Readonly<Record<string, unknown>>;
  serviceCode: string;
  serviceName: string;
}>;

export type CustomShippingContext = Readonly<{
  address: Readonly<{
    addressLine: string;
    biteshipAreaId: string | null;
    city: string;
    countryCode: string;
    district: string | null;
    phone: string;
    postalCode: string;
    province: string;
    recipientName: string;
  }> | null;
  orderNumber: string;
  orderType: "CUSTOM_PRINT" | "RETAIL";
  status: "CANCELLED" | "COMPLETED" | "FINISHING_QC" | "IN_PRODUCTION" | "PAID" | "PENDING_PAYMENT" | "PROCESSING" | "READY_TO_SHIP" | "SHIPPED" | "SUBMITTED" | "UNDER_REVIEW" | "WAITING_FOR_APPROVAL" | "WAITING_PAYMENT" | "WAITING_SHIPPING_PAYMENT";
}>;

export type CustomShippingPreparation = Readonly<{
  amountRp: Prisma.Decimal;
  orderId: string;
  orderNumber: string;
  payment?: Readonly<{ redirectUrl?: string; token?: string }>;
  paymentAttemptId: string;
  paymentProviderOrderId?: string;
  shipmentId: string;
}>;

export interface ShippingServiceRepository {
  attachPaymentProviderResult(
    paymentAttemptId: string,
    result: Readonly<{ redirectUrl?: string; token?: string }>,
  ): Promise<void>;
  createCustomShippingPayment(input: Readonly<{
    courierCode: string;
    courierName: string;
    etaText?: string;
    finalHeightCm: Prisma.Decimal;
    finalLengthCm: Prisma.Decimal;
    finalWeightGrams: Prisma.Decimal;
    finalWidthCm: Prisma.Decimal;
    orderId: string;
    paymentExpiresAt: Date;
    paymentProviderOrderId: string;
    priceRp: Prisma.Decimal;
    providerPayload: Readonly<Record<string, unknown>>;
    serviceCode: string;
    serviceName: string;
    now: Date;
  }>): Promise<CustomShippingPreparation>;
  findCustomShippingContext(orderId: string): Promise<CustomShippingContext | null>;
  paymentProviderOrderIdExists(providerOrderId: string): Promise<boolean>;
}

export class ShippingRepository implements ShippingServiceRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async createRateSnapshot(input: ShippingRateSnapshotInput) {
    return this.prisma.shipmentRateSnapshot.create({
      data: {
        courierCode: input.courierCode,
        courierName: input.courierName,
        etaText: input.etaText,
        orderId: input.orderId,
        priceRp: input.priceRp,
        providerPayloadJson: minimizeShippingRatePayload(input.providerPayload),
        serviceCode: input.serviceCode,
        serviceName: input.serviceName,
      },
    });
  }

  async findCustomShippingContext(
    orderId: string,
  ): Promise<CustomShippingContext | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        address: {
          select: {
            addressLine: true,
            biteshipAreaId: true,
            city: true,
            countryCode: true,
            district: true,
            phone: true,
            postalCode: true,
            province: true,
            recipientName: true,
          },
        },
        orderNumber: true,
        orderType: true,
        status: true,
      },
    });
  }

  async paymentProviderOrderIdExists(providerOrderId: string): Promise<boolean> {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerOrderId },
      select: { id: true },
    });

    return attempt !== null;
  }

  async createCustomShippingPayment(input: Readonly<{
    courierCode: string;
    courierName: string;
    etaText?: string;
    finalHeightCm: Prisma.Decimal;
    finalLengthCm: Prisma.Decimal;
    finalWeightGrams: Prisma.Decimal;
    finalWidthCm: Prisma.Decimal;
    orderId: string;
    paymentExpiresAt: Date;
    paymentProviderOrderId: string;
    priceRp: Prisma.Decimal;
    providerPayload: Readonly<Record<string, unknown>>;
    serviceCode: string;
    serviceName: string;
    now: Date;
  }>): Promise<CustomShippingPreparation> {
    return this.prisma.$transaction(async (transaction) => {
      // Lock all payment attempts for this order before locking the order row.
      // The webhook repository uses the same order (attempt, then order) lock
      // order, which prevents two custom-shipping retries from creating a
      // second pending attempt concurrently without introducing a deadlock.
      await transaction.$queryRaw(
        Prisma.sql`
          SELECT "id"
          FROM "payment_attempts"
          WHERE "order_id" = ${input.orderId}::uuid
          FOR UPDATE
        `,
      );
      await transaction.$queryRaw(
        Prisma.sql`
          SELECT "id"
          FROM "orders"
          WHERE "id" = ${input.orderId}::uuid
          FOR UPDATE
        `,
      );

      const order = await transaction.order.findUnique({
        where: { id: input.orderId },
        select: { orderNumber: true, orderType: true, status: true },
      });

      if (order === null) {
        throw appError("NOT_FOUND");
      }

      if (order.orderType !== "CUSTOM_PRINT") {
        throw appError("CONFLICT", {
          message: "Shipping kedua hanya tersedia untuk custom print.",
        });
      }

      if (order.status === "WAITING_SHIPPING_PAYMENT") {
        const existing = await transaction.paymentAttempt.findFirst({
          where: { orderId: input.orderId, purpose: "CUSTOM_SHIPPING" },
          orderBy: { createdAt: "desc" },
          select: {
            amountRp: true,
            id: true,
            providerOrderId: true,
            redirectUrl: true,
            snapToken: true,
            status: true,
          },
        });

        if (existing === null) {
          throw appError("CONFLICT", {
            message:
              "Order menunggu pembayaran shipping custom tetapi attempt belum tersedia.",
          });
        }

        const shipment = await transaction.shipment.findFirst({
          where: { orderId: input.orderId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });

        if (existing !== null && existing.status === "PENDING") {
          if (shipment === null) {
            throw appError("CONFLICT", {
              message:
                "Payment shipping custom pending tidak memiliki snapshot shipment.",
            });
          }

          const payment =
            existing.snapToken === null && existing.redirectUrl === null
              ? undefined
              : {
                  ...(existing.redirectUrl === null
                    ? {}
                    : { redirectUrl: existing.redirectUrl }),
                  ...(existing.snapToken === null
                    ? {}
                    : { token: existing.snapToken }),
                };

          return {
            amountRp: existing.amountRp,
            orderId: input.orderId,
            orderNumber: order.orderNumber,
            ...(payment === undefined ? {} : { payment }),
            paymentAttemptId: existing.id,
            paymentProviderOrderId: existing.providerOrderId,
            shipmentId: shipment.id,
          };
        }

        if (
          existing.status !== "EXPIRED" &&
          existing.status !== "FAILED" &&
          existing.status !== "CANCELLED"
        ) {
          throw appError("CONFLICT", {
            message:
              "Payment shipping custom tidak dapat diganti pada status saat ini.",
          });
        }
      }

      if (
        order.status !== "FINISHING_QC" &&
        order.status !== "WAITING_SHIPPING_PAYMENT"
      ) {
        throw appError("INVALID_STATE_TRANSITION", {
          details: { from: order.status, to: "WAITING_SHIPPING_PAYMENT" },
        });
      }

      await transaction.shipmentRateSnapshot.create({
        data: {
          courierCode: input.courierCode,
          courierName: input.courierName,
          etaText: input.etaText,
          orderId: input.orderId,
          priceRp: input.priceRp,
          providerPayloadJson: minimizeShippingRatePayload(input.providerPayload),
          serviceCode: input.serviceCode,
          serviceName: input.serviceName,
        },
        select: { id: true },
      });
      const shipment = await transaction.shipment.create({
        data: {
          courierCode: input.courierCode,
          finalHeightCm: input.finalHeightCm,
          finalLengthCm: input.finalLengthCm,
          finalWeightGrams: input.finalWeightGrams,
          finalWidthCm: input.finalWidthCm,
          orderId: input.orderId,
          shippingAmountRp: input.priceRp,
          serviceCode: input.serviceCode,
        },
        select: { id: true },
      });

      if (order.status === "FINISHING_QC") {
        const updated = await transaction.order.updateMany({
          where: { id: input.orderId, status: "FINISHING_QC" },
          data: { status: "WAITING_SHIPPING_PAYMENT" },
        });

        if (updated.count === 0) {
          throw appError("CONFLICT", {
            message: "Order berubah sebelum rate shipping custom disimpan.",
          });
        }
      }

      const paymentAttempt = await transaction.paymentAttempt.create({
        data: {
          amountRp: input.priceRp,
          expiresAt: input.paymentExpiresAt,
          orderId: input.orderId,
          providerOrderId: input.paymentProviderOrderId,
          purpose: "CUSTOM_SHIPPING",
        },
        select: { id: true },
      });

      return {
        amountRp: input.priceRp,
        orderId: input.orderId,
        orderNumber: order.orderNumber,
        paymentAttemptId: paymentAttempt.id,
        paymentProviderOrderId: input.paymentProviderOrderId,
        shipmentId: shipment.id,
      };
    });
  }

  async attachPaymentProviderResult(
    paymentAttemptId: string,
    result: Readonly<{ redirectUrl?: string; token?: string }>,
  ): Promise<void> {
    await this.prisma.paymentAttempt.update({
      where: { id: paymentAttemptId },
      data: { redirectUrl: result.redirectUrl, snapToken: result.token },
    });
  }
}
