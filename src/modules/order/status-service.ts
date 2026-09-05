import type { OrderStatus, OrderType } from "@/generated/prisma/client";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  createTransitionAuditRecorder,
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";
import { verifyAccessToken } from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { getCancellationDecision } from "@/modules/policy/commercial";

import { OrderRepository, type OrderMutationState } from "./repository";
import {
  transitionCustomOrder,
  transitionRetailOrder,
} from "./transitions";

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type PublicOrderStatus = Readonly<{
  completedAt: Date | null;
  createdAt: Date;
  items: readonly Readonly<{
    lineTotalRp: unknown;
    nameSnapshot: string;
    quantity: number;
  }>[];
  orderNumber: string;
  orderType: OrderType;
  paidAt: Date | null;
  shipments: readonly Readonly<{
    status: string;
    trackingNumber: string | null;
  }>[];
  status: OrderStatus;
}>;

export interface OrderStatusRepository {
  findForPublicStatusById(orderId: string): Promise<Readonly<{
    completedAt: Date | null;
    createdAt: Date;
    items: readonly Readonly<{
      lineTotalRp: unknown;
      nameSnapshot: string;
      quantity: number;
    }>[];
    orderNumber: string;
    orderType: OrderType;
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

export type OrderStatusServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  now?: () => Date;
  repository?: OrderStatusRepository;
}>;

export class OrderStatusService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly clock: () => Date;
  private readonly repositoryFactory: () => OrderStatusRepository;

  constructor(dependencies: OrderStatusServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.clock = dependencies.now ?? (() => new Date());
    this.repositoryFactory = () => dependencies.repository ?? new OrderRepository();
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

    const safeProjection = {
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      items: order.items,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      paidAt: order.paidAt,
      shipments: order.shipments,
      status: order.status,
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
}
