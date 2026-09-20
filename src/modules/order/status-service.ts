import type {
  OrderStatus,
  OrderType,
  PaymentAttemptStatus,
  PaymentPurpose,
} from "@/generated/prisma/client";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  createTransitionAuditRecorder,
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";
import {
  issueAccessToken,
  verifyAccessToken,
  type IssuedAccessToken,
} from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { getCancellationDecision } from "@/modules/policy/commercial";

import {
  OrderRepository,
  type OrderMutationState,
  type OrderTokenForReissue,
} from "./repository";
import {
  requiresVerifiedPaymentSettlement,
  transitionCustomOrder,
  transitionRetailOrder,
} from "./transitions";

type AuthorizeAdmin = () => Promise<AdminAccess>;

type PublicPaymentAttempt = Readonly<{
  expiresAt: Date;
  provider: string;
  purpose: PaymentPurpose;
  redirectUrl: string | null;
  snapToken: string | null;
  status: PaymentAttemptStatus;
}>;

export type PublicOrderStatus = Readonly<{
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  grandTotalRp?: unknown;
  items: readonly Readonly<{
    lineTotalRp: unknown;
    nameSnapshot: string;
    quantity: number;
  }>[];
  orderNumber: string;
  orderType: OrderType;
  payment?: PublicPaymentHandoff;
  paidAt: Date | null;
  shipments: readonly Readonly<{
    status: string;
    trackingNumber: string | null;
  }>[];
  status: OrderStatus;
}>;

export type PublicPaymentHandoff = Readonly<{
  expiresAt: Date;
  provider: string;
  purpose: PaymentPurpose;
  redirectUrl?: string;
  token?: string;
}>;

export interface OrderStatusRepository {
  findForPublicStatusById(orderId: string): Promise<Readonly<{
    cancelledAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    grandTotalRp?: unknown;
    items: readonly Readonly<{
      lineTotalRp: unknown;
      nameSnapshot: string;
      quantity: number;
    }>[];
    orderNumber: string;
    orderType: OrderType;
    paymentAttempts?: readonly Readonly<{
      expiresAt: Date;
      provider: string;
      purpose: PaymentPurpose;
      redirectUrl: string | null;
      snapToken: string | null;
      status: PaymentAttemptStatus;
    }>[];
    paidAt: Date | null;
    publicTokenHash: string;
    shipments: readonly Readonly<{
      status: string;
      trackingNumber: string | null;
    }>[];
    status: OrderStatus;
  }> | null>;
  findStatusForMutation(orderId: string): Promise<OrderMutationState | null>;
  updateStatusIfCurrent(
    orderId: string,
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
    timestamp: Date,
  ): Promise<OrderMutationState | null>;
}

export interface OrderTokenRepository {
  findForTokenReissue(orderId: string): Promise<OrderTokenForReissue | null>;
  replacePublicTokenHash(
    orderId: string,
    currentHash: string,
    nextHash: string,
  ): Promise<boolean>;
}

export type OrderStatusServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  now?: () => Date;
  randomBytes?: (size: number) => Uint8Array;
  repository?: OrderStatusRepository;
  tokenRepository?: OrderTokenRepository;
}>;

export class OrderStatusService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly clock: () => Date;
  private readonly randomBytes?: (size: number) => Uint8Array;
  private readonly repositoryFactory: () => OrderStatusRepository;
  private readonly tokenRepositoryFactory: () => OrderTokenRepository;

  constructor(dependencies: OrderStatusServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.clock = dependencies.now ?? (() => new Date());
    this.randomBytes = dependencies.randomBytes;
    this.repositoryFactory = () => dependencies.repository ?? new OrderRepository();
    this.tokenRepositoryFactory = () =>
      dependencies.tokenRepository ?? new OrderRepository();
  }

  async getPublicStatus(input: Readonly<{
    orderId: string;
    token: string;
    now?: Date;
  }>): Promise<PublicOrderStatus> {
    const order = await this.repositoryFactory().findForPublicStatusById(input.orderId);

    if (order === null) {
      throw appError("UNAUTHORIZED");
    }

    verifyAccessToken({
      entityId: input.orderId,
      expectedHash: order.publicTokenHash,
      now: input.now,
      scope: "ORDER_STATUS",
      token: input.token,
    });

    const payment = publicPaymentHandoff(
      order.paymentAttempts,
      order.status,
      input.now ?? this.clock(),
    );
    const safeProjection = {
      cancelledAt: order.cancelledAt,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      items: order.items,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      paidAt: order.paidAt,
      shipments: order.shipments,
      status: order.status,
      ...(payment === undefined ? {} : { payment }),
      ...(order.grandTotalRp === undefined
        ? {}
        : { grandTotalRp: order.grandTotalRp }),
    };

    return safeProjection;
  }

  async transition(
    orderId: string,
    nextStatus: OrderStatus,
  ): Promise<OrderMutationState> {
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "ORDER_FULFILL");
    const repository = this.repositoryFactory();
    const current = await repository.findStatusForMutation(orderId);

    if (current === null) {
      throw appError("NOT_FOUND");
    }

    const cancellation = getCancellationDecision({
      actor: admin.profile.role,
      orderStatus: current.status,
      orderType: current.orderType,
    });

    if (nextStatus === "CANCELLED" && cancellation.requiresFullRefund) {
      requireAdminPermission(admin, "ORDER_CANCEL_PAID");
      throw appError("CONFLICT", {
        message: "Order berbayar hanya dapat dibatalkan melalui workflow refund penuh.",
      });
    }

    if (requiresVerifiedPaymentSettlement(current.status, nextStatus)) {
      await recordAudit(this.audit, {
        action: "order.status.transition",
        actorId: admin.profile.id,
        actorType: "ADMIN",
        afterJson: { status: nextStatus },
        beforeJson: { status: current.status },
        entityId: orderId,
        entityType: current.orderType === "RETAIL" ? "RetailOrder" : "CustomOrder",
        metadata: {
          reason: "VERIFIED_PAYMENT_REQUIRED",
          result: "REJECTED",
        },
      });
      throw appError("PAYMENT_VERIFICATION_FAILED", {
        message: "Status pembayaran hanya dapat berubah setelah payment provider diverifikasi server.",
      });
    }

    if (
      current.status === "READY_TO_SHIP" &&
      nextStatus === "SHIPPED" &&
      (current.shipment === null ||
        current.shipment.courierCode === null ||
        current.shipment.trackingNumber === null)
    ) {
      await recordAudit(this.audit, {
        action: "order.status.transition",
        actorId: admin.profile.id,
        actorType: "ADMIN",
        afterJson: { status: nextStatus },
        beforeJson: { status: current.status },
        entityId: orderId,
        entityType: current.orderType === "RETAIL" ? "RetailOrder" : "CustomOrder",
        metadata: {
          reason: "SHIPMENT_METADATA_REQUIRED",
          result: "REJECTED",
        },
      });
      throw appError("CONFLICT", {
        message: "Catat kode kurir dan nomor resi sebelum memindahkan order ke status dikirim.",
      });
    }

    if (current.orderType === "RETAIL") {
      const transitionAudit =
        this.audit === undefined
          ? undefined
          : createTransitionAuditRecorder(this.audit, {
              actorId: admin.profile.id,
              actorType: "ADMIN",
            });
      await transitionRetailOrder({
        allowCancellation: nextStatus !== "CANCELLED" || cancellation.allowed,
        audit: transitionAudit,
        current: current.status,
        entityId: orderId,
        next: nextStatus,
      });
    } else {
      const transitionAudit =
        this.audit === undefined
          ? undefined
          : createTransitionAuditRecorder(this.audit, {
              actorId: admin.profile.id,
              actorType: "ADMIN",
            });
      await transitionCustomOrder({
        allowCancellation: nextStatus !== "CANCELLED" || cancellation.allowed,
        audit: transitionAudit,
        current: current.status,
        entityId: orderId,
        next: nextStatus,
      });
    }

    const updated = await repository.updateStatusIfCurrent(
      orderId,
      current.status,
      nextStatus,
      this.clock(),
    );

    if (updated === null) {
      throw appError("CONFLICT", {
        message: "Order berubah sebelum transition selesai.",
      });
    }

    await recordAudit(this.audit, {
      action: "order.status.transition",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { status: nextStatus },
      beforeJson: { status: current.status },
      entityId: orderId,
      entityType: current.orderType === "RETAIL" ? "RetailOrder" : "CustomOrder",
      metadata: { result: "ALLOWED" },
    });

    return updated;
  }

  async reissuePublicToken(orderId: string): Promise<Readonly<{
    accessToken: IssuedAccessToken;
    orderId: string;
    orderNumber: string;
  }>> {
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "ORDER_FULFILL");
    const repository = this.tokenRepositoryFactory();
    const order = await repository.findForTokenReissue(orderId);
    if (order === null) throw appError("NOT_FOUND");

    const accessToken = issueAccessToken({
      entityId: order.id,
      includeEntityId: true,
      now: this.clock(),
      randomBytes: this.randomBytes,
      scope: "ORDER_STATUS",
    });
    const replaced = await repository.replacePublicTokenHash(
      order.id,
      order.publicTokenHash,
      accessToken.tokenHash,
    );
    if (!replaced) {
      throw appError("CONFLICT", {
        message: "Token order berubah sebelum tautan baru disimpan.",
      });
    }

    await recordAudit(this.audit, {
      action: "order.public-token.reissued",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { format: "route-bound-v1" },
      entityId: order.id,
      entityType: "Order",
    });

    return { accessToken, orderId: order.id, orderNumber: order.orderNumber };
  }
}

function publicPaymentHandoff(
  attempts: readonly PublicPaymentAttempt[] | undefined,
  orderStatus: OrderStatus,
  now: Date,
): PublicPaymentHandoff | undefined {
  const purpose = orderStatus === "WAITING_SHIPPING_PAYMENT"
    ? "CUSTOM_SHIPPING"
    : orderStatus === "PENDING_PAYMENT" || orderStatus === "WAITING_PAYMENT"
      ? "ORDER_TOTAL"
      : undefined;
  if (purpose === undefined || attempts === undefined) return undefined;

  const attempt = attempts.find((candidate) =>
    candidate.purpose === purpose &&
    candidate.status === "PENDING" &&
    candidate.expiresAt > now,
  );
  if (attempt === undefined) return undefined;

  return {
    expiresAt: attempt.expiresAt,
    provider: attempt.provider,
    purpose: attempt.purpose,
    ...(attempt.redirectUrl === null ? {} : { redirectUrl: attempt.redirectUrl }),
    ...(attempt.snapToken === null ? {} : { token: attempt.snapToken }),
  };
}
