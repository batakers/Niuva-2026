import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Prisma, DurableOutboxMessage } from "../../generated/prisma/client";
import type { BoundDatabaseService } from "../database-binding/service";
import { hashOpaqueToken, secureTokenEqual } from "../customer-auth/core";
import { appError } from "../shared/errors";
import type { OutboxPayloadCipher } from "./cipher";
import type { PrismaOutboxWorkerRepository } from "./worker-repository";
import { outboxIdentity, outboxMetadataSchema } from "./core";
import { parseDeliveryOutcome, parseWorkerPolicy, parseWorkerRequest, type AttemptAction, type DeliveryOutcome, type PreparedOutboxDelivery, type OutboxSender, type WorkerPolicy, type WorkerSummary } from "./worker-core";
import type { EmailEnvelope } from "../notifications/email-delivery";
export type OutboxWorkerOptions = { bound: Pick<BoundDatabaseService, "run">; repository: PrismaOutboxWorkerRepository; cipherFactory: () => OutboxPayloadCipher; senderFactory: () => OutboxSender; policy: unknown };
type Stopped = { kind: "stopped"; counter: "expired" | "cancelled" | "failed"; unknown?: boolean };
type Claimed = { kind: "claimed"; row: DurableOutboxMessage; prepared: PreparedOutboxDelivery; envelope: EmailEnvelope; measuredAt: number; validForMs: number };
type AttemptOutcome = DeliveryOutcome | { kind: "not-started" };
function metadata(row: DurableOutboxMessage) {
  return outboxMetadataSchema.parse({ id: row.id, messageKey: row.messageKey, proofKind: row.proofKind, proofId: row.proofId, purpose: row.purpose, templateVersion: row.templateVersion, fingerprint: row.fingerprint, expiresAt: row.expiresAt });
}
export class DurableOutboxWorker {
  private readonly bound: OutboxWorkerOptions["bound"];
  private readonly repository: PrismaOutboxWorkerRepository;
  private readonly cipherFactory: OutboxWorkerOptions["cipherFactory"];
  private readonly senderFactory: OutboxWorkerOptions["senderFactory"];
  private readonly policy: WorkerPolicy;
  constructor(options: OutboxWorkerOptions) {
    this.policy = parseWorkerPolicy(options.policy); this.bound = options.bound; this.repository = options.repository;
    this.cipherFactory = options.cipherFactory; this.senderFactory = options.senderFactory;
  }
  private async guarded<T>(operation: "job" | "outbox", work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.bound.run(operation, work); } catch { throw appError("PROVIDER_UNAVAILABLE"); }
  }
  async run(raw: unknown): Promise<WorkerSummary> {
    const request = parseWorkerRequest(raw);
    const summary: WorkerSummary = { ...request, scanned: 0, claimed: 0, accepted: 0, retried: 0, failed: 0, unknown: 0, cancelled: 0, expired: 0, lostLease: 0, cooldownMs: 0 };
    const count = await this.guarded("job", async tx => request.mode === "dry-run" ? (await this.repository.candidates(tx, await this.repository.now(tx), request.limit, false)).length : 0);
    if (request.mode === "dry-run") return { ...summary, scanned: count };
    let sender: OutboxSender | undefined, cipher: OutboxPayloadCipher | undefined;
    const getSender = () => sender ??= this.senderFactory(), getCipher = () => cipher ??= this.cipherFactory();
    while (summary.scanned < request.limit) {
      const result = await this.claimOne(getSender, getCipher);
      if (!result) break;
      summary.scanned++;
      if (result.kind === "stopped") { summary[result.counter]++; if (result.unknown) summary.unknown++; continue; }
      summary.claimed++;
      const outcome = await this.deliver(result);
      const counter = await this.finalize(result.row, outcome);
      summary[counter]++;
      if (counter === "failed" && outcome.kind === "unknown") summary.unknown++;
      if (outcome.kind === "retryable") summary.cooldownMs = Math.max(this.policy.retryDelaysMs[result.row.attempts - 1] ?? 0, outcome.retryAfterMs ?? 0);
      if (outcome.kind === "retryable" || outcome.kind === "unknown") break;
    }
    return summary;
  }
  private async claimOne(sender: () => OutboxSender, cipher: () => OutboxPayloadCipher): Promise<Claimed | Stopped | null> {
    return this.guarded("outbox", async tx => {
      await this.repository.lock(tx);
      let now = await this.repository.now(tx);
      const row = (await this.repository.candidates(tx, now, 1, true))[0];
      if (!row) return null;
      const stop = async (state: "FAILED" | "CANCELLED" | "EXPIRED", category: string, counter: Stopped["counter"], unknown = false): Promise<Stopped> => {
        if (!await this.repository.discard(tx, row, now, state, category)) throw appError("RESOURCE_BUSY");
        return { kind: "stopped", counter, unknown };
      };
      if (row.expiresAt <= now) return stop("EXPIRED", "EXPIRED", "expired");
      // An abandoned lease does not reveal whether its provider accepted a request.
      if (row.state === "LEASED") return stop("FAILED", "OUTCOME_UNKNOWN", "failed", true);
      const meta = metadata(row), proof = await this.repository.proof(tx, { kind: meta.proofKind, proofId: meta.proofId }, now);
      if (!proof || outboxIdentity(proof).fingerprint !== row.fingerprint) return stop("CANCELLED", "PROOF_INVALID", "cancelled");
      if (row.attempts >= this.policy.retryDelaysMs.length + 1) return stop("FAILED", "RETRY_EXHAUSTED", "failed");
      const payload = cipher().open(row.sealedPayload!, meta);
      if (payload.to !== proof.to || payload.returnTo !== proof.returnTo || !secureTokenEqual(hashOpaqueToken(payload.token), proof.tokenHash)) return stop("CANCELLED", "PAYLOAD_MISMATCH", "cancelled");
      const prepared = sender().prepare({ metadata: meta, payload });
      if (!row.sealedEnvelope && row.attempts > 0) throw appError("PROVIDER_UNAVAILABLE");
      const envelope = row.sealedEnvelope ? cipher().openEnvelope(row.sealedEnvelope, meta) : prepared.envelope;
      if (envelope.to !== proof.to) throw appError("PROVIDER_UNAVAILABLE");
      const sealedEnvelope = row.sealedEnvelope ?? cipher().sealEnvelope(envelope, meta);
      const measuredAt = performance.now();
      now = await this.repository.now(tx);
      if (row.expiresAt <= now) return stop("EXPIRED", "EXPIRED", "expired");
      if (proof.expiresAt <= now) return stop("CANCELLED", "PROOF_INVALID", "cancelled");
      const leaseExpiresAt = new Date(Math.min(now.getTime() + this.policy.leaseMs, row.expiresAt.getTime()));
      const leased = await this.repository.claim(tx, row, randomUUID(), now, leaseExpiresAt, sealedEnvelope);
      return { kind: "claimed", row: leased, prepared, envelope, measuredAt, validForMs: leaseExpiresAt.getTime() - now.getTime() };
    });
  }
  private async deliver(claim: Claimed): Promise<AttemptOutcome> {
    const remaining = () => claim.validForMs - (performance.now() - claim.measuredAt);
    if (remaining() <= 0) return { kind: "not-started" };
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<DeliveryOutcome>(resolve => { timer = setTimeout(() => { controller.abort(); resolve({ kind: "unknown" }); }, Math.min(this.policy.sendTimeoutMs, remaining())); });
    try {
      const delivery = Promise.resolve().then((): Promise<DeliveryOutcome> | AttemptOutcome => remaining() <= 0 ? { kind: "not-started" } : claim.prepared.send(claim.envelope, controller.signal)).catch((): DeliveryOutcome => ({ kind: "unknown" }));
      const result = await Promise.race([delivery, timeout]);
      return result.kind === "not-started" ? result : parseDeliveryOutcome(result);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }
  private async finalize(leased: DurableOutboxMessage, outcome: AttemptOutcome): Promise<"accepted" | "retried" | "failed" | "cancelled" | "expired" | "lostLease"> {
    return this.guarded("outbox", async tx => {
      await this.repository.lock(tx);
      const row = await this.repository.find(tx, leased.id);
      let now = await this.repository.now(tx);
      if (!row || row.state !== "LEASED" || row.leaseId !== leased.leaseId || !row.leaseExpiresAt || row.leaseExpiresAt <= now) return "lostLease";
      if (JSON.stringify(metadata(row)) !== JSON.stringify(metadata(leased))) return "lostLease";
      const meta = metadata(row);
      const proof = outcome.kind === "accepted" || outcome.kind === "retryable" ? await this.repository.proof(tx, { kind: meta.proofKind, proofId: meta.proofId }, now) : null;
      now = await this.repository.now(tx);
      if (row.leaseExpiresAt <= now) return "lostLease";
      const valid = proof && proof.expiresAt > now && outboxIdentity(proof).fingerprint === row.fingerprint;
      let action: AttemptAction, counter: "accepted" | "retried" | "failed" | "cancelled" | "expired";
      if (outcome.kind === "accepted") {
        action = { state: "ACCEPTED", providerReference: outcome.providerReference, failureCategory: valid ? null : "PROOF_INVALID_AFTER_SEND" }; counter = "accepted";
      } else if (outcome.kind === "retryable") {
        const delay = this.policy.retryDelaysMs[row.attempts - 1];
        if (!valid) { action = { state: "CANCELLED", failureCategory: "PROOF_INVALID" }; counter = "cancelled"; }
        else if (delay === undefined) { action = { state: "FAILED", failureCategory: "RETRY_EXHAUSTED" }; counter = "failed"; }
        else {
          const dueAt = new Date(now.getTime() + Math.max(delay, outcome.retryAfterMs ?? 0));
          if (dueAt >= row.expiresAt) { action = { state: "EXPIRED", failureCategory: "EXPIRED" }; counter = "expired"; }
          else { action = { state: "PENDING", dueAt, failureCategory: "RETRYABLE" }; counter = "retried"; }
        }
      } else { action = { state: "FAILED", failureCategory: outcome.kind === "unknown" ? "OUTCOME_UNKNOWN" : outcome.kind === "not-started" ? "SEND_WINDOW_EXPIRED" : "PERMANENT" }; counter = "failed"; }
      if (!await this.repository.finishOwned(tx, row, now, action)) return "lostLease";
      if (outcome.kind === "accepted" && valid) await this.repository.markDelivered(tx, proof, now);
      return counter;
    });
  }
}
