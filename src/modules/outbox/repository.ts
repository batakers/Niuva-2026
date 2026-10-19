import type { Prisma, DurableOutboxMessage } from "../../generated/prisma/client";
import { normalizeCustomerEmail, safeCustomerReturnTo } from "../customer-auth/core";
import { assertRecordedAgeDeclaration } from "../customer-auth/age-declaration";
import { closureIdentityHash } from "../customer-privacy/core";
import { lockCustomerLifecycle } from "../customer-privacy/lifecycle";
import { appError } from "../shared/errors";
import { outboxRecipientSchema } from "./core";
import type { OutboxInput, ProofProjection } from "./core";
import { isBusinessKind } from "./business-core";
import { readBusinessProof } from "./business-repository";
import { recordBusinessDeliveryFailure } from "./business-attention";

function active(deadline: Date | null, now: Date) { return deadline === null || deadline > now; }
function deadline(...values: (Date | null)[]) { return new Date(Math.min(...values.filter((value): value is Date => value !== null).map(value => value.getTime()))); }
function recipient(owner: { email: string; normalizedEmail: string }): string | null {
  const email = normalizeCustomerEmail(owner.email);
  return owner.normalizedEmail === email && outboxRecipientSchema.safeParse(email).success ? email : null;
}
export class PrismaOutboxRepository {
  async lock(tx: Prisma.TransactionClient): Promise<void> { await lockCustomerLifecycle(tx); }
  async now(tx: Prisma.TransactionClient): Promise<Date> {
    const rows = await tx.$queryRaw<{ milliseconds: number }[]>`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::double precision AS "milliseconds"`;
    const milliseconds = rows[0]?.milliseconds;
    if (typeof milliseconds !== "number" || !Number.isSafeInteger(milliseconds) || !Number.isFinite(new Date(milliseconds).getTime())) throw appError("PROVIDER_UNAVAILABLE");
    return new Date(milliseconds);
  }
  async proof(tx: Prisma.TransactionClient, input: Pick<OutboxInput, "kind" | "proofId"> & { deliveryDeadline?: Date }, now: Date): Promise<ProofProjection | null> {
    if (isBusinessKind(input.kind)) return readBusinessProof(tx, { kind: input.kind, proofId: input.proofId, deliveryDeadline: input.deliveryDeadline }, now);
    if (input.kind === "AUTH") {
      const proof = await tx.customerEmailToken.findUnique({ where: { id: input.proofId }, include: { pending: true, customer: { include: { passwordCredential: true } } } });
      if (!proof || proof.consumedAt || proof.expiresAt <= now || safeCustomerReturnTo(proof.returnTo) !== proof.returnTo) return null;
      if (proof.purpose === "verify" && proof.pendingId && !proof.customerId && proof.pending) {
        const owner = proof.pending, to = recipient(owner);
        if (!to || owner.completedAt || owner.expiresAt <= now || !active(owner.internalTestExpiresAt, now) || owner.consentAt > now) return null;
        try { assertRecordedAgeDeclaration(owner, now); } catch { return null; }
        if (await tx.customer.findUnique({ where: { normalizedEmail: owner.normalizedEmail }, select: { id: true } })) return null;
        const fence = await tx.customerClosureFence.findUnique({ where: { identityHash: closureIdentityHash(owner.normalizedEmail) } });
        if (fence && owner.consentAt <= fence.closedAt) return null;
        return { kind: "AUTH", proofId: proof.id, purpose: "AUTH_VERIFY", to, tokenHash: proof.tokenHash, returnTo: proof.returnTo, ownerId: owner.id, sessionHash: null, expiresAt: deadline(proof.expiresAt, owner.expiresAt, owner.internalTestExpiresAt) };
      }
      if (proof.purpose === "reset" && proof.customerId && !proof.pendingId && proof.customer) {
        const owner = proof.customer, to = recipient(owner);
        if (!to || !owner.emailVerifiedAt || owner.emailVerifiedAt > now || !owner.passwordCredential || !active(owner.internalTestExpiresAt, now)) return null;
        return { kind: "AUTH", proofId: proof.id, purpose: "AUTH_RESET", to, tokenHash: proof.tokenHash, returnTo: proof.returnTo, ownerId: owner.id, sessionHash: null, expiresAt: deadline(proof.expiresAt, owner.internalTestExpiresAt) };
      }
      return null;
    }
    const proof = await tx.customerPrivacyConfirmation.findUnique({ where: { id: input.proofId } });
    if (!proof || !proof.customerId || proof.consumedAt || proof.expiresAt <= now || !["EXPORT", "CLOSE"].includes(proof.purpose)) return null;
    const session = await tx.customerSession.findUnique({ where: { tokenHash: proof.sessionHash }, include: { customer: true } });
    if (!session || session.customerId !== proof.customerId || session.revokedAt || session.expiresAt <= now || !active(session.customer.internalTestExpiresAt, now)) return null;
    const to = recipient(session.customer);
    if (!to) return null;
    return { kind: "PRIVACY", proofId: proof.id, purpose: proof.purpose === "EXPORT" ? "PRIVACY_EXPORT" : "PRIVACY_CLOSE", to, tokenHash: proof.tokenHash, returnTo: null, ownerId: proof.customerId, sessionHash: proof.sessionHash, expiresAt: deadline(proof.expiresAt, session.expiresAt, session.customer.internalTestExpiresAt) };
  }
  async insert(tx: Prisma.TransactionClient, data: Prisma.DurableOutboxMessageCreateManyInput): Promise<{ row: DurableOutboxMessage; duplicate: boolean }> {
    const result = await tx.durableOutboxMessage.createMany({ data: [data], skipDuplicates: true });
    const row = await tx.durableOutboxMessage.findUnique({ where: { proofKind_proofId: { proofKind: data.proofKind, proofId: data.proofId } } });
    if (!row || row.fingerprint !== data.fingerprint || row.messageKey !== data.messageKey || row.purpose !== data.purpose || row.templateVersion !== data.templateVersion || row.expiresAt.getTime() !== new Date(data.expiresAt).getTime()) throw appError("PROVIDER_UNAVAILABLE");
    return { row, duplicate: result.count === 0 };
  }
  async find(tx: Prisma.TransactionClient, id: string): Promise<DurableOutboxMessage | null> { return tx.durableOutboxMessage.findUnique({ where: { id } }); }
  async finish(tx: Prisma.TransactionClient, id: string, state: "CANCELLED" | "EXPIRED", now: Date): Promise<DurableOutboxMessage | null> {
    const changed = await tx.durableOutboxMessage.updateMany({ where: { id, state: { in: ["PENDING", "LEASED"] } }, data: { state, sealedPayload: null, sealedEnvelope: null, leaseId: null, leaseExpiresAt: null, terminalAt: now, failureCategory: state === "EXPIRED" ? "EXPIRED" : "PROOF_INVALID" } });
    const row = await this.find(tx, id);
    if (row && changed.count === 1) await recordBusinessDeliveryFailure(tx, row, state, row.failureCategory, now);
    return row;
  }
  async expired(tx: Prisma.TransactionClient, now: Date, limit: number): Promise<{ id: string }[]> {
    return tx.durableOutboxMessage.findMany({ where: { state: { in: ["PENDING", "LEASED"] }, expiresAt: { lte: now } }, select: { id: true }, orderBy: [{ expiresAt: "asc" }, { id: "asc" }], take: limit });
  }
}
