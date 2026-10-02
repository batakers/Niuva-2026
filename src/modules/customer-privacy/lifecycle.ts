import type { Prisma } from "@/generated/prisma/client";
import { appError } from "../shared/errors";
import { hashOpaqueToken, createOpaqueToken } from "../customer-auth/core";
import { DAY_MS, closureIdentityHash, closureGoogleHash } from "./core";

// All auth writers and permanent closure share this transaction lock. The
// feature is local/test only; this favors a simple, auditable lock order.
export async function lockCustomerLifecycle(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-customer-account-lifecycle'))`;
}
export async function lockCustomerBusinessWrite(tx: Prisma.TransactionClient, customerId?: string) {
  if (customerId === undefined) return;
  await lockCustomerLifecycle(tx);
  if (!await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } })) throw appError("UNAUTHORIZED");
}
export async function assertFreshAccountIntent(tx: Prisma.TransactionClient, email: string, startedAt: Date, googleSubject?: string) {
  const fences = await tx.customerClosureFence.findMany({ where: { identityHash: { in: [closureIdentityHash(email), ...(googleSubject ? [closureGoogleHash(googleSubject)] : [])] } } });
  if (fences.some(fence => startedAt <= fence.closedAt)) throw appError("UNAUTHORIZED");
}
export async function eraseCustomerAccount(tx: Prisma.TransactionClient, id: string, now: Date) {
  const customer = await tx.customer.findUnique({ where: { id } });
  if (!customer) return false;
  const expiresAt = new Date(now.getTime() + 30 * DAY_MS);
  await tx.customerClosureFence.upsert({ where: { identityHash: closureIdentityHash(customer.normalizedEmail) }, create: { identityHash: closureIdentityHash(customer.normalizedEmail), closedAt: now, expiresAt }, update: { closedAt: now, expiresAt } });
  if (customer.googleSubject) await tx.customerClosureFence.upsert({ where: { identityHash: closureGoogleHash(customer.googleSubject) }, create: { identityHash: closureGoogleHash(customer.googleSubject), closedAt: now, expiresAt }, update: { closedAt: now, expiresAt } });
  // Rotate old capabilities and persist a business-side marker even after the
  // Customer FK is removed. Re-registration never acquires these records.
  for (const order of await tx.order.findMany({ where: { customerId: id }, select: { id: true } })) await tx.order.update({ where: { id: order.id }, data: { accountClosedAt: now, publicTokenHash: hashOpaqueToken(createOpaqueToken()) } });
  for (const row of await tx.b2BInquiry.findMany({ where: { customerId: id }, select: { id: true } })) await tx.b2BInquiry.update({ where: { id: row.id }, data: { accountClosedAt: now, publicTokenHash: hashOpaqueToken(createOpaqueToken()) } });
  for (const row of await tx.customPrintRequest.findMany({ where: { customerId: id }, select: { id: true } })) await tx.customPrintRequest.update({ where: { id: row.id }, data: { accountClosedAt: now, publicTokenHash: hashOpaqueToken(createOpaqueToken()) } });
  for (const quote of await tx.customPrintQuote.findMany({ where: { request: { customerId: id } }, select: { id: true } })) await tx.customPrintQuote.update({ where: { id: quote.id }, data: { publicTokenHash: hashOpaqueToken(createOpaqueToken()) } });
  await tx.customerPendingRegistration.deleteMany({ where: { normalizedEmail: customer.normalizedEmail } });
  await tx.customerInternalGoogleConsent.deleteMany({ where: { normalizedEmail: customer.normalizedEmail } });
  await tx.customerPrivacyConfirmation.updateMany({ where: { customerId: id, consumedAt: null }, data: { consumedAt: now } });
  // Cascade removes password, sessions, email tokens and account consents.
  // Business FKs and open privacy cases are SET NULL, never cascaded away.
  await tx.customer.delete({ where: { id } });
  return true;
}
