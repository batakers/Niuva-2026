import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, DurableOutboxMessage } from "../../generated/prisma/client";
import { hashOpaqueToken, secureTokenEqual } from "../customer-auth/core";
import type { BoundDatabaseService } from "../database-binding/service";
import { appError } from "../shared/errors";
import { isBusinessProof, outboxIdentity, outboxMetadataSchema, parseOutboxInput, type OutboxInput, type OutboxPayload } from "./core";
import type { OutboxPayloadCipher } from "./cipher";
import type { PrismaOutboxRepository } from "./repository";
export type OutboxReceipt = { id: string; messageKey: string; state: string; expiresAt: Date; duplicate: boolean };
export type OutboxTransaction = { tx: Prisma.TransactionClient; now: Date; enqueue(raw: unknown): Promise<OutboxReceipt> };
type Options = { bound: Pick<BoundDatabaseService, "run">; repository: PrismaOutboxRepository; cipherFactory: () => OutboxPayloadCipher };
function receipt(row: DurableOutboxMessage, duplicate = false): OutboxReceipt {
  return { id: row.id, messageKey: row.messageKey, state: row.state, expiresAt: new Date(row.expiresAt), duplicate };
}
export class DurableOutboxService {
  private readonly bound: Options["bound"];
  private readonly repository: PrismaOutboxRepository;
  private readonly cipherFactory: () => OutboxPayloadCipher;
  constructor(options: Options) { this.bound = options.bound; this.repository = options.repository; this.cipherFactory = options.cipherFactory; }
  private async guarded<T>(operation: "outbox" | "job", work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.bound.run(operation, work); } catch { throw appError("PROVIDER_UNAVAILABLE"); }
  }
  async enqueue(raw: unknown): Promise<OutboxReceipt> {
    const input = parseOutboxInput(raw);
    return this.withTransaction(context => context.enqueue(input));
  }
  async withTransaction<T>(work: (context: OutboxTransaction) => Promise<T>): Promise<T> {
    return this.guarded("outbox", async tx => {
      await this.repository.lock(tx);
      const now = await this.repository.now(tx);
      let open = true;
      try {
        return await work({ tx, now: new Date(now), enqueue: async raw => {
          if (!open) throw appError("PROVIDER_UNAVAILABLE");
          return this.enqueueIn(tx, parseOutboxInput(raw));
        } });
      } finally { open = false; }
    });
  }
  private async enqueueIn(tx: Prisma.TransactionClient, input: OutboxInput): Promise<OutboxReceipt> {
    const now = await this.repository.now(tx);
    const proof = await this.repository.proof(tx, input, now);
    if (!proof || proof.expiresAt <= now) throw appError("PROVIDER_UNAVAILABLE");
    let payload: OutboxPayload;
    if (isBusinessProof(proof)) {
      if ("token" in input) throw appError("PROVIDER_UNAVAILABLE");
      payload = { business: true, to: proof.to, content: proof.content };
    } else {
      if (!("token" in input) || !secureTokenEqual(hashOpaqueToken(input.token), proof.tokenHash)) throw appError("PROVIDER_UNAVAILABLE");
      payload = { to: proof.to, token: input.token, returnTo: proof.returnTo };
    }
    const metadata = { id: randomUUID(), ...outboxIdentity(proof), proofKind: proof.kind, proofId: proof.proofId, purpose: proof.purpose, templateVersion: "v1" as const, expiresAt: proof.expiresAt };
    const sealedPayload = this.cipherFactory().seal(payload, metadata);
    const result = await this.repository.insert(tx, { ...metadata, sealedPayload, createdAt: isBusinessProof(proof) ? proof.sourceAt : now, dueAt: now });
    return receipt(result.row, result.duplicate);
  }
  async revalidate(id: string): Promise<OutboxReceipt | null> {
    if (!z.uuid().safeParse(id).success) throw appError("VALIDATION_ERROR");
    return this.guarded("outbox", async tx => {
      await this.repository.lock(tx);
      const row = await this.repository.find(tx, id);
      if (!row) return null;
      if (!["PENDING", "LEASED"].includes(row.state)) return receipt(row);
      const now = await this.repository.now(tx);
      if (row.expiresAt <= now) {
        const expired = await this.repository.finish(tx, id, "EXPIRED", now);
        return expired ? receipt(expired) : null;
      }
      const metadata = outboxMetadataSchema.parse({ id: row.id, messageKey: row.messageKey, proofKind: row.proofKind, proofId: row.proofId, purpose: row.purpose, templateVersion: row.templateVersion, fingerprint: row.fingerprint, expiresAt: row.expiresAt });
      const proof = await this.repository.proof(tx, { kind: metadata.proofKind, proofId: metadata.proofId, deliveryDeadline: row.expiresAt }, now);
      if (!proof || outboxIdentity(proof).fingerprint !== row.fingerprint) {
        const cancelled = await this.repository.finish(tx, id, "CANCELLED", now);
        return cancelled ? receipt(cancelled) : null;
      }
      return receipt(row);
    });
  }
  async expireBatch(limit = 100): Promise<number> {
    if (!z.number().int().min(1).max(100).safeParse(limit).success) throw appError("VALIDATION_ERROR");
    return this.guarded("job", async tx => this.expireIn(tx, await this.repository.now(tx), limit, false));
  }
  async expireIn(tx: Prisma.TransactionClient, now: Date, limit: number, dryRun: boolean): Promise<number> {
      if (!z.number().int().min(1).max(100).safeParse(limit).success) throw appError("VALIDATION_ERROR");
      await this.repository.lock(tx);
      const expired = await this.repository.expired(tx, now, limit);
      if (dryRun) return expired.length;
      let count = 0;
      for (const row of expired) if ((await this.repository.finish(tx, row.id, "EXPIRED", now))?.state === "EXPIRED") count++;
      return count;
  }
}
