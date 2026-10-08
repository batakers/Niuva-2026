import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { actualDateSchema, idempotencySchema, positiveMoneySchema, reasonSchema } from "./schema";
import { billingCaseView, financeAudit, withFinanceTransaction } from "./repository";
import { MoneyDecimal } from "./money";
import type { FinancePaymentView } from "./types";
const details = { amountRp: positiveMoneySchema, receivedDate: actualDateSchema, reference: z.string().trim().min(1).max(100).transform(value => value.toUpperCase().replace(/\s+/g, " ")), note: z.string().trim().max(1000).optional(), confirmed: z.literal(true) };
const recordSchema = z.object({ billingCaseId: z.uuid(), expectedVersion: z.number().int().positive(), idempotencyKey: idempotencySchema, ...details }).strict();
const reverseSchema = z.object({ paymentId: z.uuid(), expectedVersion: z.number().int().positive(), reason: reasonSchema, idempotencyKey: idempotencySchema }).strict();
const correctSchema = reverseSchema.extend(details).strict();
export async function manualPaymentViewTx(tx: Prisma.TransactionClient, id: string): Promise<FinancePaymentView | null> {
  const row = await tx.manualB2BPaymentEntry.findUnique({ where: { id }, include: { billingCase: { select: { inquiryId: true, version: true, accountClosedAt: true, invoices: { where: { state: "ISSUED" }, take: 1, orderBy: { revision: "desc" }, select: { id: true } } } }, reversedBy: { select: { id: true, reason: true } }, correction: { select: { id: true } } } });
  return row ? { id, source: "MANUAL", reference: row.reference, amountRp: row.amountRp.toFixed(0), actualDate: row.receivedAt.toISOString().slice(0, 10), state: row.reversalOfId ? "REVERSAL" : row.reversedBy ? "REVERSED" : "CONFIRMED", sourceHref: row.billingCase.accountClosedAt ? "/admin/finance/payments" : `/admin/inquiries/${row.billingCase.inquiryId}/billing`, billingCaseId: row.billingCaseId, invoiceId: row.billingCase.invoices[0]?.id ?? null, reversed: row.reversedBy !== null, reversalOfId: row.reversalOfId, correctionId: row.correction?.id ?? null, reason: row.reason ?? row.reversedBy?.reason ?? null, caseVersion: row.billingCase.version } : null;
}
async function loadWritableCase(tx: Prisma.TransactionClient, id: string, expectedVersion: number) {
  const row = await tx.billingCase.findUnique({ where: { id } });
  if (!row || row.kind !== "B2B" || row.accountClosedAt) throw appError("NOT_FOUND");
  if (row.version !== expectedVersion) throw appError("CONFLICT", { message: "Tagihan sudah diperbarui. Muat ulang sebelum mencatat pembayaran." });
  const view = await billingCaseView(tx, row);
  if (view.paymentState === "REVIEW") throw appError("CONFLICT", { message: "Sumber atau pola pembayaran perlu diperiksa Owner terlebih dahulu." });
  return { row, view };
}
async function assertReference(tx: Prisma.TransactionClient, caseId: string, reference: string, excluding?: string) {
  if (await tx.manualB2BPaymentEntry.findFirst({ where: { billingCaseId: caseId, reference, reversalOfId: null, reversedBy: { is: null }, ...(excluding ? { id: { not: excluding } } : {}) }, select: { id: true } })) throw appError("CONFLICT", { message: "Referensi transfer ini sudah dicatat pada proyek yang sama. Periksa sebelum melanjutkan." });
}
async function reverseEntry(tx: Prisma.TransactionClient, access: AdminAccess, originalId: string, reason: string, key: string) {
  const row = await tx.manualB2BPaymentEntry.findUnique({ where: { id: originalId }, include: { reversedBy: { select: { id: true } } } });
  if (!row) throw appError("NOT_FOUND");
  if (row.reversalOfId || row.reversedBy) throw appError("CONFLICT", { message: "Catatan ini sudah dikoreksi atau dibatalkan." });
  return tx.manualB2BPaymentEntry.create({ data: { billingCaseId: row.billingCaseId, amountRp: row.amountRp, receivedAt: row.receivedAt, reference: `REVERSAL:${row.id}`, reversalOfId: row.id, reason, idempotencyKey: key, createdByAdminId: access.profile.id } });
}
export class ManualPaymentService {
  async record(access: AdminAccess, input: unknown): Promise<FinancePaymentView> {
    const parsed = parseWithValidation(recordSchema, input);
    return withFinanceTransaction(access, "FINANCE_WRITE", async tx => {
      const replay = await tx.manualB2BPaymentEntry.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
      if (replay) { if (!(await tx.billingCase.findFirst({ where: { id: replay.billingCaseId, accountClosedAt: null }, select: { id: true } }))) throw appError("NOT_FOUND"); if (replay.billingCaseId !== parsed.billingCaseId || replay.amountRp.toFixed(0) !== parsed.amountRp || replay.reference !== parsed.reference || replay.receivedAt.toISOString().slice(0, 10) !== parsed.receivedDate || replay.reversalOfId) throw appError("CONFLICT"); return (await manualPaymentViewTx(tx, replay.id))!; }
      const { view } = await loadWritableCase(tx, parsed.billingCaseId, parsed.expectedVersion);
      if (new MoneyDecimal(parsed.amountRp).gt(view.remainingRp)) throw appError("CONFLICT", { message: "Nominal melebihi sisa tagihan. Periksa dana masuk dan kesepakatan proyek." });
      await assertReference(tx, parsed.billingCaseId, parsed.reference);
      const row = await tx.manualB2BPaymentEntry.create({ data: { billingCaseId: parsed.billingCaseId, amountRp: parsed.amountRp, receivedAt: new Date(`${parsed.receivedDate}T00:00:00Z`), reference: parsed.reference, note: parsed.note, idempotencyKey: parsed.idempotencyKey, createdByAdminId: access.profile.id } });
      await tx.billingCase.update({ where: { id: parsed.billingCaseId }, data: { version: { increment: 1 } } });
      await financeAudit(tx, access, "ManualB2BPaymentEntry", row.id, "finance.payment.recorded", { amountRp: parsed.amountRp });
      return (await manualPaymentViewTx(tx, row.id))!;
    });
  }
  async reverse(access: AdminAccess, input: unknown): Promise<FinancePaymentView> {
    const parsed = parseWithValidation(reverseSchema, input);
    return withFinanceTransaction(access, "FINANCE_CORRECT", async tx => {
      const replay = await tx.manualB2BPaymentEntry.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
      if (replay) { if (!(await tx.billingCase.findFirst({ where: { id: replay.billingCaseId, accountClosedAt: null }, select: { id: true } }))) throw appError("NOT_FOUND"); if (replay.reversalOfId !== parsed.paymentId || replay.reason !== parsed.reason) throw appError("CONFLICT"); return (await manualPaymentViewTx(tx, replay.id))!; }
      const original = await tx.manualB2BPaymentEntry.findUnique({ where: { id: parsed.paymentId }, select: { billingCaseId: true } });
      if (!original) throw appError("NOT_FOUND");
      await loadWritableCase(tx, original.billingCaseId, parsed.expectedVersion);
      const reversal = await reverseEntry(tx, access, parsed.paymentId, parsed.reason, parsed.idempotencyKey);
      await tx.billingCase.update({ where: { id: original.billingCaseId }, data: { version: { increment: 1 } } });
      await financeAudit(tx, access, "ManualB2BPaymentEntry", reversal.id, "finance.payment.reversed", { reason: parsed.reason, originalPaymentId: parsed.paymentId });
      return (await manualPaymentViewTx(tx, reversal.id))!;
    });
  }
  async correct(access: AdminAccess, input: unknown): Promise<FinancePaymentView> {
    const parsed = parseWithValidation(correctSchema, input);
    return withFinanceTransaction(access, "FINANCE_CORRECT", async tx => {
      const replay = await tx.manualB2BPaymentEntry.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
      if (replay) { if (!(await tx.billingCase.findFirst({ where: { id: replay.billingCaseId, accountClosedAt: null }, select: { id: true } }))) throw appError("NOT_FOUND"); if (replay.correctedFromId !== parsed.paymentId || replay.amountRp.toFixed(0) !== parsed.amountRp || replay.reference !== parsed.reference || replay.receivedAt.toISOString().slice(0, 10) !== parsed.receivedDate || replay.reason !== parsed.reason) throw appError("CONFLICT"); return (await manualPaymentViewTx(tx, replay.id))!; }
      const original = await tx.manualB2BPaymentEntry.findUnique({ where: { id: parsed.paymentId } });
      if (!original) throw appError("NOT_FOUND");
      const { view } = await loadWritableCase(tx, original.billingCaseId, parsed.expectedVersion);
      if (new MoneyDecimal(parsed.amountRp).gt(new MoneyDecimal(view.remainingRp).plus(original.amountRp.toString()))) throw appError("CONFLICT", { message: "Nominal koreksi melebihi nilai proyek yang masih dapat dicatat." });
      await assertReference(tx, original.billingCaseId, parsed.reference, original.id);
      await reverseEntry(tx, access, original.id, parsed.reason, randomUUID());
      const replacement = await tx.manualB2BPaymentEntry.create({ data: { billingCaseId: original.billingCaseId, amountRp: parsed.amountRp, receivedAt: new Date(`${parsed.receivedDate}T00:00:00Z`), reference: parsed.reference, note: parsed.note, reason: parsed.reason, correctedFromId: original.id, idempotencyKey: parsed.idempotencyKey, createdByAdminId: access.profile.id } });
      await tx.billingCase.update({ where: { id: original.billingCaseId }, data: { version: { increment: 1 } } });
      await financeAudit(tx, access, "ManualB2BPaymentEntry", replacement.id, "finance.payment.corrected", { reason: parsed.reason, originalPaymentId: original.id });
      return (await manualPaymentViewTx(tx, replacement.id))!;
    });
  }
}
