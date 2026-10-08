import "server-only";
import { z } from "zod";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { billingCaseView, financeAudit, lockBillingSource, withFinanceTransaction } from "./repository";
import { readBillingSource } from "./source";
import { MoneyDecimal } from "./money";
import { idempotencySchema, moneySchema, reasonSchema } from "./schema";
import { manualPaymentViewTx } from "./manual-payment-service";
import { replaceInvoiceTx } from "./invoice-service";
const termsSchema = z.object({ inquiryId: z.uuid(), acceptedQuoteId: z.uuid(), expectedVersion: z.number().int().min(0), mode: z.enum(["FULL", "DEPOSIT_BALANCE"]), depositRp: moneySchema.nullable(), depositDueDate: z.iso.date().nullable().optional(), balanceDueDate: z.iso.date().nullable().optional(), reason: reasonSchema.optional(), settingsVersion: z.number().int().positive().optional(), idempotencyKey: idempotencySchema.optional() }).strict();
export class B2BBillingService {
  async setTerms(access: AdminAccess, input: unknown) {
    return withFinanceTransaction(access, "B2B_BILLING_TERMS_MANAGE", async tx => {
      const parsed = parseWithValidation(termsSchema, input), source = { kind: "B2B" as const, inquiryId: parsed.inquiryId };
      await lockBillingSource(tx, source);
      const snapshot = await readBillingSource(tx, source);
      if (snapshot.acceptedQuoteId !== parsed.acceptedQuoteId) throw appError("CONFLICT", { message: "Proposal berubah. Tinjau proposal terbaru sebelum menentukan pola pembayaran." });
      if (parsed.mode === "FULL" ? parsed.depositRp !== null : parsed.depositRp === null || !new MoneyDecimal(parsed.depositRp).gt(0) || !new MoneyDecimal(parsed.depositRp).lt(snapshot.totalRp)) throw appError("VALIDATION_ERROR", { message: "DP harus lebih besar dari nol dan lebih kecil dari total proyek. Pembayaran penuh tidak memakai DP." });
      if (parsed.depositDueDate && parsed.balanceDueDate && parsed.depositDueDate > parsed.balanceDueDate) throw appError("VALIDATION_ERROR");
      const previous = await tx.billingCase.findUnique({ where: { sourceKey: snapshot.sourceKey } });
      if ((previous?.version ?? 0) !== parsed.expectedVersion) throw appError("CONFLICT");
      const active = previous ? await tx.invoice.findFirst({ where: { billingCaseId: previous.id, state: { in: ["DRAFT", "ISSUED"] } } }) : null;
      if (active?.state === "DRAFT") throw appError("CONFLICT", { message: "Batalkan draft terlebih dahulu sebelum mengubah pola pembayaran." });
      if (active && (!parsed.reason || !parsed.settingsVersion || !parsed.idempotencyKey)) throw appError("VALIDATION_ERROR", { message: "Perubahan setelah invoice terbit memerlukan alasan dan tinjauan pengaturan. Invoice pengganti diterbitkan bersama perubahan." });
      const values = { sourceVersion: snapshot.sourceVersion, acceptedQuoteId: snapshot.acceptedQuoteId, totalRp: snapshot.totalRp, mode: parsed.mode, depositRp: parsed.depositRp, depositDueAt: parsed.depositDueDate ? new Date(`${parsed.depositDueDate}T00:00:00Z`) : null, balanceDueAt: parsed.balanceDueDate ? new Date(`${parsed.balanceDueDate}T00:00:00Z`) : null };
      const billing = previous ? await tx.billingCase.update({ where: { id: previous.id }, data: { ...values, version: { increment: 1 } } }) : await tx.billingCase.create({ data: { ...values, kind: "B2B", sourceKey: snapshot.sourceKey, inquiryId: source.inquiryId, customerId: snapshot.customerId } });
      if (active && parsed.reason && parsed.settingsVersion && parsed.idempotencyKey) await replaceInvoiceTx(tx, access, { invoiceId: active.id, expectedVersion: active.version, reason: parsed.reason, settingsVersion: parsed.settingsVersion, idempotencyKey: parsed.idempotencyKey });
      await financeAudit(tx, access, "B2BBillingTerms", billing.id, "finance.terms.updated", { mode: parsed.mode, ...(parsed.reason ? { reason: parsed.reason } : {}) });
      return billingCaseView(tx, billing);
    });
  }
  async workspace(access: AdminAccess, id: string) {
    const inquiryId = parseWithValidation(z.uuid(), id);
    return withFinanceTransaction(access, "FINANCE_READ", async tx => {
      const inquiry = await tx.b2BInquiry.findFirst({ where: { id: inquiryId, accountClosedAt: null }, select: { id: true, referenceNumber: true, quotes: { orderBy: { version: "desc" }, take: 1, select: { id: true, status: true, totalRp: true } } } });
      if (!inquiry) return null;
      const billing = await tx.billingCase.findUnique({ where: { sourceKey: `B2B:${inquiryId}` } });
      const payments = billing ? await tx.manualB2BPaymentEntry.findMany({ where: { billingCaseId: billing.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100, select: { id: true } }) : [];
      const transfers = [];
      for (const payment of payments) { const view = await manualPaymentViewTx(tx, payment.id); if (view) transfers.push(view); }
      return { inquiry: { id: inquiry.id, reference: inquiry.referenceNumber }, quote: inquiry.quotes[0] ? { ...inquiry.quotes[0], totalRp: inquiry.quotes[0].totalRp.toFixed(0) } : null, billingCase: billing ? await billingCaseView(tx, billing) : null, transfers };
    });
  }
}
