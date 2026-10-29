import { Prisma, type DurableOutboxMessage } from "../../generated/prisma/client";
import { PrismaOutboxRepository } from "./repository";
import { isBusinessProof, outboxIdentity, type ProofProjection } from "./core";
import type { AttemptAction } from "./worker-core";
import { appError } from "../shared/errors";
import { recordBusinessDeliveryFailure } from "./business-attention";
function due(now: Date) { return Prisma.sql`((state = 'PENDING' AND due_at <= ${now}) OR (state = 'LEASED' AND lease_expires_at <= ${now}))`; }
export class PrismaOutboxWorkerRepository extends PrismaOutboxRepository {
  async discard(tx: Prisma.TransactionClient, row: DurableOutboxMessage, now: Date, state: "FAILED" | "CANCELLED" | "EXPIRED", failureCategory: string): Promise<boolean> {
    if (!["PENDING", "LEASED"].includes(row.state)) return false;
    const result = await tx.durableOutboxMessage.updateMany({ where: { id: row.id, state: row.state, attempts: row.attempts, leaseId: row.leaseId }, data: { state, failureCategory, terminalAt: now, sealedPayload: null, sealedEnvelope: null, leaseId: null, leaseExpiresAt: null } });
    if (result.count === 1) await recordBusinessDeliveryFailure(tx, row, state, failureCategory, now);
    return result.count === 1;
  }
  async candidates(tx: Prisma.TransactionClient, now: Date, limit: number, lock: boolean): Promise<DurableOutboxMessage[]> {
    const ids = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM durable_outbox_messages
      WHERE ${due(now)}
      ORDER BY due_at, id LIMIT ${limit} ${lock ? Prisma.sql`FOR UPDATE SKIP LOCKED` : Prisma.empty}
    `);
    return tx.durableOutboxMessage.findMany({ where: { id: { in: ids.map(row => row.id) } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }] });
  }
  async dueCount(tx: Prisma.TransactionClient, now: Date, limit: number): Promise<number> {
    const [row] = await tx.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT count(*)::int AS count FROM (SELECT 1 FROM durable_outbox_messages WHERE ${due(now)} LIMIT ${limit}) due`);
    return row?.count ?? 0;
  }
  async claim(tx: Prisma.TransactionClient, row: DurableOutboxMessage, leaseId: string, now: Date, leaseExpiresAt: Date, sealedEnvelope = row.sealedEnvelope): Promise<DurableOutboxMessage> {
    const result = await tx.durableOutboxMessage.updateMany({ where: { id: row.id, state: "PENDING", attempts: row.attempts, sealedEnvelope: row.sealedEnvelope, dueAt: { lte: now }, expiresAt: { gt: now } }, data: { state: "LEASED", leaseId, leaseExpiresAt, sealedEnvelope, attempts: { increment: 1 }, failureCategory: null } });
    if (result.count !== 1) throw appError("RESOURCE_BUSY");
    return tx.durableOutboxMessage.findUniqueOrThrow({ where: { id: row.id } });
  }
  async finishOwned(tx: Prisma.TransactionClient, row: DurableOutboxMessage, now: Date, action: AttemptAction): Promise<boolean> {
    if (!row.leaseId) return false;
    const data: Prisma.DurableOutboxMessageUpdateManyMutationInput = {
      state: action.state, leaseId: null, leaseExpiresAt: null, failureCategory: action.failureCategory,
      ...(action.state === "PENDING" ? { dueAt: action.dueAt, terminalAt: null } : { terminalAt: now, sealedPayload: null, sealedEnvelope: null, providerReference: action.providerReference ?? null }),
    };
    const result = await tx.durableOutboxMessage.updateMany({ where: { id: row.id, state: "LEASED", leaseId: row.leaseId, leaseExpiresAt: { gt: now } }, data });
    if (result.count === 1) await recordBusinessDeliveryFailure(tx, row, action.state, action.failureCategory, now);
    return result.count === 1;
  }
  async markDelivered(tx: Prisma.TransactionClient, proof: ProofProjection, now: Date): Promise<void> {
    if (isBusinessProof(proof)) return;
    const current = await this.proof(tx, { kind: proof.kind, proofId: proof.proofId }, now);
    if (!current || outboxIdentity(current).fingerprint !== outboxIdentity(proof).fingerprint) return;
    if (proof.purpose === "AUTH_VERIFY") await tx.customerPendingRegistration.updateMany({ where: { id: proof.ownerId, completedAt: null, expiresAt: { gt: now } }, data: { deliveryConfirmed: true } });
    if (proof.kind === "PRIVACY") await tx.customerPrivacyConfirmation.updateMany({ where: { id: proof.proofId, customerId: proof.ownerId, consumedAt: null, expiresAt: { gt: now } }, data: { delivered: true } });
  }
}
