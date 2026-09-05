import Decimal from "decimal.js";
import { z } from "zod";

import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  createTransitionAuditRecorder,
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";
import { appError } from "@/modules/shared/errors";
import { createUniqueHumanReference } from "@/modules/shared/reference";
import { parseWithValidation } from "@/modules/shared/validation";

import {
  ShippingRepository,
  type CustomShippingContext,
  type CustomShippingPreparation,
  type ShippingServiceRepository,
} from "./repository";
import { transitionCustomOrder } from "@/modules/order/transitions";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { customPaymentExpiresAt } from "@/modules/policy/commercial";

const nonNegativeDecimal = z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/);

export const customPackageMeasurementSchema = z.object({
  finalHeightCm: nonNegativeDecimal,
  finalLengthCm: nonNegativeDecimal,
  finalWeightGrams: nonNegativeDecimal,
  finalWidthCm: nonNegativeDecimal,
});

export type CustomPackageMeasurement = z.infer<
  typeof customPackageMeasurementSchema
>;

export type ShippingProviderRate = Readonly<{
  courierCode: string;
  courierName: string;
  etaText?: string;
  priceRp: Decimal;
  providerPayload: Readonly<Record<string, unknown>>;
  serviceCode: string;
  serviceName: string;
}>;

export interface CustomShippingProvider {
  getRate(input: Readonly<{
    context: CustomShippingContext;
    measurement: CustomPackageMeasurement;
    orderId: string;
  }>): Promise<ShippingProviderRate>;
}

export interface CustomShippingPaymentProvider {
  createPayment(input: Readonly<{
    amountRp: string;
    orderId: string;
    orderNumber: string;
    providerOrderId: string;
  }>): Promise<Readonly<{ redirectUrl?: string; token?: string }>>;
}

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type ShippingServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  now?: () => Date;
  paymentProvider?: CustomShippingPaymentProvider;
  repository?: ShippingServiceRepository;
  shippingProvider?: CustomShippingProvider;
}>;

export class ShippingService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly clock: () => Date;
  private readonly paymentProvider?: CustomShippingPaymentProvider;
  private readonly repositoryFactory: () => ShippingServiceRepository;
  private readonly shippingProvider: CustomShippingProvider;

  constructor(dependencies: ShippingServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.clock = dependencies.now ?? (() => new Date());
    this.paymentProvider = dependencies.paymentProvider;
    this.repositoryFactory = () => dependencies.repository ?? new ShippingRepository();
    this.shippingProvider =
      dependencies.shippingProvider ?? unavailableShippingProvider;
  }

  async createCustomShippingPayment(
    orderId: string,
    measurementInput: unknown,
  ): Promise<Readonly<{
    payment: Readonly<{ redirectUrl?: string; token?: string }>;
    preparation: CustomShippingPreparation;
  }>> {
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "SHIPPING_MANAGE");
    const measurement = parseWithValidation(
      customPackageMeasurementSchema,
      measurementInput,
    );
    const repository = this.repositoryFactory();
    const context = await repository.findCustomShippingContext(orderId);

    if (context === null) {
      throw appError("NOT_FOUND");
    }

    if (context.orderType !== "CUSTOM_PRINT") {
      throw appError("CONFLICT", {
        message: "Shipping final custom hanya tersedia untuk order custom print.",
      });
    }

    if (
      context.status !== "FINISHING_QC" &&
      context.status !== "WAITING_SHIPPING_PAYMENT"
    ) {
      throw appError("CONFLICT", {
        message: "Order custom belum berada pada tahap shipping custom.",
      });
    }

    const rate = await this.shippingProvider.getRate({
      context,
      measurement,
      orderId,
    });
    const priceRp = new Decimal(rate.priceRp.toString());

    if (!priceRp.isFinite() || priceRp.isNegative()) {
      throw appError("VALIDATION_ERROR", {
        details: { shipping: "Harga shipping custom tidak valid." },
      });
    }

    if (this.paymentProvider === undefined) {
      throw appError("SHIPPING_PROVIDER_UNAVAILABLE", {
        message: "Payment provider shipping custom belum dikonfigurasi.",
      });
    }

    if (context.status === "FINISHING_QC") {
      const transitionAudit =
        this.audit === undefined
          ? undefined
          : createTransitionAuditRecorder(this.audit, {
              actorId: admin.profile.id,
              actorType: "ADMIN",
            });
      await transitionCustomOrder({
        audit: transitionAudit,
        current: context.status,
        entityId: orderId,
        next: "WAITING_SHIPPING_PAYMENT",
      });
    }

    const now = this.clock();
    const paymentProviderOrderId = await createUniqueHumanReference({
      exists: (candidate) => repository.paymentProviderOrderIdExists(candidate),
      now,
      prefix: "SHP",
    });
    const preparation = await repository.createCustomShippingPayment({
      courierCode: rate.courierCode,
      courierName: rate.courierName,
      etaText: rate.etaText,
      finalHeightCm: new Decimal(measurement.finalHeightCm),
      finalLengthCm: new Decimal(measurement.finalLengthCm),
      finalWeightGrams: new Decimal(measurement.finalWeightGrams),
      finalWidthCm: new Decimal(measurement.finalWidthCm),
      orderId,
      paymentExpiresAt: customPaymentExpiresAt(now),
      paymentProviderOrderId,
      priceRp,
      providerPayload: rate.providerPayload,
      serviceCode: rate.serviceCode,
      serviceName: rate.serviceName,
      now,
    });
    const preparedProviderOrderId =
      preparation.paymentProviderOrderId ?? paymentProviderOrderId;
    const payment =
      preparation.payment ??
      (await this.paymentProvider.createPayment({
        amountRp: preparation.amountRp.toString(),
        orderId: preparation.orderId,
        orderNumber: preparation.orderNumber,
        providerOrderId: preparedProviderOrderId,
      }));

    if (preparation.payment === undefined) {
      await repository.attachPaymentProviderResult(
        preparation.paymentAttemptId,
        payment,
      );
    }

    await recordAudit(this.audit, {
      action: "shipping.custom.rate.created",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: {
        amountRp: preparation.amountRp.toString(),
        shipmentId: preparation.shipmentId,
      },
      entityId: orderId,
      entityType: "Shipment",
    });

    return { payment, preparation };
  }
}

const unavailableShippingProvider: CustomShippingProvider = {
  async getRate() {
    throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
  },
};
