import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { databaseNow } from "@/lib/db/clock";
import { requireAdminPermission } from "../admin/permissions";
import { assertInternalAccountActive } from "../customer-auth/internal-testing";
import { lockCustomerLifecycle } from "../customer-privacy/lifecycle";
import { lockPaymentOrder } from "../payment/operational-repository";
import { appError } from "../shared/errors";

export type RefundActor = Readonly<{ kind: "CUSTOMER"; id: string }> | Readonly<{ kind: "ADMIN"; access: AdminAccess; ownerOnly?: boolean; write?: boolean }>;
export const refundOrderSelect = {
  id: true, orderNumber: true, status: true, customerId: true, accountClosedAt: true, currency: true,
  paymentAttempts: { orderBy: { id: "asc" }, select: { id: true, purpose: true, provider: true, providerOrderId: true,
    providerTransactionId: true, amountRp: true, status: true, settledAt: true, events: { orderBy: [{ receivedAt: "asc" }, { id: "asc" }], select: { processingResult: true } } } },
} satisfies Prisma.OrderSelect;
export type RefundOrderRow = Prisma.OrderGetPayload<{ select: typeof refundOrderSelect }>;
export async function lockRefundOrder(tx: Prisma.TransactionClient, orderId: string, actor?: RefundActor): Promise<{ order: RefundOrderRow; now: Date }> {
  await lockCustomerLifecycle(tx);
  if (actor?.kind === "ADMIN") {
    requireAdminPermission(actor.access, actor.ownerOnly ? "PAYMENT_REFUND_FULL" : actor.write ? "FINANCE_WRITE" : "FINANCE_READ");
    if (actor.ownerOnly && actor.access.profile.role !== "OWNER") throw appError("FORBIDDEN");
    await tx.$queryRaw`SELECT id FROM admin_profiles WHERE id = ${actor.access.profile.id}::uuid FOR UPDATE`;
    const profile = await tx.adminProfile.findFirst({ where: { id: actor.access.profile.id, isActive: true, role: actor.access.profile.role }, select: { authUserId: true } });
    if (!profile || profile.authUserId !== null && profile.authUserId !== actor.access.authUserId) throw appError("FORBIDDEN");
  }
  await lockPaymentOrder(tx, orderId);
  const now = await databaseNow(tx);
  if (actor?.kind === "CUSTOMER") {
    const customer = await tx.customer.findUnique({ where: { id: actor.id }, select: { internalTestExpiresAt: true } });
    if (!customer) throw appError("UNAUTHORIZED");
    assertInternalAccountActive(customer.internalTestExpiresAt, now);
  }
  const order = await tx.order.findUnique({ where: { id: orderId }, select: refundOrderSelect });
  if (!order || actor?.kind === "CUSTOMER" && (order.customerId !== actor.id || order.accountClosedAt !== null)) throw appError("NOT_FOUND");
  return { order, now };
}
export async function withRefundOrder<T>(prisma: PrismaClient, actor: RefundActor, orderId: string, run: (tx: Prisma.TransactionClient, order: RefundOrderRow, now: Date) => Promise<T>): Promise<T> {
  try { return await prisma.$transaction(async tx => { const { order, now } = await lockRefundOrder(tx, orderId, actor); return run(tx, order, now); }, { timeout: 15000 }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw appError("CONFLICT", { message: "Kunci atau bukti sudah dipakai. Muat ulang catatan yang sama." });
    throw error;
  }
}
