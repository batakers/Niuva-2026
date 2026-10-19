import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission } from "../admin/permissions";
import { assertInternalAccountActive } from "../customer-auth/internal-testing";
import { lockCustomerLifecycle } from "../customer-privacy/lifecycle";
import { lockPaymentOrder } from "../payment/operational-repository";
import { appError, isAppError } from "../shared/errors";
import { assertPendingRefundReturn, assertRefundSnapshot, assertRefundVersion, buildRefundSnapshot, refundHash, type RefundSnapshot } from "./core";
import type { RefundIntakeInput, RefundRefreshInput, RefundRequestInput, RefundReturnInput, RefundReviewInput } from "./schema";
import type { AdminRefundOrderView, RefundCaseView, RefundOrderView } from "./types";

type Actor = Readonly<{ kind: "CUSTOMER"; id: string }> | Readonly<{ kind: "ADMIN"; access: AdminAccess; ownerOnly?: boolean; write?: boolean }>;
const orderSelect = {
  id: true, orderNumber: true, status: true, customerId: true, accountClosedAt: true, currency: true,
  paymentAttempts: { orderBy: { id: "asc" }, select: { id: true, purpose: true, provider: true, providerOrderId: true,
    providerTransactionId: true, amountRp: true, status: true, settledAt: true, events: { orderBy: [{ receivedAt: "asc" }, { id: "asc" }], select: { processingResult: true } } } },
} satisfies Prisma.OrderSelect;
const caseInclude = { allocations: { orderBy: { paymentAttemptId: "asc" } }, approvals: { orderBy: { caseVersion: "desc" }, include: { returnReceipt: true } } } satisfies Prisma.RefundCaseInclude;
type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
type CaseRow = Prisma.RefundCaseGetPayload<{ include: typeof caseInclude }>;
function snapshotFor(order: OrderRow): RefundSnapshot {
  return buildRefundSnapshot(order.id, order.currency, order.paymentAttempts.map(payment => ({ ...payment, amountRp: payment.amountRp.toFixed(0) })));
}
function snapshotJson(snapshot: RefundSnapshot): Prisma.InputJsonObject {
  return { hash: snapshot.hash, totalRp: snapshot.totalRp, currency: "IDR", allocations: snapshot.allocations.map(allocation => ({ ...allocation })) };
}
function actorId(actor: Actor): string { return actor.kind === "CUSTOMER" ? actor.id : actor.access.profile.id; }
function caseView(row: CaseRow): RefundCaseView {
  const approval = row.approvals.find(value => value.caseVersion === row.approvedVersion);
  return { id: row.id, status: row.status, version: row.version, category: row.category, reason: row.reason,
    amountRp: row.amountRp.toFixed(0), currency: row.currency, receivedAt: row.receivedAt.toISOString(), readyAt: row.readyAt?.toISOString() ?? null,
    returnState: approval ? approval.returnReceipt ? "RECEIVED" : approval.returnState : null,
    allocations: row.allocations.map(allocation => ({ paymentAttemptId: allocation.paymentAttemptId, purpose: allocation.purpose, amountRp: allocation.amountRp.toFixed(0) })) };
}
function orderView(order: OrderRow, row: CaseRow | null): RefundOrderView {
  let snapshot: RefundSnapshot | null = null, eligibilityIssue: string | null = null;
  try { snapshot = snapshotFor(order); } catch (error) { if (!isAppError(error)) throw error; eligibilityIssue = error.message; }
  return { orderId: order.id, orderNumber: order.orderNumber, orderStatus: order.status, accountClosed: order.accountClosedAt !== null,
    eligibleAmountRp: snapshot?.totalRp ?? null, eligibilityIssue, snapshotChanged: row !== null && snapshot?.hash !== row.snapshotHash, refund: row ? caseView(row) : null };
}
function replay(row: Readonly<{ requestHash: string; caseId: string }>, caseId: string, hash: string): void {
  if (row.caseId !== caseId || row.requestHash !== hash) throw appError("CONFLICT", { message: "Kunci pengajuan sudah dipakai untuk permintaan berbeda." });
}
async function audit(tx: Prisma.TransactionClient, actor: Actor, id: string, action: string, metadataJson: Prisma.InputJsonObject) {
  await tx.auditLog.create({ data: { actorType: actor.kind, actorId: actorId(actor), entityType: "RefundCase", entityId: id, action, metadataJson } });
}

export class RefundRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private async withOrder<T>(actor: Actor, orderId: string, run: (tx: Prisma.TransactionClient, order: OrderRow, now: Date) => Promise<T>): Promise<T> {
    if (actor.kind === "ADMIN") {
      requireAdminPermission(actor.access, actor.ownerOnly ? "PAYMENT_REFUND_FULL" : actor.write ? "FINANCE_WRITE" : "FINANCE_READ");
      if (actor.ownerOnly && actor.access.profile.role !== "OWNER") throw appError("FORBIDDEN");
    }
    try {
      return await this.prisma.$transaction(async tx => {
        await lockCustomerLifecycle(tx);
        if (actor.kind === "ADMIN") {
          await tx.$queryRaw`SELECT id FROM admin_profiles WHERE id = ${actor.access.profile.id}::uuid FOR UPDATE`;
          const profile = await tx.adminProfile.findFirst({ where: { id: actor.access.profile.id, isActive: true, role: actor.access.profile.role }, select: { authUserId: true } });
          if (!profile || profile.authUserId !== null && profile.authUserId !== actor.access.authUserId) throw appError("FORBIDDEN");
        }
        await lockPaymentOrder(tx, orderId);
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        if (actor.kind === "CUSTOMER") {
          const customer = await tx.customer.findUnique({ where: { id: actor.id }, select: { internalTestExpiresAt: true } });
          if (!customer) throw appError("UNAUTHORIZED");
          assertInternalAccountActive(customer.internalTestExpiresAt, clock.now);
        }
        const order = await tx.order.findUnique({ where: { id: orderId }, select: orderSelect });
        if (!order || actor.kind === "CUSTOMER" && (order.customerId !== actor.id || order.accountClosedAt !== null)) throw appError("NOT_FOUND");
        return run(tx, order, clock.now);
      }, { timeout: 15_000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw appError("CONFLICT", { message: "Pengajuan sudah tercatat atau kunci dipakai untuk permintaan lain." });
      throw error;
    }
  }
  private async readCase(tx: Prisma.TransactionClient, orderId: string): Promise<CaseRow | null> {
    return tx.refundCase.findUnique({ where: { orderId }, include: caseInclude });
  }
  private async requireCase(tx: Prisma.TransactionClient, orderId: string): Promise<CaseRow> {
    const row = await this.readCase(tx, orderId);
    if (!row) throw appError("NOT_FOUND");
    return row;
  }
  async readCustomer(customerId: string, orderId: string): Promise<RefundOrderView> {
    return this.withOrder({ kind: "CUSTOMER", id: customerId }, orderId, async (tx, order) => orderView(order, await this.readCase(tx, orderId)));
  }
  async readAdmin(access: AdminAccess, orderId: string): Promise<AdminRefundOrderView> {
    return this.withOrder({ kind: "ADMIN", access }, orderId, async (tx, order) => {
      const row = await this.readCase(tx, orderId);
      return { ...orderView(order, row), contactVerificationReference: row?.contactVerificationReference ?? null,
        approvals: row?.approvals.map(approval => ({ version: approval.caseVersion, amountRp: approval.amountRp.toFixed(0), ownerId: approval.ownerId,
          reason: approval.reason, approvedAt: approval.approvedAt.toISOString(), returnState: approval.returnState,
          returnEvidenceReference: approval.returnReceipt?.evidenceReference ?? approval.returnEvidenceReference,
          returnReceivedAt: approval.returnReceipt?.receivedAt.toISOString() ?? approval.returnSatisfiedAt?.toISOString() ?? null })) ?? [] };
    });
  }
  async request(customerId: string, input: RefundRequestInput): Promise<RefundCaseView> {
    return this.create({ kind: "CUSTOMER", id: customerId }, input);
  }
  async intake(access: AdminAccess, input: RefundIntakeInput): Promise<RefundCaseView> {
    return this.create({ kind: "ADMIN", access, write: true }, input, input.contactVerificationReference);
  }
  private async create(actor: Actor, input: RefundRequestInput, contactVerificationReference?: string): Promise<RefundCaseView> {
    return this.withOrder(actor, input.orderId, async (tx, order) => {
      const hash = refundHash({ input, actor: actor.kind, actorId: actorId(actor) });
      const existing = await this.readCase(tx, order.id);
      if (existing) {
        if (existing.submissionKey !== input.submissionKey || existing.requestHash !== hash) throw appError("CONFLICT", { message: "Order sudah memiliki kasus refund. Lanjutkan nomor kasus yang sama." });
        return caseView(existing);
      }
      const snapshot = snapshotFor(order);
      const row = await tx.refundCase.create({ data: { orderId: order.id, category: input.category, reason: input.reason,
        requesterType: actor.kind, requestedByCustomerId: actor.kind === "CUSTOMER" ? actor.id : null,
        requestedByAdminId: actor.kind === "ADMIN" ? actor.access.profile.id : null, contactVerificationReference,
        submissionKey: input.submissionKey, requestHash: hash, amountRp: snapshot.totalRp, snapshotHash: snapshot.hash,
        allocations: { create: snapshot.allocations.map(allocation => ({ ...allocation })) } }, include: caseInclude });
      await audit(tx, actor, row.id, "refund.requested", { orderId: order.id, amountRp: snapshot.totalRp, allocations: snapshot.allocations.length });
      return caseView(row);
    });
  }
  async approve(access: AdminAccess, input: RefundReviewInput): Promise<RefundCaseView> {
    const actor = { kind: "ADMIN", access, ownerOnly: true } as const;
    return this.withOrder(actor, input.orderId, async (tx, order, now) => {
      const row = await this.requireCase(tx, order.id), hash = refundHash({ input, ownerId: access.profile.id });
      const prior = await tx.refundApproval.findUnique({ where: { submissionKey: input.submissionKey } });
      if (prior) { replay(prior, row.id, hash); return caseView(row); }
      assertRefundVersion(row, input.expectedVersion, ["REQUESTED"]);
      const snapshot = snapshotFor(order);
      assertRefundSnapshot(row.snapshotHash, snapshot);
      const version = row.version + 1, ready = input.returnState !== "PENDING";
      await tx.refundApproval.create({ data: { caseId: row.id, caseVersion: version, ownerId: access.profile.id,
        submissionKey: input.submissionKey, requestHash: hash, reason: input.reason, amountRp: snapshot.totalRp,
        snapshotHash: snapshot.hash, snapshotJson: snapshotJson(snapshot), returnState: input.returnState,
        returnEvidenceReference: input.returnEvidenceReference, returnSatisfiedAt: ready ? now : null, approvedAt: now } });
      await tx.refundCase.update({ where: { id: row.id }, data: { status: "APPROVED", version, approvedVersion: version, readyAt: ready ? now : null } });
      await audit(tx, actor, row.id, "refund.approved", { version, amountRp: snapshot.totalRp, returnState: input.returnState, ready });
      return caseView(await this.requireCase(tx, order.id));
    });
  }
  async refresh(access: AdminAccess, input: RefundRefreshInput): Promise<RefundCaseView> {
    const actor = { kind: "ADMIN", access, ownerOnly: true } as const;
    return this.withOrder(actor, input.orderId, async (tx, order) => {
      const row = await this.requireCase(tx, order.id), hash = refundHash({ input, ownerId: access.profile.id });
      const prior = await tx.refundCaseRevision.findUnique({ where: { submissionKey: input.submissionKey } });
      if (prior) { replay(prior, row.id, hash); return caseView(row); }
      assertRefundVersion(row, input.expectedVersion, ["REQUESTED", "APPROVED"]);
      const snapshot = snapshotFor(order), version = row.version + 1;
      await tx.refundCaseRevision.create({ data: { caseId: row.id, caseVersion: version, ownerId: access.profile.id, submissionKey: input.submissionKey,
        requestHash: hash, reason: input.reason, snapshotJson: { previous: { hash: row.snapshotHash, amountRp: row.amountRp.toFixed(0), allocations: row.allocations.map(allocation => ({ paymentAttemptId: allocation.paymentAttemptId, purpose: allocation.purpose, provider: allocation.provider, providerOrderId: allocation.providerOrderId, providerTransactionId: allocation.providerTransactionId, amountRp: allocation.amountRp.toFixed(0), source: allocation.source })) }, next: snapshotJson(snapshot) } } });
      await tx.refundAllocation.deleteMany({ where: { caseId: row.id } });
      await tx.refundAllocation.createMany({ data: snapshot.allocations.map(allocation => ({ ...allocation, caseId: row.id })) });
      await tx.refundCase.update({ where: { id: row.id }, data: { status: "REQUESTED", version, approvedVersion: null, readyAt: null, amountRp: snapshot.totalRp, snapshotHash: snapshot.hash } });
      await audit(tx, actor, row.id, "refund.snapshot-refreshed", { version, amountRp: snapshot.totalRp, previousApprovalRevoked: row.approvedVersion !== null });
      return caseView(await this.requireCase(tx, order.id));
    });
  }
  async receiveReturn(access: AdminAccess, input: RefundReturnInput): Promise<RefundCaseView> {
    const actor = { kind: "ADMIN", access, ownerOnly: true } as const;
    return this.withOrder(actor, input.orderId, async (tx, order, now) => {
      const row = await this.requireCase(tx, order.id), hash = refundHash({ input, ownerId: access.profile.id });
      const prior = await tx.refundReturnReceipt.findUnique({ where: { submissionKey: input.submissionKey }, include: { approval: { select: { caseId: true } } } });
      if (prior) { replay({ ...prior, caseId: prior.approval.caseId }, row.id, hash); return caseView(row); }
      const approval = row.approvals.find(value => value.caseVersion === row.approvedVersion);
      assertRefundVersion(row, input.expectedVersion, ["APPROVED"]);
      assertPendingRefundReturn(approval ? { returnState: approval.returnState, hasReceipt: approval.returnReceipt !== null } : undefined);
      if (!approval) throw appError("CONFLICT");
      const snapshot = snapshotFor(order);
      assertRefundSnapshot(row.snapshotHash, snapshot);
      await tx.refundReturnReceipt.create({ data: { approvalId: approval.id, ownerId: access.profile.id, submissionKey: input.submissionKey,
        requestHash: hash, reason: input.reason, evidenceReference: input.returnEvidenceReference, receivedAt: now } });
      await tx.refundCase.update({ where: { id: row.id }, data: { readyAt: now, version: { increment: 1 } } });
      await audit(tx, actor, row.id, "refund.return-received", { approvalId: approval.id, version: row.version + 1 });
      return caseView(await this.requireCase(tx, order.id));
    });
  }
}
