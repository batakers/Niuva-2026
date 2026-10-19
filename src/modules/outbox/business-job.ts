import { createHash, randomUUID } from "node:crypto";
import type { JobHandler } from "../jobs/core";
import { businessPurposes, parseBusinessPolicy } from "./business-core";
import { businessBacklog, businessCandidates, readBusinessProof } from "./business-repository";
import type { DurableOutboxService } from "./service";
import { recordBusinessDeliveryFailure } from "./business-attention";

export function createBusinessOutboxHandler(outbox: DurableOutboxService, rawPolicy: unknown): JobHandler {
  return async context => {
    const policy = parseBusinessPolicy(rawPolicy);
    return outbox.withTransaction(async ({ tx, now, enqueue }) => {
      if (context.lease) await context.verifyLease(tx);
      const candidates = await businessCandidates(tx, now, context.request.limit);
      let enqueued = 0, cancelled = 0, expired = 0;
      if (context.request.mode === "execute") for (const candidate of candidates) {
        const deliveryDeadline = new Date(candidate.sourceAt.getTime() + policy.maxAgeMs);
        const input = { kind: candidate.kind, proofId: candidate.proofId, deliveryDeadline };
        const proof = await readBusinessProof(tx, input, now);
        if (proof) {
          const result = await enqueue(input);
          if (!result.duplicate) enqueued++;
        } else {
          const state = deliveryDeadline <= now ? "EXPIRED" : "CANCELLED";
          const purpose = businessPurposes[candidate.kind];
          const fingerprint = createHash("sha256").update(JSON.stringify([candidate.kind, candidate.proofId, purpose, "v1", state])).digest("hex");
          const id = randomUUID();
          const result = await tx.durableOutboxMessage.createMany({ data: [{ id, proofKind: candidate.kind, proofId: candidate.proofId, purpose, templateVersion: "v1",
            messageKey: `${candidate.kind.toLowerCase()}:${purpose.toLowerCase()}:v1:${candidate.proofId}`, fingerprint,
            state, createdAt: candidate.sourceAt, dueAt: candidate.sourceAt, expiresAt: deliveryDeadline, terminalAt: now,
            failureCategory: state === "EXPIRED" ? "EXPIRED" : "PROOF_INVALID" }], skipDuplicates: true });
          if (result.count) {
            if (state === "EXPIRED") expired++; else cancelled++;
            await recordBusinessDeliveryFailure(tx, { id, proofKind: candidate.kind, proofId: candidate.proofId, purpose }, state, state === "EXPIRED" ? "EXPIRED" : "PROOF_INVALID", now);
          }
        }
      }
      if (context.lease) await context.verifyLease(tx);
      return { counts: { scanned: candidates.length, enqueued, cancelled, expired, ...await businessBacklog(tx, now) } };
    });
  };
}
