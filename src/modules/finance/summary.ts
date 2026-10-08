import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { parseReportRange, reportWindow, jakartaDayKey } from "@/modules/analytics/contract";
import { getPaymentIssues } from "@/modules/payment/operational-state";
import { operationalPaymentSelect, paymentIssueCandidateWhere } from "@/modules/payment/operational-repository";
import { sumMoney } from "./money";
import { withFinanceTransaction } from "./repository";
import type { FinanceSummary } from "./types";
type AmountPoint = Readonly<{ key: string; amount: string }>;
export async function readFinanceSummary(access: AdminAccess, rawRange: unknown, now = new Date()): Promise<FinanceSummary> {
  const range = parseReportRange(rawRange), window = reportWindow(range, now), format = range === "13m" ? "YYYY-MM" : "YYYY-MM-DD";
  return withFinanceTransaction(access, "FINANCE_READ", async tx => {
    const provider = await tx.$queryRaw<AmountPoint[]>(Prisma.sql`SELECT to_char(timezone('Asia/Jakarta', settled_at), ${format}) AS key, SUM(amount_rp)::text AS amount FROM payment_attempts WHERE settled_at >= ${window.start} AND settled_at < ${window.end} AND status IN ('SETTLED','REFUNDED') GROUP BY key`);
    const manual = await tx.$queryRaw<AmountPoint[]>(Prisma.sql`SELECT to_char(p.received_at, ${format}) AS key, SUM(p.amount_rp)::text AS amount FROM manual_b2b_payment_entries p WHERE p.received_at >= ${window.firstDay}::date AND p.received_at < ${jakartaDayKey(window.end)}::date AND p.reversal_of_id IS NULL AND NOT EXISTS (SELECT 1 FROM manual_b2b_payment_entries r WHERE r.reversal_of_id = p.id) GROUP BY key`);
    const expenses = await tx.$queryRaw<AmountPoint[]>(Prisma.sql`SELECT to_char(e.expense_date, ${format}) AS key, SUM(e.amount_rp)::text AS amount FROM expense_entries e WHERE e.expense_date >= ${window.firstDay}::date AND e.expense_date < ${jakartaDayKey(window.end)}::date AND e.reversal_of_id IS NULL AND NOT EXISTS (SELECT 1 FROM expense_entries r WHERE r.reversal_of_id = e.id) GROUP BY key`);
    const candidates = await tx.order.findMany({ where: { ...paymentIssueCandidateWhere, accountClosedAt: null }, select: { status: true, paymentAttempts: { select: operationalPaymentSelect } } });
    const needsReviewCount = candidates.reduce((count, order) => count + getPaymentIssues(order.status, order.paymentAttempts).length, 0);
    const points = window.keys.map(key => ({ key, receiptsRp: sumMoney([...provider, ...manual].filter(row => row.key === key).map(row => row.amount)), expensesRp: sumMoney(expenses.filter(row => row.key === key).map(row => row.amount)) }));
    return { range, grossConfirmedReceiptsRp: sumMoney(points.map(point => point.receiptsRp)), validExpensesRp: sumMoney(points.map(point => point.expensesRp)), needsReviewCount, points };
  });
}
