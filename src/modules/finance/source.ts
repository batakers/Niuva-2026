import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { getPaymentIssues } from "@/modules/payment/operational-state";
import { operationalPaymentSelect } from "@/modules/payment/operational-repository";
import { billingSourceSchema } from "./schema";
import { MoneyDecimal, sumMoney } from "./money";
import type { BillingSource, BillingSourceSnapshot } from "./types";
import { withFinanceTransaction } from "./repository";
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function sourceKey(source: BillingSource) { return `${source.kind}:${source.kind === "B2B" ? source.inquiryId : source.orderId}`; }
export async function readBillingSource(tx: Prisma.TransactionClient, source: BillingSource): Promise<BillingSourceSnapshot> {
  if (source.kind === "B2B") {
    const inquiry = await tx.b2BInquiry.findFirst({ where: { id: source.inquiryId, accountClosedAt: null }, select: { id: true, referenceNumber: true, customerId: true, name: true, email: true, phone: true, quotes: { orderBy: { version: "desc" }, take: 1, select: { id: true, status: true, version: true, totalRp: true, lineItems: true } } } });
    if (!inquiry) throw appError("NOT_FOUND");
    const quote = inquiry.quotes[0];
    if (!inquiry.customerId || !quote || quote.status !== "ACCEPTED") throw appError("QUOTE_NOT_READY", { message: "Penagihan B2B memerlukan proposal terbaru yang telah diterima customer." });
    const items = [{ name: `Proyek B2B · ${inquiry.referenceNumber}`, amountRp: quote.totalRp.toFixed(0) }];
    return { source, sourceKey: sourceKey(source), sourceVersion: fingerprint({ quoteId: quote.id, version: quote.version, total: quote.totalRp.toFixed(0), customerId: inquiry.customerId }), customerId: inquiry.customerId, totalRp: quote.totalRp.toFixed(0), buyer: { name: inquiry.name, email: inquiry.email, phone: inquiry.phone }, reference: inquiry.referenceNumber, items, needsReview: false, acceptedQuoteId: quote.id };
  }
  const order = await tx.order.findFirst({ where: { id: source.orderId, accountClosedAt: null }, select: { id: true, orderNumber: true, orderType: true, status: true, customerId: true, customerName: true, customerEmail: true, customerPhone: true, itemsSubtotalRp: true, shippingTotalRp: true, grandTotalRp: true, updatedAt: true, items: { select: { nameSnapshot: true, lineTotalRp: true, customQuote: { select: { status: true, finalTotalRp: true, request: { select: { accountClosedAt: true } } } } } }, paymentAttempts: { select: { ...operationalPaymentSelect, amountRp: true, settledAt: true }, orderBy: { createdAt: "desc" } }, shipmentRates: { orderBy: { selectedAt: "desc" }, take: 1, select: { priceRp: true } } } });
  if (!order) throw appError("NOT_FOUND");
  const attempts = order.paymentAttempts.filter(attempt => attempt.purpose === source.kind && ["PENDING", "SETTLED", "REFUNDED"].includes(attempt.status));
  const custom = order.orderType === "CUSTOM_PRINT";
  if (source.kind === "CUSTOM_SHIPPING" && (!custom || !attempts.length)) throw appError("QUOTE_NOT_READY", { message: "Invoice ongkir tersedia setelah biaya pengiriman final disiapkan." });
  const totalRp = (source.kind === "CUSTOM_SHIPPING" ? order.shippingTotalRp : custom ? order.itemsSubtotalRp : order.grandTotalRp).toFixed(0);
  let needsReview = getPaymentIssues(order.status, order.paymentAttempts).length > 0 || attempts.some(attempt => attempt.amountRp.toFixed(0) !== totalRp || attempt.status === "REFUNDED" || (attempt.status === "SETTLED" && attempt.settledAt === null));
  if (source.kind === "ORDER_TOTAL") {
    if (!new MoneyDecimal(order.itemsSubtotalRp.toString()).plus(order.shippingTotalRp.toString()).eq(order.grandTotalRp.toString())) needsReview = true;
    if (order.items.length && sumMoney(order.items.map(item => item.lineTotalRp.toFixed(0))) !== order.itemsSubtotalRp.toFixed(0)) needsReview = true;
    if (custom && (!order.items.length || order.items.some(item => !item.customQuote || item.customQuote.status !== "ACCEPTED" || item.customQuote.request.accountClosedAt !== null || item.customQuote.finalTotalRp.toFixed(0) !== item.lineTotalRp.toFixed(0)))) needsReview = true;
  } else if (order.shipmentRates[0]?.priceRp.toFixed(0) !== totalRp) needsReview = true;
  const items = source.kind === "CUSTOM_SHIPPING" ? [{ name: `Pengiriman · ${order.orderNumber}`, amountRp: totalRp }] : order.items.length ? [...order.items.map(item => ({ name: item.nameSnapshot, amountRp: item.lineTotalRp.toFixed(0) })), ...(!custom && order.shippingTotalRp.gt(0) ? [{ name: "Pengiriman", amountRp: order.shippingTotalRp.toFixed(0) }] : [])] : [{ name: `Pesanan · ${order.orderNumber}`, amountRp: totalRp }];
  return { source, sourceKey: sourceKey(source), sourceVersion: fingerprint({ totalRp, items, customerId: order.customerId, buyer: [order.customerName, order.customerEmail, order.customerPhone] }), customerId: order.customerId, totalRp, buyer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone }, reference: order.orderNumber, items, needsReview };
}
export async function loadBillingSource(access: AdminAccess, input: unknown) {
  const source = parseWithValidation(billingSourceSchema, input);
  return withFinanceTransaction(access, "FINANCE_READ", tx => readBillingSource(tx, source));
}
