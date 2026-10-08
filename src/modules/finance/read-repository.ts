import "server-only";
import { Prisma, type InvoiceState } from "@/generated/prisma/client";
import { getPaymentIssues, PAYMENT_EXCEPTION_RESULTS } from "@/modules/payment/operational-state";
import { operationalPaymentSelect } from "@/modules/payment/operational-repository";
import type { FinanceListQuery } from "./read-query";
import type { FinancePaymentView, InvoiceView } from "./types";
import { invoiceViewTx } from "./invoice-service";
import { manualPaymentViewTx } from "./manual-payment-service";
export async function invoiceListTx(tx: Prisma.TransactionClient, query: FinanceListQuery) {
  const where: Prisma.InvoiceWhereInput = {
    ...(query.q ? { billingCase: { accountClosedAt: null }, OR: [{ number: { contains: query.q, mode: "insensitive" } }, { billingCase: { order: { orderNumber: { contains: query.q, mode: "insensitive" } } } }, { billingCase: { inquiry: { referenceNumber: { contains: query.q, mode: "insensitive" } } } }] } : {}),
    ...(["DRAFT", "ISSUED", "VOID", "SUPERSEDED"].includes(query.status ?? "") ? { state: query.status as InvoiceState } : {}),
    ...((query.dateFrom || query.dateTo) ? { createdAt: { ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00+07:00`) } : {}), ...(query.dateTo ? { lt: new Date(new Date(`${query.dateTo}T00:00:00+07:00`).getTime() + 86400000) } : {}) } } : {}),
  };
  if (query.service) where.AND = [{ billingCase: query.service === "b2b" ? { kind: "B2B" } : { order: { orderType: query.service === "ready-made" ? "RETAIL" : "CUSTOM_PRINT" } } }];
  const records = await tx.invoice.findMany({ where, skip: (query.page - 1) * 20, take: 21, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } });
  const items: InvoiceView[] = []; for (const record of records.slice(0, 20)) { const view = await invoiceViewTx(tx, record.id); if (view) items.push(view); }
  return { items, filteredTotal: await tx.invoice.count({ where }), hasNext: records.length > 20 };
}
export async function providerPaymentViewTx(tx: Prisma.TransactionClient, id: string): Promise<FinancePaymentView | null> {
  const row = await tx.paymentAttempt.findUnique({ where: { id }, select: { ...operationalPaymentSelect, amountRp: true, settledAt: true, orderId: true, order: { select: { status: true, accountClosedAt: true, billingCases: { select: { id: true, kind: true, invoices: { where: { state: "ISSUED" }, take: 1, select: { id: true } } } } } } } });
  if (!row) return null;
  const billing = row.order.billingCases.find(value => value.kind === row.purpose), issues = getPaymentIssues(row.order.status, [row]);
  return { id, source: "PROVIDER", reference: row.providerOrderId, amountRp: row.amountRp.toFixed(0), actualDate: row.settledAt?.toISOString() ?? null, state: issues.length ? "REVIEW" : row.status, sourceHref: row.order.accountClosedAt ? "/admin/finance/payments" : `/admin/orders/${row.orderId}`, billingCaseId: billing?.id ?? null, invoiceId: row.order.accountClosedAt ? null : billing?.invoices[0]?.id ?? null, reversed: false, reversalOfId: null, correctionId: null, reason: null };
}
export async function paymentListTx(tx: Prisma.TransactionClient, query: FinanceListQuery) {
  const providerFilters: Prisma.Sql[] = [], manualFilters: Prisma.Sql[] = [];
  let reviewIds: string[] = [];
  if (["REVIEW", "CONFIRMED"].includes(query.status ?? "")) {
    const candidates = await tx.paymentAttempt.findMany({ where: { order: { accountClosedAt: null }, OR: [{ status: "REFUNDED" }, { events: { some: { processingResult: { in: [...PAYMENT_EXCEPTION_RESULTS, "REFUNDED_AFTER_LATE_SETTLEMENT"] } } } }] }, select: { ...operationalPaymentSelect, order: { select: { status: true } } } });
    reviewIds = candidates.filter(row => getPaymentIssues(row.order.status, [row]).length > 0).map(row => row.id);
  }
  if (query.service === "b2b") providerFilters.push(Prisma.sql`FALSE`);
  else if (query.service) { providerFilters.push(Prisma.sql`o.order_type = ${query.service === "ready-made" ? "RETAIL" : "CUSTOM_PRINT"}::"OrderType"`); manualFilters.push(Prisma.sql`FALSE`); }
  if (query.q) { const q = `%${query.q.replace(/[\\%_]/g, value => `\\${value}`)}%`; providerFilters.push(Prisma.sql`(p.provider_order_id ILIKE ${q} OR o.order_number ILIKE ${q})`); manualFilters.push(Prisma.sql`(m.reference ILIKE ${q} OR i.reference_number ILIKE ${q})`); }
  if (query.status === "CONFIRMED") { providerFilters.push(Prisma.sql`p.status = 'SETTLED'`); if (reviewIds.length) providerFilters.push(Prisma.sql`p.id NOT IN (${Prisma.join(reviewIds.map(id => Prisma.sql`${id}::uuid`))})`); manualFilters.push(Prisma.sql`m.reversal_of_id IS NULL AND NOT EXISTS (SELECT 1 FROM manual_b2b_payment_entries r WHERE r.reversal_of_id=m.id)`); }
  else if (query.status === "REVERSED") { providerFilters.push(Prisma.sql`FALSE`); manualFilters.push(Prisma.sql`m.reversal_of_id IS NULL AND EXISTS (SELECT 1 FROM manual_b2b_payment_entries r WHERE r.reversal_of_id=m.id)`); }
  else if (query.status === "REVIEW") { providerFilters.push(reviewIds.length ? Prisma.sql`p.id IN (${Prisma.join(reviewIds.map(id => Prisma.sql`${id}::uuid`))})` : Prisma.sql`FALSE`); manualFilters.push(Prisma.sql`FALSE`); }
  else if (query.status) { providerFilters.push(Prisma.sql`p.status::text = ${query.status}`); manualFilters.push(Prisma.sql`FALSE`); }
  if (query.dateFrom) { providerFilters.push(Prisma.sql`p.settled_at >= ${new Date(`${query.dateFrom}T00:00:00+07:00`)}`); manualFilters.push(Prisma.sql`m.received_at >= ${query.dateFrom}::date`); }
  if (query.dateTo) { providerFilters.push(Prisma.sql`p.settled_at < ${new Date(new Date(`${query.dateTo}T00:00:00+07:00`).getTime() + 86400000)}`); manualFilters.push(Prisma.sql`m.received_at <= ${query.dateTo}::date`); }
  const providerWhere = providerFilters.length ? Prisma.join(providerFilters, " AND ") : Prisma.sql`TRUE`, manualWhere = manualFilters.length ? Prisma.join(manualFilters, " AND ") : Prisma.sql`TRUE`;
  const union = Prisma.sql`SELECT p.id, 'PROVIDER' AS source, COALESCE(p.settled_at,p.created_at) AS sorted_at FROM payment_attempts p JOIN orders o ON o.id=p.order_id WHERE ${providerWhere} UNION ALL SELECT m.id, 'MANUAL' AS source, m.created_at AS sorted_at FROM manual_b2b_payment_entries m JOIN billing_cases b ON b.id=m.billing_case_id JOIN b2b_inquiries i ON i.id=b.inquiry_id WHERE ${manualWhere}`;
  const rows = await tx.$queryRaw<{ id: string; source: "PROVIDER" | "MANUAL" }[]>(Prisma.sql`SELECT id,source FROM (${union}) r ORDER BY sorted_at DESC,id DESC OFFSET ${(query.page - 1) * 20} LIMIT 21`);
  const counts = await tx.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS count FROM (${union}) r`);
  const items: FinancePaymentView[] = []; for (const row of rows.slice(0, 20)) { const view = row.source === "PROVIDER" ? await providerPaymentViewTx(tx, row.id) : await manualPaymentViewTx(tx, row.id); if (view) items.push(view); }
  return { items, filteredTotal: Number(counts[0]?.count ?? BigInt(0)), hasNext: rows.length > 20 };
}
