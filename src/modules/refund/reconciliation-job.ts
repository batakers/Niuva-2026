import type { JobHandler, JobResult } from "../jobs/core";
import { appError } from "../shared/errors";
import { RefundExecutionRepository, refundReconciliationBacklog } from "./execution-repository";
import type { RefundGateway } from "./gateway";

export function createRefundReconciliationHandler(gatewayFactory: () => RefundGateway, repository: RefundExecutionRepository): JobHandler {
  return async context => {
    const targets = await context.withLease(tx => repository.candidates(tx, context.request.limit));
    const counts: JobResult["counts"] = { scanned: 0, accepted: 0, pending: 0, unknown: 0 };
    if (context.request.mode === "dry-run") return { counts: { ...counts, scanned: targets.length, ...await context.withLease((tx, now) => refundReconciliationBacklog(tx, now)) } };
    if (!context.lease) throw appError("PROVIDER_UNAVAILABLE");
    const gateway = targets.length ? gatewayFactory() : null;
    let cooldownMs = 0;
    for (const target of targets) {
      const remaining = await context.withLease(async (tx, now) => (await context.verifyLease(tx)).getTime() - now.getTime());
      if (remaining < 1 || !gateway) throw appError("PROVIDER_UNAVAILABLE");
      const result = await gateway.getStatus(target.target, AbortSignal.timeout(Math.min(remaining, 8000)));
      const outcome = await context.withLease(async (tx, now) => {
        const value = await repository.observeIn(tx, target, context.lease!.id, result, now);
        if (result.kind === "unavailable" && result.retryAfterMs) await context.recordCooldown(tx, new Date(now.getTime() + result.retryAfterMs));
        await context.verifyLease(tx);
        return value;
      });
      counts.scanned = (counts.scanned ?? 0) + 1;
      const counter = outcome === "CONFIRMED" ? "accepted" : ["PENDING", "SETTLED"].includes(outcome) ? "pending" : "unknown";
      counts[counter] = (counts[counter] ?? 0) + 1;
      if (result.kind === "unavailable") { cooldownMs = result.retryAfterMs ?? 0; break; }
    }
    return { counts: { ...counts, ...await context.withLease((tx, now) => refundReconciliationBacklog(tx, now)) }, cooldownMs, ...((counts.unknown ?? 0) > 0 ? { failure: "OUTCOME_UNKNOWN" as const } : {}) };
  };
}
