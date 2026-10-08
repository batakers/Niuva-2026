import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { actualDateSchema, idempotencySchema, positiveMoneySchema, reasonSchema } from "./schema";
import { financeAudit, withFinanceTransaction } from "./repository";
import type { ExpenseView } from "./types";
import { parseFinanceListQuery } from "./read-query";
export { EXPENSE_CATEGORIES } from "./expense-categories";
const recordSchema = z.object({ amountRp: positiveMoneySchema, expenseDate: actualDateSchema, category: z.enum(["MATERIALS", "SHIPPING", "OPERATIONS", "OTHER"]), description: z.string().trim().min(5).max(1000), proofFileId: z.uuid().optional(), idempotencyKey: idempotencySchema }).strict();
const voidSchema = z.object({ expenseId: z.uuid(), expectedVersion: z.number().int().positive(), reason: reasonSchema, idempotencyKey: idempotencySchema }).strict();
const correctSchema = recordSchema.extend({ expenseId: z.uuid(), expectedVersion: z.number().int().positive(), reason: reasonSchema }).strict();
export async function expenseViewTx(tx: Prisma.TransactionClient, id: string): Promise<ExpenseView | null> {
  const row = await tx.expenseEntry.findUnique({ where: { id }, include: { reversedBy: { select: { id: true, reason: true } }, correction: { select: { id: true } }, proofFile: { select: { id: true, uploadStatus: true, deletedAt: true } } } });
  return row ? { id, version: row.reversedBy ? 2 : 1, date: row.expenseDate.toISOString().slice(0, 10), category: row.category, amountRp: row.amountRp.toFixed(0), description: row.description, state: row.reversalOfId ? "REVERSAL" : row.reversedBy ? "REVERSED" : "VALID", proofFileId: row.proofFileId, proofHref: row.proofFile?.uploadStatus === "VERIFIED" && row.proofFile.deletedAt === null ? `/api/admin/finance/evidence?expenseId=${id}&fileId=${row.proofFile.id}` : null, reason: row.reason ?? row.reversedBy?.reason ?? null, reversalOfId: row.reversalOfId, correctionId: row.correction?.id ?? null, correctedFromId: row.correctedFromId } : null;
}
async function assertUnboundProof(tx: Prisma.TransactionClient, access: AdminAccess, fileId: string) {
  const file = await tx.storedFile.findFirst({ where: { id: fileId, purpose: "FINANCIAL_EVIDENCE", bucketScope: "PRIVATE_CUSTOMER", uploadedByAdminId: access.profile.id, uploadStatus: "VERIFIED", deletedAt: null, expenseProofs: { none: {} } }, select: { id: true } });
  if (!file) throw appError("FORBIDDEN", { message: "Bukti tidak tersedia atau sudah terikat pada pengeluaran lain." });
}
async function reverseExpense(tx: Prisma.TransactionClient, access: AdminAccess, expenseId: string, reason: string, key: string, version: number) {
  const row = await tx.expenseEntry.findUnique({ where: { id: expenseId }, include: { reversedBy: { select: { id: true } } } });
  if (!row) throw appError("NOT_FOUND");
  if (row.reversalOfId || row.reversedBy || version !== 1) throw appError("CONFLICT", { message: "Catatan pengeluaran sudah diperbarui atau dibatalkan." });
  await tx.expenseEntry.create({ data: { amountRp: row.amountRp, expenseDate: row.expenseDate, category: row.category, description: row.description, reversalOfId: row.id, reason, idempotencyKey: key, createdByAdminId: access.profile.id } });
  return row;
}
export class ExpenseService {
  async list(access: AdminAccess, input: unknown) {
    const query = parseFinanceListQuery(input);
    return withFinanceTransaction(access, "FINANCE_READ", async tx => {
      const where: Prisma.ExpenseEntryWhereInput = { reversalOfId: null, ...(query.q ? { description: { contains: query.q, mode: "insensitive" } } : {}), ...(query.category ? { category: query.category } : {}), ...(query.status === "VALID" ? { reversedBy: { is: null } } : query.status === "REVERSED" ? { reversedBy: { isNot: null } } : {}), ...((query.dateFrom || query.dateTo) ? { expenseDate: { ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00Z`) } : {}), ...(query.dateTo ? { lte: new Date(`${query.dateTo}T00:00:00Z`) } : {}) } } : {}) };
      const records = await tx.expenseEntry.findMany({ where, orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * 20, take: 21, select: { id: true } });
      const items: ExpenseView[] = []; for (const record of records.slice(0, 20)) { const view = await expenseViewTx(tx, record.id); if (view) items.push(view); }
      return { items, filteredTotal: await tx.expenseEntry.count({ where }), hasNext: records.length > 20 };
    });
  }
  async detail(access: AdminAccess, id: string) { const parsedId = parseWithValidation(z.uuid(), id); return withFinanceTransaction(access, "FINANCE_READ", tx => expenseViewTx(tx, parsedId)); }
  async record(access: AdminAccess, input: unknown): Promise<ExpenseView> {
    const parsed = parseWithValidation(recordSchema, input);
    return withFinanceTransaction(access, "FINANCE_WRITE", async tx => {
      const replay = await tx.expenseEntry.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
      if (replay) { if (replay.amountRp.toFixed(0) !== parsed.amountRp || replay.category !== parsed.category || replay.expenseDate.toISOString().slice(0, 10) !== parsed.expenseDate || replay.description !== parsed.description || replay.reversalOfId) throw appError("CONFLICT"); return (await expenseViewTx(tx, replay.id))!; }
      if (parsed.proofFileId) await assertUnboundProof(tx, access, parsed.proofFileId);
      const row = await tx.expenseEntry.create({ data: { amountRp: parsed.amountRp, expenseDate: new Date(`${parsed.expenseDate}T00:00:00Z`), category: parsed.category, description: parsed.description, proofFileId: parsed.proofFileId, idempotencyKey: parsed.idempotencyKey, createdByAdminId: access.profile.id } });
      await financeAudit(tx, access, "ExpenseEntry", row.id, "finance.expense.recorded", { amountRp: parsed.amountRp });
      return (await expenseViewTx(tx, row.id))!;
    });
  }
  async correct(access: AdminAccess, input: unknown): Promise<ExpenseView> {
    const parsed = parseWithValidation(correctSchema, input);
    return withFinanceTransaction(access, "FINANCE_CORRECT", async tx => {
      const replay = await tx.expenseEntry.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
      if (replay) { if (replay.correctedFromId !== parsed.expenseId || replay.amountRp.toFixed(0) !== parsed.amountRp || replay.description !== parsed.description || replay.category !== parsed.category || replay.expenseDate.toISOString().slice(0, 10) !== parsed.expenseDate || replay.reason !== parsed.reason) throw appError("CONFLICT"); return (await expenseViewTx(tx, replay.id))!; }
      if (parsed.proofFileId) await assertUnboundProof(tx, access, parsed.proofFileId);
      await reverseExpense(tx, access, parsed.expenseId, parsed.reason, randomUUID(), parsed.expectedVersion);
      const replacement = await tx.expenseEntry.create({ data: { amountRp: parsed.amountRp, expenseDate: new Date(`${parsed.expenseDate}T00:00:00Z`), category: parsed.category, description: parsed.description, proofFileId: parsed.proofFileId, correctedFromId: parsed.expenseId, reason: parsed.reason, idempotencyKey: parsed.idempotencyKey, createdByAdminId: access.profile.id } });
      await financeAudit(tx, access, "ExpenseEntry", replacement.id, "finance.expense.corrected", { reason: parsed.reason, originalExpenseId: parsed.expenseId });
      return (await expenseViewTx(tx, replacement.id))!;
    });
  }
  async void(access: AdminAccess, input: unknown): Promise<ExpenseView> {
    const parsed = parseWithValidation(voidSchema, input);
    return withFinanceTransaction(access, "FINANCE_CORRECT", async tx => {
      const replay = await tx.expenseEntry.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
      if (replay) { if (replay.reversalOfId !== parsed.expenseId || replay.reason !== parsed.reason) throw appError("CONFLICT"); return (await expenseViewTx(tx, parsed.expenseId))!; }
      await reverseExpense(tx, access, parsed.expenseId, parsed.reason, parsed.idempotencyKey, parsed.expectedVersion);
      await financeAudit(tx, access, "ExpenseEntry", parsed.expenseId, "finance.expense.voided", { reason: parsed.reason });
      return (await expenseViewTx(tx, parsed.expenseId))!;
    });
  }
}
