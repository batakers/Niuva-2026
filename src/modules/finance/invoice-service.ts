import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { billingSourceSchema, financialSnapshotSchema, idempotencySchema, invoiceBuyerSchema, reasonSchema } from "./schema";
import { billingCaseView, caseSource, ensureBillingCase, financeAudit, lockBillingSource, withFinanceTransaction } from "./repository";
import { readBillingSource, sourceKey } from "./source";
import { loadBillingInstructions } from "./billing-settings-service";
import { buildInvoiceFinancialSnapshot } from "./invoice-document";
import type { InvoiceDocument, InvoiceView, InvoiceFinancialSnapshot } from "./types";
const draftSchema = z.object({ source: billingSourceSchema, idempotencyKey: idempotencySchema }).strict();
const issueSchema = z.object({ invoiceId: z.uuid(), expectedVersion: z.number().int().positive(), settingsVersion: z.number().int().positive(), idempotencyKey: idempotencySchema }).strict();
const voidSchema = z.object({ invoiceId: z.uuid(), expectedVersion: z.number().int().positive(), reason: reasonSchema }).strict();
const replaceSchema = issueSchema.extend({ reason: reasonSchema, expectedSourceVersion: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();
function terms(row: Readonly<{ mode: "FULL" | "DEPOSIT_BALANCE"; depositRp: Prisma.Decimal | null; depositDueAt: Date | null; balanceDueAt: Date | null }>) { return { mode: row.mode, depositRp: row.depositRp?.toFixed(0) ?? null, depositDueDate: row.depositDueAt?.toISOString().slice(0, 10) ?? null, balanceDueDate: row.balanceDueAt?.toISOString().slice(0, 10) ?? null }; }
export async function invoiceViewTx(tx: Prisma.TransactionClient, id: string): Promise<InvoiceView | null> {
  const invoice = await tx.invoice.findUnique({ where: { id }, include: { billingCase: true, replacement: { select: { id: true } } } });
  if (!invoice) return null;
  const billing = await billingCaseView(tx, invoice.billingCase);
  let snapshot: InvoiceFinancialSnapshot | null = invoice.documentJson === null ? null : parseWithValidation(financialSnapshotSchema, invoice.documentJson);
  let settingsVersion = 0;
  if (invoice.state === "DRAFT" && !billing.closed) {
    const source = await readBillingSource(tx, caseSource(invoice.billingCase)), settings = await loadBillingInstructions(tx);
    settingsVersion = settings.version;
    snapshot = settings.values ? buildInvoiceFinancialSnapshot(source, settings.values, terms(invoice.billingCase)) : null;
  }
  const buyer = invoice.buyerJson === null || billing.closed ? null : parseWithValidation(invoiceBuyerSchema, invoice.buyerJson);
  return { id, number: invoice.number, state: invoice.state, revision: invoice.revision, version: invoice.version, settingsVersion, issuedAt: invoice.issuedAt?.toISOString() ?? null, createdAt: invoice.createdAt.toISOString(), billingCase: billing, snapshot, buyer, reason: invoice.reason, replacesId: invoice.replacesId, replacementId: invoice.replacement?.id ?? null };
}
async function issueTx(tx: Prisma.TransactionClient, access: AdminAccess, input: z.infer<typeof issueSchema>) {
  const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId }, include: { billingCase: true } });
  if (!invoice || invoice.billingCase.accountClosedAt) throw appError("NOT_FOUND");
  if (invoice.issueKey === input.idempotencyKey && invoice.number !== null) return (await invoiceViewTx(tx, invoice.id))!;
  if (invoice.state !== "DRAFT" || invoice.version !== input.expectedVersion) throw appError("CONFLICT");
  if (await tx.invoice.findFirst({ where: { issueKey: input.idempotencyKey, id: { not: invoice.id } }, select: { id: true } })) throw appError("CONFLICT");
  await lockBillingSource(tx, caseSource(invoice.billingCase));
  const source = await readBillingSource(tx, caseSource(invoice.billingCase));
  if (source.needsReview || source.sourceVersion !== invoice.sourceVersion || source.totalRp !== invoice.billingCase.totalRp.toFixed(0)) throw appError("CONFLICT", { message: "Sumber tagihan berubah atau memerlukan pemeriksaan. Siapkan ulang draft dari sumber pekerjaan." });
  const settings = await loadBillingInstructions(tx);
  if (!settings.values) throw appError("QUOTE_NOT_READY", { message: "Owner perlu melengkapi identitas penerbit dan rekening Niuva sebelum invoice diterbitkan." });
  if (settings.version !== input.settingsVersion) throw appError("CONFLICT", { message: "Instruksi pembayaran berubah. Muat ulang tinjauan sebelum menerbitkan." });
  const now = new Date(), monthParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).formatToParts(now);
  const month = `${monthParts.find(part => part.type === "year")?.value}${monthParts.find(part => part.type === "month")?.value}`;
  const sequence = await tx.invoiceSequence.upsert({ where: { month }, create: { month, counter: 1 }, update: { counter: { increment: 1 } } });
  if (sequence.counter > 999999) throw appError("RESOURCE_BUSY");
  const number = `INV-${month}-${String(sequence.counter).padStart(6, "0")}`;
  const financial = buildInvoiceFinancialSnapshot(source, settings.values, terms(invoice.billingCase));
  await tx.invoice.update({ where: { id: invoice.id }, data: { state: "ISSUED", version: { increment: 1 }, number, issueKey: input.idempotencyKey, documentJson: { ...financial, items: financial.items.map(item => ({ ...item })) }, buyerJson: source.buyer, issuedAt: now } });
  await financeAudit(tx, access, "Invoice", invoice.id, "finance.invoice.issued", { number });
  return (await invoiceViewTx(tx, invoice.id))!;
}
export async function replaceInvoiceTx(tx: Prisma.TransactionClient, access: AdminAccess, parsed: z.infer<typeof replaceSchema>): Promise<InvoiceView> {
      const replay = await tx.invoice.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
      if (replay) { if (replay.replacesId !== parsed.invoiceId) throw appError("CONFLICT"); return (await invoiceViewTx(tx, replay.id))!; }
      const row = await tx.invoice.findUnique({ where: { id: parsed.invoiceId }, include: { billingCase: true } });
      if (!row || row.billingCase.accountClosedAt) throw appError("NOT_FOUND");
      if (row.version !== parsed.expectedVersion || !row.number || !["ISSUED", "VOID"].includes(row.state)) throw appError("CONFLICT");
      const existing = await tx.invoice.findFirst({ where: { billingCaseId: row.billingCaseId, id: { not: row.id }, state: { in: ["DRAFT", "ISSUED"] } }, select: { id: true } });
      if (existing) throw appError("CONFLICT");
      const source = await readBillingSource(tx, caseSource(row.billingCase));
      if (parsed.expectedSourceVersion !== undefined && parsed.expectedSourceVersion !== source.sourceVersion) throw appError("CONFLICT", { message: "Sumber berubah setelah ditinjau. Muat ulang rincian koreksi." });
      if (source.needsReview || (row.billingCase.kind === "B2B" && source.sourceVersion !== row.billingCase.sourceVersion)) throw appError("CONFLICT", { message: "Periksa sumber dan pola pembayaran sebelum mengoreksi invoice." });
      if (row.state === "ISSUED") await tx.invoice.update({ where: { id: row.id }, data: { state: "SUPERSEDED", version: { increment: 1 } } });
      if (row.billingCase.kind !== "B2B") await tx.billingCase.update({ where: { id: row.billingCaseId }, data: { totalRp: source.totalRp, sourceVersion: source.sourceVersion, version: { increment: 1 } } });
      const latest = await tx.invoice.aggregate({ where: { billingCaseId: row.billingCaseId }, _max: { revision: true } });
      const replacement = await tx.invoice.create({ data: { billingCaseId: row.billingCaseId, revision: (latest._max.revision ?? 0) + 1, sourceVersion: source.sourceVersion, buyerJson: source.buyer, idempotencyKey: parsed.idempotencyKey, replacesId: row.id, reason: parsed.reason, createdByAdminId: access.profile.id } });
      const result = await issueTx(tx, access, { ...parsed, invoiceId: replacement.id, expectedVersion: 1 });
      await financeAudit(tx, access, "Invoice", replacement.id, "finance.invoice.corrected", { reason: parsed.reason, originalInvoiceId: row.id });
      return result;

}
export class InvoiceService {
  async createDraft(access: AdminAccess, input: unknown): Promise<InvoiceView> {
    const parsed = parseWithValidation(draftSchema, input);
    return withFinanceTransaction(access, "FINANCE_WRITE", async tx => {
      const replay = await tx.invoice.findUnique({ where: { idempotencyKey: parsed.idempotencyKey }, include: { billingCase: { select: { sourceKey: true, accountClosedAt: true } } } });
      if (replay) { if (replay.billingCase.sourceKey !== sourceKey(parsed.source) || replay.billingCase.accountClosedAt) throw appError("CONFLICT"); return (await invoiceViewTx(tx, replay.id))!; }
      let billing = await ensureBillingCase(tx, parsed.source);
      const source = await readBillingSource(tx, parsed.source);
      if (source.needsReview) throw appError("CONFLICT", { message: "Pembayaran atau nilai sumber perlu diperiksa sebelum menyiapkan invoice." });
      const active = await tx.invoice.findFirst({ where: { billingCaseId: billing.id, state: { in: ["DRAFT", "ISSUED"] } }, select: { id: true } });
      if (active) return (await invoiceViewTx(tx, active.id))!;
      const previous = await tx.invoice.findFirst({ where: { billingCaseId: billing.id }, orderBy: { revision: "desc" } });
      if (previous?.number) throw appError("CONFLICT", { message: "Gunakan koreksi pada invoice sebelumnya untuk mempertahankan riwayat penagihan." });
      if (billing.kind !== "B2B") billing = await tx.billingCase.update({ where: { id: billing.id }, data: { sourceVersion: source.sourceVersion, totalRp: source.totalRp, version: { increment: 1 } } });
      if (billing.sourceVersion !== source.sourceVersion) throw appError("CONFLICT", { message: "Owner perlu meninjau ulang pola pembayaran sesuai proposal terbaru." });
      const invoice = await tx.invoice.create({ data: { billingCaseId: billing.id, revision: (previous?.revision ?? 0) + 1, sourceVersion: source.sourceVersion, buyerJson: source.buyer, idempotencyKey: parsed.idempotencyKey, createdByAdminId: access.profile.id } });
      await financeAudit(tx, access, "Invoice", invoice.id, "finance.invoice.draft-created");
      return (await invoiceViewTx(tx, invoice.id))!;
    });
  }
  async issue(access: AdminAccess, input: unknown): Promise<InvoiceView> { const parsed = parseWithValidation(issueSchema, input); return withFinanceTransaction(access, "FINANCE_WRITE", tx => issueTx(tx, access, parsed)); }
  async void(access: AdminAccess, input: unknown): Promise<InvoiceView> {
    const parsed = parseWithValidation(voidSchema, input);
    return withFinanceTransaction(access, "FINANCE_CORRECT", async tx => {
      const row = await tx.invoice.findUnique({ where: { id: parsed.invoiceId }, include: { billingCase: true } });
      if (!row || row.billingCase.accountClosedAt) throw appError("NOT_FOUND");
      if (row.state === "VOID" && row.reason === parsed.reason) return (await invoiceViewTx(tx, row.id))!;
      if (row.version !== parsed.expectedVersion || !["DRAFT", "ISSUED"].includes(row.state)) throw appError("CONFLICT");
      await tx.invoice.update({ where: { id: row.id }, data: { state: "VOID", reason: parsed.reason, version: { increment: 1 } } });
      await financeAudit(tx, access, "Invoice", row.id, "finance.invoice.voided", { reason: parsed.reason });
      return (await invoiceViewTx(tx, row.id))!;
    });
  }
  async replace(access: AdminAccess, input: unknown): Promise<InvoiceView> {
    const parsed = parseWithValidation(replaceSchema, input);
    return withFinanceTransaction(access, "FINANCE_CORRECT", tx => replaceInvoiceTx(tx, access, parsed));
  }
  async document(access: AdminAccess, id: string): Promise<InvoiceDocument> {
    const parsedId = parseWithValidation(z.uuid(), id);
    return withFinanceTransaction(access, "FINANCE_READ", async tx => {
      const invoice = await invoiceViewTx(tx, parsedId);
      if (!invoice || invoice.billingCase.closed || !invoice.buyer) throw appError("NOT_FOUND");
      if (!invoice.number || !invoice.issuedAt || !invoice.snapshot) throw appError("CONFLICT", { message: "PDF tersedia setelah invoice diterbitkan." });
      return { number: invoice.number, state: invoice.state, revision: invoice.revision, issuedAt: invoice.issuedAt, buyer: invoice.buyer, financial: invoice.snapshot, payment: { checkedAt: new Date().toISOString(), paidRp: invoice.billingCase.paidRp, remainingRp: invoice.billingCase.remainingRp, state: invoice.billingCase.paymentState } };
    });
  }
}
