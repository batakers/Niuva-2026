import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { z } from "zod";
import { recordAudit, type AuditRecorder, createTransitionAuditRecorder } from "@/modules/shared/audit";
import { appError } from "@/modules/shared/errors";
import { requireAdminPermission } from "@/modules/admin/permissions";

import {
  InventoryRepository,
  type InventoryRepositoryPort,
  type ReservationRecord,
  type ReservationTransitionResult,
} from "./repository";
import { transitionReservation } from "./transitions";
import { parseWithValidation } from "@/modules/shared/validation";

const manualAdjustmentSchema = z.object({
  expectedStockOnHand: z.int().nonnegative().max(2_147_483_647),
  reason: z.string().trim().min(1).max(500),
  stockOnHand: z.int().nonnegative().max(2_147_483_647),
});

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type InventoryServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  repository?: InventoryRepositoryPort;
}>;

export class InventoryService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly repositoryFactory: () => InventoryRepositoryPort;

  constructor(dependencies: InventoryServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.repositoryFactory = () =>
      dependencies.repository ?? new InventoryRepository();
  }

  async availableQuantity(variantId: string, now = new Date()): Promise<number> {
    return this.repositoryFactory().findAvailableQuantity(variantId, now);
  }

  async reserve(input: Readonly<{
    expiresAt: Date;
    orderId: string;
    quantity: number;
    variantId: string;
  }>): Promise<ReservationRecord> {
    const reservation = await this.repositoryFactory().reserve(input);

    await recordAudit(this.audit, {
      action: "inventory.reservation.created",
      actorType: "SYSTEM",
      afterJson: {
        expiresAt: reservation.expiresAt.toISOString(),
        quantity: reservation.quantity,
        status: reservation.status,
        variantId: reservation.variantId,
      },
      entityId: reservation.id,
      entityType: "StockReservation",
      metadata: { operation: "reserve" },
    });

    return reservation;
  }

  async consume(reservationId: string, now = new Date()) {
    return this.transitionReservation(reservationId, "CONSUMED", now);
  }

  async release(reservationId: string, now = new Date()) {
    return this.transitionReservation(reservationId, "RELEASED", now);
  }

  async releaseExpired(variantId?: string, now = new Date()) {
    const released = await this.repositoryFactory().releaseExpired(variantId, now);

    for (const reservation of released) {
      await this.auditTransition(reservation, "RELEASED");
    }

    return released;
  }

  async adjustStock(variantId: string, input: unknown) {
    const parsed = parseWithValidation(manualAdjustmentSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "INVENTORY_ADJUST");

    const repository = this.repositoryFactory();
    if (repository.updateStock === undefined) {
      throw appError("INTERNAL_ERROR");
    }

    return repository.updateStock(variantId, { ...parsed, adminId: admin.profile.id });
  }

  private async transitionReservation(
    reservationId: string,
    next: "CONSUMED" | "RELEASED",
    now: Date,
  ): Promise<ReservationTransitionResult> {
    const repository = this.repositoryFactory();
    const transitionWriter =
      this.audit === undefined
        ? undefined
        : createTransitionAuditRecorder(this.audit, { actorType: "SYSTEM" });
    const result = await repository.transition(reservationId, next, now);

    if (result.previousStatus !== result.status) {
      await transitionReservation({
        audit: transitionWriter,
        current: result.previousStatus,
        entityId: result.id,
        next: result.status,
      });
    } else {
      await recordAudit(this.audit, {
        action: "inventory.reservation.idempotent",
        actorType: "SYSTEM",
        afterJson: { status: result.status },
        entityId: result.id,
        entityType: "StockReservation",
        metadata: { operation: next.toLowerCase() },
      });
    }

    return result;
  }

  private async auditTransition(
    result: ReservationTransitionResult,
    next: "RELEASED",
  ): Promise<void> {
    const transitionWriter =
      this.audit === undefined
        ? undefined
        : createTransitionAuditRecorder(this.audit, { actorType: "SYSTEM" });

    await transitionReservation({
      audit: transitionWriter,
      current: result.previousStatus,
      entityId: result.id,
      next,
    });
  }
}
