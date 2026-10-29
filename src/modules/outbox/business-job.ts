import { createHash, randomUUID } from "node:crypto";
import type { JobHandler } from "../jobs/core";
import { RunBudget } from "../jobs/budget";
import { businessPurposes, parseBusinessPolicy } from "./business-core";
import { businessBacklog, businessCandidates, readBusinessProof } from "./business-repository";
import type { DurableOutboxService } from "./service";
import { recordBusinessDeliveryFailure } from "./business-attention";

export function createBusinessOutboxHandler(outbox: Pick<DurableOutboxService, "withTransaction">, rawPolicy: unknown): JobHandler {
  return async context => {
    const policy = parseBusinessPolicy(rawPolicy);
    return outbox.withTransaction(async ({ tx, now, enqueue }) => {
      if (context.lease) await context.verifyLease(tx);
      const candidates = await businessCandidates(tx, now, context.request.limit);
      const budget = new RunBudget(policy.runBudgetMs, () => context.elapsedMs());
      let scanned = context.request.mode === "execute" ? 0 : candidates.length, enqueued = 0, cancelled = 0, expired = 0;
      if (context.request.mode === "execute") for (const candidate of candidates) {
        // A candidate left here has no outbox row yet, so the next run finds it due again.
        if (!budget.allowsNext()) break;
        scanned++;
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
      return { counts: { scanned, enqueued, cancelled, expired, deferred: candidates.length - scanned, ...await businessBacklog(tx, now) } };
    });
  };
}
