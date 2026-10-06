import { Prisma, type OrderStatus } from "@/generated/prisma/client";

import { getPaymentIssues, PAYMENT_EXCEPTION_RESULTS } from "./operational-state";

export const operationalPaymentSelect = {
  events: {
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
    select: { processingResult: true, receivedAt: true },
    where: { processingResult: { in: [...PAYMENT_EXCEPTION_RESULTS, "SETTLED", "STALE_SETTLED", "REFUNDED_AFTER_LATE_SETTLEMENT"] } },
  },
  id: true,
  providerOrderId: true,
  purpose: true,
  status: true,
  updatedAt: true,
} as const satisfies Prisma.PaymentAttemptSelect;

export const paymentIssueCandidateWhere = {
  paymentAttempts: { some: { OR: [
    { status: "REFUNDED" },
    { events: { some: { processingResult: { in: [...PAYMENT_EXCEPTION_RESULTS, "REFUNDED_AFTER_LATE_SETTLEMENT"] } } } },
  ] } },
} satisfies Prisma.OrderWhereInput;

export async function readOrderPaymentIssues(
  client: Pick<Prisma.TransactionClient, "paymentAttempt">,
  orderId: string,
  orderStatus: OrderStatus,
) {
  const attempts = await client.paymentAttempt.findMany({
    orderBy: { id: "asc" }, select: operationalPaymentSelect, where: { orderId },
  });
  return getPaymentIssues(orderStatus, attempts);
}

// Webhooks lock their attempt before the order. Use the same order for Admin
// mutations so a cached screen cannot bypass a concurrently committed refund.
export async function lockPaymentOrder(transaction: Prisma.TransactionClient, orderId: string): Promise<void> {
  await transaction.$queryRaw(Prisma.sql`
    SELECT "id" FROM "payment_attempts"
    WHERE "order_id" = ${orderId}::uuid ORDER BY "id" FOR UPDATE
  `);
  await transaction.$queryRaw(Prisma.sql`
    SELECT "id" FROM "orders" WHERE "id" = ${orderId}::uuid FOR UPDATE
  `);
}
