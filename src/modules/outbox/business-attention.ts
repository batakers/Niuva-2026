import type { DurableOutboxMessage, Prisma } from "../../generated/prisma/client";
import { isBusinessKind } from "./business-core";

export async function recordBusinessDeliveryFailure(tx: Prisma.TransactionClient, row: Pick<DurableOutboxMessage, "id" | "proofKind" | "proofId" | "purpose">, state: string, category: string | null, now: Date): Promise<void> {
  if (!isBusinessKind(row.proofKind) || !(state === "FAILED" || state === "EXPIRED" || category === "PAYLOAD_MISMATCH" || category === "PROOF_INVALID_AFTER_SEND")) return;
  let entityType: "Order" | "CustomPrintRequest", entityId: string | null;
  if (row.proofKind === "QUOTE") {
    entityType = "CustomPrintRequest";
    const quote = await tx.customPrintQuote.findFirst({ where: { id: row.proofId, request: { accountClosedAt: null, customerId: { not: null } } }, select: { requestId: true } });
    entityId = quote?.requestId ?? null;
  } else {
    entityType = "Order";
    const orderId = row.proofKind === "PAYMENT" ? (await tx.paymentAttempt.findUnique({ where: { id: row.proofId }, select: { orderId: true } }))?.orderId : row.proofId;
    entityId = orderId ? (await tx.order.findFirst({ where: { id: orderId, accountClosedAt: null, customerId: { not: null } }, select: { id: true } }))?.id ?? null : null;
  }
  if (!entityId) return;
  await tx.auditLog.create({ data: { entityType, entityId, action: "outbox.business.failed", actorType: "SYSTEM", createdAt: now,
    afterJson: { messageId: row.id, purpose: row.purpose, state, failureCategory: category } } });
}
