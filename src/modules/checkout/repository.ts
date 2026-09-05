import Decimal from "decimal.js";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  lockVariant,
  reserveWithinTransaction,
} from "@/modules/inventory/repository";
import { appError } from "@/modules/shared/errors";
import { createRetailShippingCatalogFingerprint } from "@/modules/shipping/retail-rate-service";
import { minimizeShippingRatePayload } from "@/modules/shipping/snapshot";

import type { CheckoutAddress, CheckoutInput } from "./schema";

export type CheckoutShippingQuote = Readonly<{
  catalogFingerprint: string;
  courierCode: string;
  courierName: string;
  etaText?: string;
  expiresAt: Date;
  priceRp: Prisma.Decimal;
  providerPayload: Readonly<Record<string, unknown>>;
  serviceCode: string;
  serviceName: string;
}>;

export type CheckoutTransactionResult = Readonly<{
  grandTotalRp: Prisma.Decimal;
  orderId: string;
  orderNumber: string;
  paymentAttemptId: string;
}>;

export type PaymentProviderResult = Readonly<{
  redirectUrl?: string;
  token?: string;
}>;

export interface CheckoutRepositoryPort {
  attachPaymentProviderResult(
    paymentAttemptId: string,
    result: PaymentProviderResult,
  ): Promise<void>;
  createCheckoutTransaction(input: Readonly<{
    address: CheckoutAddress;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    items: CheckoutInput["items"];
    now: Date;
    orderId: string;
    orderNumber: string;
    orderPublicTokenHash: string;
    paymentProviderOrderId: string;
    reservationExpiresAt: Date;
    shippingQuote: CheckoutShippingQuote;
  }>): Promise<CheckoutTransactionResult>;
  orderNumberExists(orderNumber: string): Promise<boolean>;
  paymentProviderOrderIdExists(providerOrderId: string): Promise<boolean>;
}

type LockedCatalogVariant = Readonly<{
  heightCm: Prisma.Decimal | null;
  id: string;
  lengthCm: Prisma.Decimal | null;
  name: string;
  priceRp: Prisma.Decimal;
  productName: string;
  sku: string;
  weightGrams: Prisma.Decimal;
  widthCm: Prisma.Decimal | null;
}>;

function toMoney(value: Prisma.Decimal): Decimal {
  return new Decimal(value.toString());
}

export class CheckoutRepository implements CheckoutRepositoryPort {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async orderNumberExists(orderNumber: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    return order !== null;
  }

  async paymentProviderOrderIdExists(providerOrderId: string): Promise<boolean> {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerOrderId },
      select: { id: true },
    });

    return attempt !== null;
  }

  async createCheckoutTransaction(input: Readonly<{
    address: CheckoutAddress;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    items: CheckoutInput["items"];
    now: Date;
    orderId: string;
    orderNumber: string;
    orderPublicTokenHash: string;
    paymentProviderOrderId: string;
    reservationExpiresAt: Date;
    shippingQuote: CheckoutShippingQuote;
  }>): Promise<CheckoutTransactionResult> {
    if (input.shippingQuote.expiresAt <= input.now) {
      throw appError("SHIPPING_PROVIDER_UNAVAILABLE", {
        message: "Rate pengiriman sudah kedaluwarsa.",
      });
    }

    if (!Number.isFinite(input.shippingQuote.expiresAt.getTime())) {
      throw appError("SHIPPING_PROVIDER_UNAVAILABLE", {
        message: "Rate pengiriman memiliki expiry yang tidak valid.",
      });
    }

    if (!/^[0-9a-f]{64}$/i.test(input.shippingQuote.catalogFingerprint)) {
      throw appError("VALIDATION_ERROR", {
        details: { shipping: "Snapshot rate pengiriman tidak valid." },
      });
    }

    const shippingPrice = toMoney(input.shippingQuote.priceRp);
    if (!shippingPrice.isFinite() || shippingPrice.isNegative()) {
      throw appError("VALIDATION_ERROR", {
        details: { shipping: "Harga pengiriman tidak valid." },
      });
    }

    const sortedItems = [...input.items].sort((left, right) =>
      left.variantId.localeCompare(right.variantId),
    );

    if (new Set(sortedItems.map((item) => item.variantId)).size !== sortedItems.length) {
      throw appError("VALIDATION_ERROR", {
        details: { items: "Variant checkout tidak boleh duplikat." },
      });
    }

    if (
      sortedItems.some(
        (item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1,
      )
    ) {
      throw appError("VALIDATION_ERROR", {
        details: { items: "Quantity checkout harus bilangan bulat positif." },
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      const variants = new Map<string, LockedCatalogVariant>();

      for (const item of sortedItems) {
        await lockVariant(transaction, item.variantId);
        const variant = await transaction.productVariant.findUnique({
          where: { id: item.variantId },
          select: {
            heightCm: true,
            id: true,
            isActive: true,
            lengthCm: true,
            name: true,
            priceRp: true,
            product: { select: { isPublished: true, name: true } },
            sku: true,
            weightGrams: true,
            widthCm: true,
          },
        });

        if (
          variant === null ||
          !variant.isActive ||
          !variant.product.isPublished
        ) {
          throw appError("NOT_FOUND");
        }

        variants.set(item.variantId, {
          heightCm: variant.heightCm,
          id: variant.id,
          lengthCm: variant.lengthCm,
          name: variant.name,
          priceRp: variant.priceRp,
          productName: variant.product.name,
          sku: variant.sku,
          weightGrams: variant.weightGrams,
          widthCm: variant.widthCm,
        });
      }

      const currentShippingFingerprint = createRetailShippingCatalogFingerprint(
        input.items.map((item) => {
          const variant = variants.get(item.variantId);

          if (variant === undefined) {
            throw appError("NOT_FOUND");
          }

          return {
            heightCm: variant.heightCm,
            id: variant.id,
            lengthCm: variant.lengthCm,
            priceRp: variant.priceRp,
            quantity: item.quantity,
            weightGrams: variant.weightGrams,
            widthCm: variant.widthCm,
          };
        }),
      );

      if (currentShippingFingerprint !== input.shippingQuote.catalogFingerprint) {
        throw appError("CONFLICT", {
          message: "Katalog berubah sejak rate pengiriman dibuat. Pilih ulang pengiriman.",
        });
      }

      let itemsSubtotal = new Decimal(0);
      for (const item of input.items) {
        const variant = variants.get(item.variantId);
        if (variant === undefined) {
          throw appError("NOT_FOUND");
        }

        itemsSubtotal = itemsSubtotal.plus(
          toMoney(variant.priceRp).times(item.quantity),
        );
      }

      const grandTotal = itemsSubtotal.plus(shippingPrice);
      const order = await transaction.order.create({
        data: {
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          grandTotalRp: grandTotal,
          id: input.orderId,
          itemsSubtotalRp: itemsSubtotal,
          orderNumber: input.orderNumber,
          orderType: "RETAIL",
          publicTokenHash: input.orderPublicTokenHash,
          shippingTotalRp: shippingPrice,
          status: "PENDING_PAYMENT",
        },
        select: { id: true, orderNumber: true },
      });

      await transaction.orderAddress.create({
        data: {
          addressLine: input.address.addressLine,
          biteshipAreaId: input.address.biteshipAreaId,
          city: input.address.city,
          countryCode: input.address.countryCode,
          district: input.address.district,
          orderId: order.id,
          phone: input.address.phone,
          postalCode: input.address.postalCode,
          province: input.address.province,
          recipientName: input.address.recipientName,
        },
      });

      await transaction.shipmentRateSnapshot.create({
        data: {
          courierCode: input.shippingQuote.courierCode,
          courierName: input.shippingQuote.courierName,
          etaText: input.shippingQuote.etaText,
          orderId: order.id,
          priceRp: shippingPrice,
          providerPayloadJson: minimizeShippingRatePayload(
            input.shippingQuote.providerPayload,
          ),
          serviceCode: input.shippingQuote.serviceCode,
          serviceName: input.shippingQuote.serviceName,
        },
      });

      for (const item of input.items) {
        const variant = variants.get(item.variantId);
        if (variant === undefined) {
          throw appError("NOT_FOUND");
        }

        const lineTotal = toMoney(variant.priceRp).times(item.quantity);
        await transaction.orderItem.create({
          data: {
            itemType: "PRODUCT",
            lineTotalRp: lineTotal,
            nameSnapshot: `${variant.productName} — ${variant.name}`,
            orderId: order.id,
            quantity: item.quantity,
            skuSnapshot: variant.sku,
            unitPriceRp: variant.priceRp,
            variantId: variant.id,
          },
        });

        await reserveWithinTransaction(
          transaction,
          {
            expiresAt: input.reservationExpiresAt,
            orderId: order.id,
            quantity: item.quantity,
            variantId: item.variantId,
          },
          input.now,
        );
      }

      const paymentAttempt = await transaction.paymentAttempt.create({
        data: {
          amountRp: grandTotal,
          expiresAt: input.reservationExpiresAt,
          orderId: order.id,
          providerOrderId: input.paymentProviderOrderId,
          purpose: "ORDER_TOTAL",
        },
        select: { id: true },
      });

      return {
        grandTotalRp: grandTotal,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentAttemptId: paymentAttempt.id,
      };
    });
  }

  async attachPaymentProviderResult(
    paymentAttemptId: string,
    result: PaymentProviderResult,
  ): Promise<void> {
    await this.prisma.paymentAttempt.update({
      where: { id: paymentAttemptId },
      data: {
        redirectUrl: result.redirectUrl,
        snapToken: result.token,
      },
    });
  }
}
