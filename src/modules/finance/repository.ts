import "server-only";
import { Prisma, type BillingCase } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission, type AdminPermission } from "@/modules/admin/permissions";
import { lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
import { lockPaymentOrder } from "@/modules/payment/operational-repository";
import { appError, isAppError } from "@/modules/shared/errors";
import { MoneyDecimal, remainingMoney, sumMoney } from "./money";
import { readBillingSource, sourceKey } from "./source";
import type { BillingCaseView, BillingSource } from "./types";
export async function withFinanceTransaction<T>(access: AdminAccess, permission: AdminPermission, run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  requireAdminPermission(access, permission);
  return getPrismaClient().$transaction(async tx => {
    await lockCustomerLifecycle(tx);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-finance-writes'))`;
    await tx.$queryRaw(Prisma.sql`SELECT id FROM admin_profiles WHERE id = ${access.profile.id}::uuid FOR UPDATE`);
    const actor = await tx.adminProfile.findFirst({ where: { id: access.profile.id, isActive: true, role: access.profile.role }, select: { id: true, authUserId: true } });
    if (!actor || (actor.authUserId !== null && actor.authUserId !== access.authUserId)) throw appError("FORBIDDEN");
    return run(tx);
  }, { timeout: 15_000 });
}
export async function lockBillingSource(tx: Prisma.TransactionClient, source: BillingSource) {
  if (source.kind === "B2B") await tx.$queryRaw(Prisma.sql`SELECT id FROM b2b_inquiries WHERE id = ${source.inquiryId}::uuid FOR UPDATE`);
  else await lockPaymentOrder(tx, source.orderId);
}
export function caseSource(row: Pick<BillingCase, "kind" | "orderId" | "inquiryId">): BillingSource {
  if (row.kind === "B2B" && row.inquiryId) return { kind: "B2B", inquiryId: row.inquiryId };
  if (row.kind !== "B2B" && row.orderId) return { kind: row.kind, orderId: row.orderId };
  throw appError("INTERNAL_ERROR");
}
export async function ensureBillingCase(tx: Prisma.TransactionClient, source: BillingSource): Promise<BillingCase> {
  await lockBillingSource(tx, source);
  const snapshot = await readBillingSource(tx, source);
  const existing = await tx.billingCase.findUnique({ where: { sourceKey: sourceKey(source) } });
  if (existing) { if (existing.accountClosedAt) throw appError("NOT_FOUND"); return existing; }
  if (source.kind === "B2B") throw appError("QUOTE_NOT_READY", { message: "Owner perlu menentukan pola pembayaran B2B terlebih dahulu." });
  return tx.billingCase.create({ data: { sourceKey: snapshot.sourceKey, kind: source.kind, orderId: source.orderId, customerId: snapshot.customerId, sourceVersion: snapshot.sourceVersion, totalRp: snapshot.totalRp } });
}
export async function billingCaseView(tx: Prisma.TransactionClient, row: BillingCase): Promise<BillingCaseView> {
  const source = caseSource(row);
  const manual = row.kind === "B2B" ? await tx.manualB2BPaymentEntry.findMany({ where: { billingCaseId: row.id, reversalOfId: null, reversedBy: { is: null } }, select: { amountRp: true } }) : [];
  const provider = row.orderId ? await tx.paymentAttempt.findMany({ where: { orderId: row.orderId, purpose: row.kind === "CUSTOM_SHIPPING" ? "CUSTOM_SHIPPING" : "ORDER_TOTAL", status: { in: ["SETTLED", "REFUNDED"] }, settledAt: { not: null } }, select: { amountRp: true } }) : [];
  const paidRp = sumMoney([...manual, ...provider].map(payment => payment.amountRp.toFixed(0)));
  const totalRp = row.totalRp.toFixed(0);
  const currentInvoice = await tx.invoice.findFirst({ where: { billingCaseId: row.id, state: { in: ["DRAFT", "ISSUED"] } }, orderBy: { revision: "desc" }, select: { id: true } });
  let review = new MoneyDecimal(paidRp).gt(totalRp);
  if (!row.accountClosedAt) {
    try { const snapshot = await readBillingSource(tx, source); review ||= snapshot.needsReview || snapshot.totalRp !== totalRp || snapshot.sourceVersion !== row.sourceVersion; }
    catch (error) { if (isAppError(error) && ["QUOTE_NOT_READY", "NOT_FOUND"].includes(error.code)) review = true; else throw error; }
  }
  return { id: row.id, source, version: row.version, totalRp, paidRp, remainingRp: remainingMoney(totalRp, paidRp), paymentState: review ? "REVIEW" : totalRp === "0" ? "NO_PAYMENT_REQUIRED" : paidRp === "0" ? "UNPAID" : new MoneyDecimal(paidRp).eq(totalRp) ? "PAID" : "PARTIAL", mode: row.mode, depositRp: row.depositRp?.toFixed(0) ?? null, currentInvoiceId: currentInvoice?.id ?? null, closed: row.accountClosedAt !== null };
}
export async function financeAudit(tx: Prisma.TransactionClient, access: AdminAccess, entityType: string, entityId: string, action: string, metadata: Prisma.InputJsonObject = {}) { await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: access.profile.id, entityType, entityId, action, metadataJson: metadata } }); }
