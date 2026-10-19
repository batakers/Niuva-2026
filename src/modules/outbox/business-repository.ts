import { Prisma } from "@/generated/prisma/client";
import { normalizeCustomerEmail } from "../customer-auth/core";
import { isEstimateCurrent } from "../custom-print/estimate-current";
import { isModelExtension } from "../custom-print/file-types";
import { lockPaymentOrder, readOrderPaymentIssues } from "../payment/operational-repository";
import { BUSINESS_MESSAGE_MAX_AGE_MS, businessContentSchema, businessPayloadSchema, businessPurposes, type BusinessContent, type BusinessKind, type BusinessProofProjection } from "./business-core";

const customerSelect = { id: true, email: true, normalizedEmail: true, emailVerifiedAt: true, internalTestExpiresAt: true } satisfies Prisma.CustomerSelect;
type Customer = Prisma.CustomerGetPayload<{ select: typeof customerSelect }>;
const orderSelect = { id: true, orderNumber: true, status: true, currency: true, customerId: true, accountClosedAt: true, createdAt: true, shippedAt: true, customer: { select: customerSelect } } satisfies Prisma.OrderSelect;
function projection(kind: BusinessKind, id: string, customer: Customer | null, sourceAt: Date, deadline: Date | undefined, raw: BusinessContent, now: Date, validity?: Date): BusinessProofProjection | null {
  if (!customer || !customer.emailVerifiedAt || customer.emailVerifiedAt > now || customer.internalTestExpiresAt && customer.internalTestExpiresAt <= now || !deadline || sourceAt > now || deadline <= sourceAt || deadline.getTime() - sourceAt.getTime() > BUSINESS_MESSAGE_MAX_AGE_MS) return null;
  const to = normalizeCustomerEmail(customer.email), content = businessContentSchema.safeParse(raw);
  if (to !== customer.normalizedEmail || !businessPayloadSchema.shape.to.safeParse(to).success || !content.success) return null;
  const expiresAt = new Date(Math.min(deadline.getTime(), validity?.getTime() ?? Infinity, customer.internalTestExpiresAt?.getTime() ?? Infinity));
  if (expiresAt <= now) return null;
  return { kind, proofId: id, purpose: businessPurposes[kind], to, ownerId: customer.id, sourceAt, expiresAt, content: content.data };
}
export async function readBusinessProof(tx: Prisma.TransactionClient, input: { kind: BusinessKind; proofId: string; deliveryDeadline?: Date }, now: Date): Promise<BusinessProofProjection | null> {
  if (input.kind === "ORDER" || input.kind === "SHIPMENT") {
    await lockPaymentOrder(tx, input.proofId);
    const order = await tx.order.findUnique({ where: { id: input.proofId }, select: { ...orderSelect, shipments: { orderBy: { updatedAt: "desc" }, take: 1, select: { courierCode: true, trackingNumber: true, status: true } } } });
    if (!order || order.accountClosedAt || order.status === "CANCELLED") return null;
    if (input.kind === "SHIPMENT") {
      const shipment = order.shipments[0];
      if (!order.shippedAt || !["SHIPPED", "COMPLETED"].includes(order.status) || !shipment?.courierCode?.trim() || !shipment.trackingNumber?.trim() || ["EXCEPTION", "FAILED", "RETURNED", "CANCELLED"].includes(shipment.status)) return null;
    }
    return projection(input.kind, order.id, order.customer, input.kind === "SHIPMENT" ? order.shippedAt! : order.createdAt, input.deliveryDeadline,
      { reference: order.orderNumber, accountPath: `/account/orders/${order.id}` }, now);
  }
  if (input.kind === "PAYMENT") {
    const hint = await tx.paymentAttempt.findUnique({ where: { id: input.proofId }, select: { orderId: true } });
    if (!hint) return null;
    await lockPaymentOrder(tx, hint.orderId);
    const payment = await tx.paymentAttempt.findUnique({ where: { id: input.proofId }, select: { id: true, amountRp: true, purpose: true, provider: true, status: true, settledAt: true,
      events: { select: { processingResult: true, payloadJson: true } }, order: { select: orderSelect } } });
    if (!payment || payment.status !== "SETTLED" || payment.provider !== "MIDTRANS" || !payment.settledAt || payment.order.currency !== "IDR" || payment.order.accountClosedAt || payment.order.status === "CANCELLED" ||
      !payment.events.some(event => event.processingResult === "SETTLED") || (await readOrderPaymentIssues(tx, payment.order.id, payment.order.status)).length > 0) return null;
    if (payment.events.some(event => {
      const payload = event.payloadJson;
      return payload && typeof payload === "object" && !Array.isArray(payload) && ["refund", "partial_refund", "chargeback"].includes(String(payload.transactionStatus));
    })) return null;
    return projection("PAYMENT", payment.id, payment.order.customer, payment.settledAt, input.deliveryDeadline,
      { reference: payment.order.orderNumber, accountPath: `/account/orders/${payment.order.id}`, amountRp: payment.amountRp.toFixed(0), paymentPurpose: payment.purpose }, now);
  }
  const hint = await tx.customPrintQuote.findUnique({ where: { id: input.proofId }, select: { requestId: true } });
  if (!hint) return null;
  await tx.$queryRaw`SELECT id FROM custom_print_requests WHERE id = ${hint.requestId}::uuid FOR UPDATE`;
  const quote = await tx.customPrintQuote.findUnique({ where: { id: input.proofId }, select: { id: true, quoteNumber: true, version: true, status: true, sentAt: true, expiresAt: true, estimateId: true, finalTotalRp: true,
    request: { select: { id: true, customerId: true, accountClosedAt: true, status: true, customer: { select: customerSelect }, review: { select: { updatedAt: true } },
      estimates: { orderBy: { version: "desc" }, take: 1, select: { id: true, snapshot: true, lowerRp: true, upperRp: true } },
      quotes: { orderBy: { version: "desc" }, take: 1, select: { id: true } },
      files: { select: { file: { select: { bucketScope: true, purpose: true, uploadedByCustomerId: true, uploadStatus: true, extension: true, deletedAt: true } } } } } } } });
  if (!quote || quote.status !== "SENT" || !quote.sentAt || !quote.expiresAt || quote.expiresAt <= now || quote.request.accountClosedAt || quote.request.status !== "QUOTE_SENT" || quote.request.quotes[0]?.id !== quote.id || !quote.request.customerId) return null;
  const estimate = quote.request.estimates[0];
  if (!estimate || !isEstimateCurrent(estimate.snapshot, quote.request.review?.updatedAt) || quote.estimateId !== estimate.id || quote.finalTotalRp.lt(estimate.lowerRp) || quote.finalTotalRp.gt(estimate.upperRp)) return null;
  if (!quote.request.files.some(({ file }) => !file.deletedAt && file.uploadStatus === "VERIFIED" && isModelExtension(file.extension) && file.purpose === "CUSTOMER_UPLOAD" && file.bucketScope === "PRIVATE_CUSTOMER" && (file.uploadedByCustomerId === quote.request.customerId || file.uploadedByCustomerId === null))) return null;
  const closedHistory = await tx.order.findFirst({ where: { items: { some: { customQuote: { requestId: quote.request.id } } }, OR: [{ accountClosedAt: { not: null } }, { customerId: { not: quote.request.customerId } }] }, select: { id: true } });
  if (closedHistory) return null;
  return projection("QUOTE", quote.id, quote.request.customer, quote.sentAt, input.deliveryDeadline,
    { reference: quote.quoteNumber, accountPath: `/account/make/${quote.request.id}`, version: quote.version }, now, quote.expiresAt);
}

export type BusinessCandidate = { kind: BusinessKind; proofId: string; sourceAt: Date };
function candidateQuery(now: Date) {
  const active = Prisma.sql`c.email_verified_at IS NOT NULL AND c.email_verified_at <= ${now} AND (c.internal_test_expires_at IS NULL OR c.internal_test_expires_at > ${now})`;
  return Prisma.sql`SELECT source.* FROM (
    SELECT 'ORDER'::text AS kind, o.id AS "proofId", o.created_at AS "sourceAt" FROM orders o JOIN customers c ON c.id = o.customer_id WHERE ${active} AND o.account_closed_at IS NULL AND o.status <> 'CANCELLED'
    UNION ALL SELECT 'PAYMENT', p.id, p.settled_at FROM payment_attempts p JOIN orders o ON o.id = p.order_id JOIN customers c ON c.id = o.customer_id WHERE ${active} AND o.account_closed_at IS NULL AND o.status <> 'CANCELLED' AND p.status = 'SETTLED' AND p.settled_at IS NOT NULL
    UNION ALL SELECT 'QUOTE', q.id, q.sent_at FROM custom_print_quotes q JOIN custom_print_requests r ON r.id = q.request_id JOIN customers c ON c.id = r.customer_id WHERE ${active} AND r.account_closed_at IS NULL AND r.status = 'QUOTE_SENT' AND q.status = 'SENT' AND q.sent_at IS NOT NULL
    UNION ALL SELECT 'SHIPMENT', o.id, o.shipped_at FROM orders o JOIN customers c ON c.id = o.customer_id WHERE ${active} AND o.account_closed_at IS NULL AND o.status IN ('SHIPPED', 'COMPLETED') AND o.shipped_at IS NOT NULL
  ) source WHERE source."sourceAt" <= ${now} AND NOT EXISTS (SELECT 1 FROM durable_outbox_messages m WHERE m.proof_kind = source.kind AND m.proof_id = source."proofId")`;
}
export async function businessCandidates(tx: Prisma.TransactionClient, now: Date, limit: number): Promise<BusinessCandidate[]> {
  return tx.$queryRaw(Prisma.sql`${candidateQuery(now)} ORDER BY source."sourceAt", source.kind, source."proofId" LIMIT ${limit}`);
}
export async function businessBacklog(tx: Prisma.TransactionClient, now: Date): Promise<{ remainingDue: number; lagMs: number }> {
  const [row] = await tx.$queryRaw<{ count: bigint; oldest: Date | null }[]>(Prisma.sql`SELECT count(*) AS count, min(pending."sourceAt") AS oldest FROM (${candidateQuery(now)}) pending`);
  return { remainingDue: Number(row?.count ?? 0), lagMs: row?.oldest ? Math.max(0, now.getTime() - row.oldest.getTime()) : 0 };
}
