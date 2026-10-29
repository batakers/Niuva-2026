import type { JobHandler, JobResult } from "../jobs/core";
import { appError } from "../shared/errors";
import { PaymentReconciliationRepository, paymentReconciliationBacklog } from "./reconciliation-repository";
import type { PaymentStatusGateway } from "./status-gateway";

export function createPaymentReconciliationHandler(gatewayFactory: () => PaymentStatusGateway, repository: PaymentReconciliationRepository): JobHandler {
  return async context => {
    const candidates = await context.withLease((tx, now) => repository.candidates(tx, now, context.request.limit));
    const counts: JobResult["counts"] = { scanned: 0, accepted: 0, pending: 0, expired: 0, cancelled: 0, unknown: 0 };
    if (context.request.mode === "dry-run") return { counts: { ...counts, scanned: candidates.length, ...await context.withLease((tx, now) => paymentReconciliationBacklog(tx, now)) } };
    if (!context.lease) throw appError("PROVIDER_UNAVAILABLE");
    const gateway = candidates.length ? gatewayFactory() : null;
    let cooldownMs = 0;
    for (const target of candidates) {
      const remaining = await context.withLease(async (tx, now) => (await context.verifyLease(tx)).getTime() - now.getTime());
      if (remaining < 1 || !gateway) throw appError("PROVIDER_UNAVAILABLE");
      const result = await gateway.getStatus({ providerOrderId: target.providerOrderId, providerTransactionId: target.providerTransactionId }, AbortSignal.timeout(Math.min(remaining, 8000)));
      const outcome = await context.withLease(async (tx, now) => {
        const value = await repository.applyIn(tx, target, context.lease!.id, result, now);
        if (result.kind === "unavailable" && result.retryAfterMs) await context.recordCooldown(tx, new Date(now.getTime() + result.retryAfterMs));
        await context.verifyLease(tx);
        return value;
      });
      counts.scanned = (counts.scanned ?? 0) + 1;
      const counter = ["SETTLED", "STALE_SETTLED"].includes(outcome) ? "accepted" : outcome === "PENDING" ? "pending" : outcome === "EXPIRED" ? "expired" : ["FAILED", "CANCELLED", "STALE_FAILED", "STALE_EXPIRED"].includes(outcome) ? "cancelled" : "unknown";
      counts[counter] = (counts[counter] ?? 0) + 1;
      if (result.kind === "unavailable") { cooldownMs = result.retryAfterMs ?? 0; break; }
    }
    return { counts: { ...counts, ...await context.withLease((tx, now) => paymentReconciliationBacklog(tx, now)) }, cooldownMs, ...((counts.unknown ?? 0) > 0 ? { failure: "OUTCOME_UNKNOWN" as const } : {}) };
  };
}
