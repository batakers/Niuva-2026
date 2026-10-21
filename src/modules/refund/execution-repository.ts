import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { databaseNow } from "@/lib/db/clock";
import { MoneyDecimal } from "../finance/money";
import { appError, isAppError } from "../shared/errors";
import { assertRefundSnapshot, assertRefundVersion, buildTrackedRefundSnapshot, refundHash } from "./core";
import { canRetryRefund, refundKeyForAllocation, refundTargetSchema, type RefundTarget } from "./execution-core";
import type { RefundManualAuthorizeInput, RefundManualConfirmInput, RefundManualRevokeInput, RefundSubmitInput } from "./execution-schema";
import type { RefundCommand, RefundQueryResult, RefundSubmissionResult } from "./gateway";
import { lockRefundOrder, withRefundOrder, type RefundOrderRow } from "./order-context";

const caseInclude = { allocations: { orderBy: { paymentAttemptId: "asc" }, include: { execution: { include: { completion: true, merchantRule: true } } } },
  approvals: { include: { returnReceipt: true } } } satisfies Prisma.RefundCaseInclude;
type CaseRow = Prisma.RefundCaseGetPayload<{ include: typeof caseInclude }>;
type Allocation = CaseRow["allocations"][number];
export type RefundQueryTarget = Readonly<{ id: string; orderId: string; target: RefundTarget }>;
export type SubmissionIntent = RefundQueryTarget & Readonly<{ attemptId: string }>;
const owner = (access: AdminAccess) => ({ kind: "ADMIN", access, ownerOnly: true }) as const;
const conflict = () => appError("CONFLICT", { message: "Refund ditahan. Muat ulang kasus dan periksa bukti pembayaran atau hasil provider." });
function targetFor(allocation: Allocation): RefundTarget {
  const parsed = refundTargetSchema.safeParse({ providerOrderId: allocation.providerOrderId, providerTransactionId: allocation.providerTransactionId, amountRp: allocation.amountRp.toFixed(0) });
  if (!parsed.success || allocation.provider !== "MIDTRANS") throw conflict();
  return parsed.data;
}
async function readCase(tx: Prisma.TransactionClient, orderId: string): Promise<CaseRow> {
  const row = await tx.refundCase.findUnique({ where: { orderId }, include: caseInclude });
  if (!row) throw appError("NOT_FOUND");
  return row;
}
function assertFacts(order: RefundOrderRow, row: CaseRow) {
  const payments = order.paymentAttempts.map(payment => ({ ...payment, amountRp: payment.amountRp.toFixed(0) }));
  assertRefundSnapshot(row.snapshotHash, buildTrackedRefundSnapshot(order.id, order.currency, payments, row.allocations.filter(item => item.execution?.completion).map(item => ({ paymentAttemptId: item.paymentAttemptId, source: item.source }))));
  const approval = row.approvals.find(value => value.caseVersion === row.approvedVersion);
  if (!approval || approval.snapshotHash !== row.snapshotHash || !approval.amountRp.eq(row.amountRp) || !row.readyAt || approval.returnState === "PENDING" && !approval.returnReceipt) throw conflict();
  return approval;
}
async function audit(tx: Prisma.TransactionClient, row: CaseRow, action: string, metadataJson: Prisma.InputJsonObject, access?: AdminAccess) {
  await tx.auditLog.create({ data: { entityType: "RefundCase", entityId: row.id, actorType: access ? "ADMIN" : "SYSTEM", actorId: access?.profile.id, action, metadataJson: { orderId: row.orderId, ...metadataJson } } });
}
async function paymentEvent(tx: Prisma.TransactionClient, allocation: Allocation, result: string, key: string, now: Date) {
  await tx.paymentEvent.createMany({ data: [{ paymentAttemptId: allocation.paymentAttemptId, provider: allocation.provider, providerOrderId: allocation.providerOrderId,
    providerTransactionId: allocation.providerTransactionId, eventFingerprint: refundHash({ result, key }), processingResult: result, receivedAt: now, processedAt: now }], skipDuplicates: true });
}
async function completeCase(tx: Prisma.TransactionClient, order: RefundOrderRow, now: Date) {
  const row = await readCase(tx, order.id);
  if (!row.allocations.every(item => item.execution?.completion && item.execution.state === "CONFIRMED")) return;
  try { assertFacts(order, row); }
  catch (error) {
    if (!isAppError(error) || error.code !== "CONFLICT") throw error;
    await tx.refundCase.update({ where: { id: row.id }, data: { status: "RECONCILING", completedAt: null } });
    await audit(tx, row, "refund.reconciliation-held", { reason: "PAYMENT_SNAPSHOT_CHANGED" });
    return;
  }
  const total = row.allocations.reduce((sum, item) => sum.plus(item.execution!.completion!.amountRp), new MoneyDecimal(0));
  if (!total.eq(row.amountRp)) throw conflict();
  if (row.status !== "COMPLETED") {
    await tx.refundCase.update({ where: { id: row.id }, data: { status: "COMPLETED", completedAt: now, version: { increment: 1 } } });
    await audit(tx, row, "refund.completed", { amountRp: total.toFixed(0) });
  }
}
export class RefundExecutionRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  async beginSubmission(access: AdminAccess, input: RefundSubmitInput): Promise<SubmissionIntent | null> {
    return withRefundOrder(this.prisma, owner(access), input.orderId, async (tx, order, now) => {
      let row = await readCase(tx, order.id);
      const hash = refundHash({ input, ownerId: access.profile.id });
      const prior = await tx.refundExecutionAttempt.findUnique({ where: { submissionKey: input.submissionKey }, include: { execution: { include: { allocation: true } } } });
      if (prior) { if (prior.requestHash !== hash || prior.execution.allocation.caseId !== row.id) throw conflict(); return null; }
      assertRefundVersion(row, input.expectedVersion, ["APPROVED", "RECONCILING"]);
      const approval = assertFacts(order, row);
      if (row.status === "APPROVED") {
        for (const allocation of row.allocations) {
          await tx.refundExecution.create({ data: { allocationId: allocation.id, approvalId: approval.id, refundKey: refundKeyForAllocation(allocation.id), publicReason: input.publicReason } });
          await paymentEvent(tx, allocation, "REFUND_OPERATION_STARTED", allocation.id, now);
        }
        await tx.refundCase.update({ where: { id: row.id }, data: { status: "RECONCILING", version: { increment: 1 } } });
        await audit(tx, row, "refund.execution-started", { approvalId: approval.id, allocations: row.allocations.length }, access);
        row = await readCase(tx, order.id);
      }
      const allocation = row.allocations.find(value => value.id === input.allocationId), execution = allocation?.execution;
      if (!allocation || !execution || execution.publicReason !== input.publicReason || execution.completion) throw conflict();
      if (execution.state !== "READY" && !(execution.merchantRule && canRetryRefund({ state: execution.state, firstAttemptAt: execution.firstAttemptAt, attempts: execution.attemptCount, maxAttempts: execution.merchantRule.maxAttempts }, now))) throw conflict();
      if (execution.nextAttemptAt && execution.nextAttemptAt > now) throw appError("RATE_LIMITED");
      const target = targetFor(allocation);
      const attempt = await tx.refundExecutionAttempt.create({ data: { executionId: execution.id, ownerId: access.profile.id, submissionKey: input.submissionKey, requestHash: hash, eligibilityEvidence: input.eligibilityEvidence } });
      await tx.refundExecution.update({ where: { id: execution.id }, data: { state: "CHECKING" } });
      return { id: execution.id, orderId: order.id, target, attemptId: attempt.id };
    });
  }
  async reserveSubmission(access: AdminAccess, intent: SubmissionIntent, result: RefundQueryResult, merchantBinding: string | undefined): Promise<RefundCommand | null> {
    return withRefundOrder(this.prisma, owner(access), intent.orderId, async (tx, order, now) => {
      const row = await readCase(tx, order.id), allocation = row.allocations.find(value => value.execution?.id === intent.id), execution = allocation?.execution;
      const attempt = await tx.refundExecutionAttempt.findUnique({ where: { id: intent.attemptId } });
      if (!allocation || !execution || !attempt || attempt.executionId !== execution.id || attempt.ownerId !== access.profile.id || attempt.state !== "CHECKING" || execution.state !== "CHECKING" || execution.completion) return null;
      if (result.kind !== "found" || result.proof.kind !== "SETTLED") {
        await this.observeLocked(tx, order, row, allocation, intent.attemptId, result, now);
        await tx.refundExecutionAttempt.update({ where: { id: attempt.id }, data: { state: "PREFLIGHT_HELD", finishedAt: now } });
        return null;
      }
      const proof = result.proof, target = targetFor(allocation);
      if (proof.providerOrderId !== target.providerOrderId || proof.providerTransactionId !== target.providerTransactionId || proof.amountRp !== target.amountRp) throw conflict();
      assertFacts(order, row);
      const rules = merchantBinding ? await tx.refundMerchantRule.findMany({ where: { merchantBinding, paymentType: proof.paymentType, providerChannel: proof.providerChannel,
        validFrom: { lte: now }, validUntil: { gt: now }, ...(execution.merchantRuleId ? { id: execution.merchantRuleId } : {}) }, take: 2 }) : [];
      const rule = rules.length === 1 ? rules[0] : undefined;
      const payment = order.paymentAttempts.find(value => value.id === allocation.paymentAttemptId);
      const eligible = rule && payment?.settledAt && now.getTime() < payment.settledAt.getTime() + rule.maxAgeSeconds * 1000 &&
        (rule.route === "refund" || rule.route === "refund/online/direct") && rule.maxAttempts > execution.attemptCount &&
        (!execution.firstAttemptAt || canRetryRefund({ state: "RETRYABLE", firstAttemptAt: execution.firstAttemptAt, attempts: execution.attemptCount, maxAttempts: rule.maxAttempts }, now));
      if (!eligible || !rule) {
        await tx.refundExecutionAttempt.update({ where: { id: attempt.id }, data: { state: "MERCHANT_HELD", finishedAt: now } });
        await tx.refundExecution.update({ where: { id: execution.id }, data: { state: execution.firstAttemptAt ? "UNKNOWN" : "READY", lastCheckedAt: now } });
        await audit(tx, row, "refund.execution-held", { executionId: execution.id, reason: "MERCHANT_NOT_VERIFIED" }, access);
        return null;
      }
      await tx.refundObservation.create({ data: { executionId: execution.id, runId: attempt.id, outcome: "SETTLED", proofHash: refundHash(proof), checkedAt: now } });
      await tx.refundExecutionAttempt.update({ where: { id: attempt.id }, data: { state: "SUBMITTING", attemptNumber: execution.attemptCount + 1, startedAt: now } });
      await tx.refundExecution.update({ where: { id: execution.id }, data: { state: "SUBMITTING", merchantRuleId: rule.id, firstAttemptAt: execution.firstAttemptAt ?? now, attemptCount: { increment: 1 }, lastCheckedAt: now } });
      return { ...target, refundKey: execution.refundKey, reason: execution.publicReason, route: rule.route === "refund" ? "refund" : "refund/online/direct" };
    });
  }
  async finishSubmission(intent: SubmissionIntent, result: RefundSubmissionResult): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const { order, now } = await lockRefundOrder(tx, intent.orderId), row = await readCase(tx, order.id);
      const allocation = row.allocations.find(value => value.execution?.id === intent.id), execution = allocation?.execution;
      const attempt = await tx.refundExecutionAttempt.findUnique({ where: { id: intent.attemptId } });
      if (!execution || !attempt || attempt.executionId !== execution.id || attempt.state !== "SUBMITTING") return;
      const retryAllowed = execution.merchantRule && canRetryRefund({ state: "RETRYABLE", firstAttemptAt: execution.firstAttemptAt, attempts: execution.attemptCount, maxAttempts: execution.merchantRule.maxAttempts }, now);
      const state = result.kind === "accepted" ? "ACCEPTED" : result.kind === "rejected" ? "REJECTED" : result.kind === "retryable" && retryAllowed ? "RETRYABLE" : "UNKNOWN";
      await tx.refundExecutionAttempt.update({ where: { id: attempt.id }, data: { state: result.kind === "rejected" ? result.category : state, finishedAt: now } });
      if (!execution.completion && ["SUBMITTING", "UNKNOWN"].includes(execution.state)) await tx.refundExecution.update({ where: { id: execution.id }, data: { state, nextAttemptAt: result.kind === "retryable" ? new Date(now.getTime() + result.retryAfterMs) : null } });
      if (result.kind === "accepted" && (execution.state === "MANUAL_AUTHORIZED" || execution.completion?.source === "MANUAL")) {
        await tx.refundExecution.update({ where: { id: execution.id }, data: { state: "EXCEPTION" } });
        await tx.refundCase.update({ where: { id: row.id }, data: { status: "RECONCILING", completedAt: null, version: { increment: 1 } } });
        await audit(tx, row, "refund.reconciliation-held", { executionId: execution.id, reason: "LATE_ACCEPTANCE_AFTER_MANUAL_AUTHORIZATION" });
      }
      await audit(tx, row, "refund.submission-observed", { executionId: execution.id, state });
      if (["UNKNOWN", "REJECTED"].includes(state)) await audit(tx, row, "refund.reconciliation-held", { executionId: execution.id, reason: state });
    });
  }
  async candidates(tx: Prisma.TransactionClient, limit: number): Promise<RefundQueryTarget[]> {
    const rows = await tx.refundExecution.findMany({ where: { state: { in: ["CHECKING", "SUBMITTING", "ACCEPTED", "UNKNOWN", "RETRYABLE", "EXCEPTION"] } }, orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }, { id: "asc" }], take: limit, include: { allocation: { include: { refundCase: { select: { orderId: true } } } } } });
    return rows.flatMap(row => { const parsed = refundTargetSchema.safeParse({ providerOrderId: row.allocation.providerOrderId, providerTransactionId: row.allocation.providerTransactionId, amountRp: row.allocation.amountRp.toFixed(0) }); return parsed.success ? [{ id: row.id, orderId: row.allocation.refundCase.orderId, target: parsed.data }] : []; });
  }
  async targetsForOwner(access: AdminAccess, orderId: string): Promise<RefundQueryTarget[]> {
    return withRefundOrder(this.prisma, owner(access), orderId, async (tx, order) => {
      const row = await readCase(tx, order.id);
      return row.allocations.filter(item => item.execution).slice(0, 10).flatMap(item => {
        const parsed = refundTargetSchema.safeParse({ providerOrderId: item.providerOrderId, providerTransactionId: item.providerTransactionId, amountRp: item.amountRp.toFixed(0) });
        return parsed.success && item.execution ? [{ id: item.execution.id, orderId, target: parsed.data }] : [];
      });
    });
  }
  async observe(target: RefundQueryTarget, runId: string, result: RefundQueryResult): Promise<string> {
    return this.prisma.$transaction(async tx => {
      return this.observeIn(tx, target, runId, result, await databaseNow(tx));
    }, { timeout: 15000 });
  }
  async observeIn(tx: Prisma.TransactionClient, target: RefundQueryTarget, runId: string, result: RefundQueryResult, now: Date): Promise<string> {
    const { order } = await lockRefundOrder(tx, target.orderId), row = await readCase(tx, target.orderId), allocation = row.allocations.find(value => value.execution?.id === target.id);
    if (!allocation) throw appError("NOT_FOUND");
    return this.observeLocked(tx, order, row, allocation, runId, result, now);
  }
  private async observeLocked(tx: Prisma.TransactionClient, order: RefundOrderRow, row: CaseRow, allocation: Allocation, runId: string, result: RefundQueryResult, now: Date): Promise<string> {
    const execution = allocation.execution;
    if (!execution) throw conflict();
    const prior = await tx.refundObservation.findUnique({ where: { executionId_runId: { executionId: execution.id, runId } } });
    if (prior) return prior.outcome;
    let outcome = result.kind === "found" ? result.proof.kind : "UNAVAILABLE";
    const proof = result.kind === "found" ? result.proof : null;
    if (proof) {
      const target = targetFor(allocation);
      if (proof.providerOrderId !== target.providerOrderId || proof.providerTransactionId !== target.providerTransactionId || proof.amountRp !== target.amountRp) throw conflict();
    }
    if (proof?.kind === "CONFIRMED") {
      const receipt = proof.refunds.length === 1 ? proof.refunds[0] : undefined;
      if (receipt?.refundKey === execution.refundKey && receipt.amountRp === allocation.amountRp.toFixed(0) && receipt.confirmedAt && execution.firstAttemptAt && receipt.confirmedAt.getTime() + 999 >= execution.firstAttemptAt.getTime() && execution.completion?.source !== "MANUAL") {
        if (!execution.completion) {
          const duplicate = await tx.refundCompletion.findUnique({ where: { providerReference: receipt.reference } });
          if (duplicate) outcome = "REFERENCE_CONFLICT";
          else {
            await tx.refundCompletion.create({ data: { executionId: execution.id, source: "PROVIDER", amountRp: allocation.amountRp, providerReference: receipt.reference, confirmedAt: receipt.confirmedAt } });
            const payment = order.paymentAttempts.find(value => value.id === allocation.paymentAttemptId);
            if (payment?.status === "SETTLED") await tx.paymentAttempt.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
            await paymentEvent(tx, allocation, allocation.source === "LATE_SETTLEMENT" ? "REFUNDED_AFTER_LATE_SETTLEMENT" : "REFUND_CONFIRMED", execution.id, now);
            await audit(tx, row, "refund.provider-confirmed", { executionId: execution.id, amountRp: allocation.amountRp.toFixed(0) });
          }
        } else if (execution.completion.providerReference !== receipt.reference) outcome = "REFERENCE_CONFLICT";
        if (outcome === "CONFIRMED") {
          await tx.refundExecution.update({ where: { id: execution.id }, data: { state: "CONFIRMED" } });
          await completeCase(tx, order, now);
        }
      } else outcome = "EXTERNAL_REFUND_REQUIRES_REVIEW";
    }
    const previous = await tx.refundObservation.findFirst({ where: { executionId: execution.id }, orderBy: { checkedAt: "desc" }, select: { outcome: true } });
    await tx.refundObservation.create({ data: { executionId: execution.id, runId, outcome, proofHash: proof ? refundHash(proof) : null, checkedAt: now } });
    const attention = ["PARTIAL", "INELIGIBLE", "REFERENCE_CONFLICT", "EXTERNAL_REFUND_REQUIRES_REVIEW"].includes(outcome);
    if (attention) {
      await tx.refundExecution.update({ where: { id: execution.id }, data: { state: "EXCEPTION", lastCheckedAt: now } });
      await tx.refundCase.update({ where: { id: row.id }, data: { status: "RECONCILING", completedAt: null } });
      if (previous?.outcome !== outcome) await audit(tx, row, "refund.reconciliation-held", { executionId: execution.id, reason: outcome });
    } else {
      const state = execution.completion || outcome === "CONFIRMED" ? undefined : execution.state === "CHECKING" ? execution.firstAttemptAt ? "UNKNOWN" : "READY" : execution.state === "SUBMITTING" ? "UNKNOWN" : undefined;
      await tx.refundExecution.update({ where: { id: execution.id }, data: { lastCheckedAt: now, ...(state ? { state } : {}) } });
    }
    return outcome;
  }
  async authorizeManual(access: AdminAccess, input: RefundManualAuthorizeInput): Promise<string> {
    return withRefundOrder(this.prisma, owner(access), input.orderId, async (tx, order, now) => {
      const row = await readCase(tx, order.id), hash = refundHash({ input, ownerId: access.profile.id });
      const prior = await tx.refundManualAuthorization.findUnique({ where: { submissionKey: input.submissionKey } });
      if (prior) { if (prior.caseId !== row.id || prior.requestHash !== hash) throw conflict(); return prior.id; }
      assertRefundVersion(row, input.expectedVersion, ["APPROVED", "RECONCILING"]);
      if (!input.providerConfirmedNoPending) throw conflict();
      const approval = assertFacts(order, row);
      if (row.status === "APPROVED") {
        for (const allocation of row.allocations) {
          await tx.refundExecution.create({ data: { allocationId: allocation.id, approvalId: approval.id, refundKey: refundKeyForAllocation(allocation.id), publicReason: "Pengembalian penuh sesuai persetujuan kasus." } });
          await paymentEvent(tx, allocation, "REFUND_OPERATION_STARTED", allocation.id, now);
        }
      }
      const current = await readCase(tx, order.id), remaining = current.allocations.filter(value => !value.execution?.completion);
      if (!remaining.length || remaining.some(value => !value.execution || ["CHECKING", "SUBMITTING", "MANUAL_AUTHORIZED"].includes(value.execution.state))) throw conflict();
      if (await tx.refundObservation.count({ where: { executionId: { in: remaining.map(item => item.execution!.id) },
        outcome: { in: ["PARTIAL", "REFERENCE_CONFLICT", "EXTERNAL_REFUND_REQUIRES_REVIEW"] } } })) throw conflict();
      if (await tx.refundExecutionAttempt.count({ where: { executionId: { in: remaining.map(item => item.execution!.id) }, startedAt: { gt: new Date(now.getTime() - 8000) }, finishedAt: null } })) throw conflict();
      const amountRp = remaining.reduce((sum, item) => sum.plus(item.amountRp), new MoneyDecimal(0)).toFixed(0);
      const authorization = await tx.refundManualAuthorization.create({ data: { caseId: row.id, ownerId: access.profile.id, submissionKey: input.submissionKey,
        requestHash: hash, caseVersion: row.version + 1, amountRp, executionIdsJson: remaining.map(item => item.execution!.id), reason: input.reason,
        providerResolutionReference: input.providerResolutionReference, recipientVerificationReference: input.recipientVerificationReference, authorizedAt: now } });
      await tx.refundExecution.updateMany({ where: { id: { in: remaining.map(item => item.execution!.id) } }, data: { state: "MANUAL_AUTHORIZED" } });
      await tx.refundCase.update({ where: { id: row.id }, data: { status: "RECONCILING", version: { increment: 1 } } });
      await audit(tx, row, "refund.manual-authorized", { authorizationId: authorization.id, amountRp }, access);
      return authorization.id;
    });
  }
  async confirmManual(access: AdminAccess, input: RefundManualConfirmInput): Promise<void> {
    await withRefundOrder(this.prisma, owner(access), input.orderId, async (tx, order, now) => {
      const row = await readCase(tx, order.id), hash = refundHash({ input, ownerId: access.profile.id });
      const prior = await tx.refundManualPayout.findUnique({ where: { submissionKey: input.submissionKey } });
      if (prior) { if (prior.authorizationId !== input.authorizationId || prior.requestHash !== hash) throw conflict(); return; }
      assertRefundVersion(row, input.expectedVersion, ["RECONCILING"]);
      assertFacts(order, row);
      const authorization = await tx.refundManualAuthorization.findUnique({ where: { id: input.authorizationId }, include: { payout: true } });
      if (!authorization || authorization.caseId !== row.id || authorization.caseVersion !== row.version || authorization.payout) throw conflict();
      const ids = authorization.executionIdsJson;
      if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === "string")) throw conflict();
      const allocations = row.allocations.filter(item => item.execution && ids.includes(item.execution.id));
      if (allocations.length !== ids.length || allocations.some(item => item.execution?.state !== "MANUAL_AUTHORIZED" || item.execution.completion)) throw conflict();
      const paidAt = new Date(input.paidAt);
      if (paidAt > now || paidAt.getTime() + 999 < authorization.authorizedAt.getTime()) throw appError("VALIDATION_ERROR", { message: "Waktu transfer harus setelah persetujuan manual dan tidak di masa depan." });
      const sum = allocations.reduce((total, item) => total.plus(item.amountRp), new MoneyDecimal(0));
      if (!sum.eq(authorization.amountRp)) throw conflict();
      const payout = await tx.refundManualPayout.create({ data: { authorizationId: authorization.id, ownerId: access.profile.id, submissionKey: input.submissionKey,
        requestHash: hash, transferReference: input.transferReference, evidenceReference: input.evidenceReference, paidAt, recordedAt: now } });
      for (const allocation of allocations) {
        await tx.refundCompletion.create({ data: { executionId: allocation.execution!.id, source: "MANUAL", amountRp: allocation.amountRp, manualPayoutId: payout.id, confirmedAt: paidAt } });
        await tx.refundExecution.update({ where: { id: allocation.execution!.id }, data: { state: "CONFIRMED" } });
        const payment = order.paymentAttempts.find(item => item.id === allocation.paymentAttemptId);
        if (payment?.status === "SETTLED") await tx.paymentAttempt.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
        await paymentEvent(tx, allocation, allocation.source === "LATE_SETTLEMENT" ? "REFUNDED_AFTER_LATE_SETTLEMENT" : "REFUND_CONFIRMED", allocation.execution!.id, now);
      }
      await audit(tx, row, "refund.manual-confirmed", { authorizationId: authorization.id, amountRp: sum.toFixed(0) }, access);
      await completeCase(tx, order, now);
    });
  }
  async revokeManual(access: AdminAccess, input: RefundManualRevokeInput): Promise<void> {
    await withRefundOrder(this.prisma, owner(access), input.orderId, async (tx, order) => {
      const row = await readCase(tx, order.id), hash = refundHash({ input, ownerId: access.profile.id });
      const prior = await tx.refundCaseRevision.findUnique({ where: { submissionKey: input.submissionKey } });
      if (prior) { if (prior.caseId !== row.id || prior.requestHash !== hash) throw conflict(); return; }
      assertRefundVersion(row, input.expectedVersion, ["RECONCILING"]);
      const authorization = await tx.refundManualAuthorization.findUnique({ where: { id: input.authorizationId }, include: { payout: true } });
      if (!authorization || authorization.caseId !== row.id || authorization.caseVersion !== row.version || authorization.payout) throw conflict();
      await tx.refundCaseRevision.create({ data: { caseId: row.id, caseVersion: row.version + 1, ownerId: access.profile.id, submissionKey: input.submissionKey, requestHash: hash,
        reason: input.reason, snapshotJson: { revokedManualAuthorizationId: authorization.id, amountRp: authorization.amountRp.toFixed(0), originalVersion: authorization.caseVersion } } });
      for (const allocation of row.allocations) if (allocation.execution?.state === "MANUAL_AUTHORIZED" && !allocation.execution.completion) {
        await tx.refundExecution.update({ where: { id: allocation.execution.id }, data: { state: allocation.execution.firstAttemptAt ? "UNKNOWN" : "READY" } });
      }
      await tx.refundCase.update({ where: { id: row.id }, data: { version: { increment: 1 } } });
      await audit(tx, row, "refund.manual-authorization-revoked", { authorizationId: authorization.id }, access);
    });
  }
}
export async function refundReconciliationBacklog(tx: Prisma.TransactionClient, now: Date) {
  const [row] = await tx.$queryRaw<{ count: string; oldest: string | null }[]>`SELECT count(*)::text AS count,
    min(floor(extract(epoch FROM coalesce(last_checked_at, created_at)) * 1000))::text AS oldest
    FROM refund_executions WHERE state IN ('CHECKING', 'SUBMITTING', 'ACCEPTED', 'UNKNOWN', 'RETRYABLE', 'EXCEPTION')`;
  return { remainingDue: Number(row?.count ?? 0), lagMs: row?.oldest ? Math.max(0, now.getTime() - Number(row.oldest)) : 0 };
}
