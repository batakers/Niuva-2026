import { describe, expect, it, vi } from "vitest";
import type { OperationalJobRuntime } from "@/modules/jobs/runtime";
import { JOB_SCHEDULES, parseJobSchedule, runJobScheduleTick, type JobSchedule } from "@/modules/jobs/schedule";
import { appError } from "@/modules/shared/errors";

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
const jobPolicy = { leaseMs: 60000, minIntervalMs: 30000, failureCooldownMs: 30000 };
const base = { instruction: "TASKS.md#keputusan-owner-paket-q", decidedOn: "2026-10-30", inspection: { maxLagMs: HOUR } };
const inspection = { checkedAt: "2026-10-30T00:00:00.000Z", jobs: [], outbox: { pending: 0, leased: 0, failed: 0, unknown: 0, expiredPending: 0, staleLeases: 0, dueLagMs: 0 }, privacy: { overdue: 0, overdueHolds: 0 }, inventory: { remainingDue: 0, lagMs: 0 }, payment: { remainingDue: 0, lagMs: 0 }, files: { pendingDeletion: 0, failedDeletion: 0, held: 0, overdueHolds: 0, oldestPendingLagMs: 0 }, refund: { remainingDue: 0, lagMs: 0 } };
function runtime(run: OperationalJobRuntime["run"], alarms: Awaited<ReturnType<OperationalJobRuntime["inspect"]>>["alarms"] = []) {
  return { run: vi.fn(run), inspect: vi.fn(async () => ({ ...inspection, alarms })) };
}
const production = JOB_SCHEDULES.production as JobSchedule;

describe("operational job schedule", () => {
  it("schedules only production, from the Owner's recorded Q14 decision", () => {
    expect(JOB_SCHEDULES.staging).toBeNull(); expect(JOB_SCHEDULES["local-test"]).toBeNull();
    expect(production).toMatchObject({ instruction: "TASKS.md#keputusan-owner-paket-q", decidedOn: "2026-10-30", inspection: { maxLagMs: HOUR } });
  });
  it("matches the approved cadence and limits, each due half a one-minute tick early", () => {
    const cadence = Object.fromEntries(production.entries.map(entry => [entry.job, [entry.jobPolicy.minIntervalMs + MINUTE / 2, entry.limit]]));
    expect(cadence).toEqual({
      OUTBOX_DELIVERY: [MINUTE, 10], OUTBOX_BUSINESS: [MINUTE, 10], OUTBOX_EXPIRY: [15 * MINUTE, 100], INVENTORY_RESERVATIONS: [5 * MINUTE, 100],
      PAYMENT_RECONCILIATION: [15 * MINUTE, 10], REFUND_RECONCILIATION: [HOUR, 10], CUSTOMER_FILE_RETENTION: [DAY, 10], CUSTOMER_AUTH_CLEANUP: [DAY, 100], CUSTOMER_PRIVACY_CLEANUP: [DAY, 100],
    });
    for (const entry of production.entries) {
      expect(entry.jobPolicy.leaseMs).toBe(MINUTE);
      expect(entry.jobPolicy.failureCooldownMs).toBe(Math.min(entry.jobPolicy.minIntervalMs, 5 * MINUTE - MINUTE / 2));
    }
    expect(production.entries.find(entry => entry.job === "OUTBOX_DELIVERY")?.workerPolicy).toEqual({ leaseMs: 10000, sendTimeoutMs: 5000, retryDelaysMs: [], runBudgetMs: 20000 });
    expect(production.entries.find(entry => entry.job === "OUTBOX_BUSINESS")?.businessPolicy).toEqual({ maxAgeMs: DAY, runBudgetMs: 20000 });
  });
  it("rejects duplicate jobs, missing or misplaced execution policies, unbounded provider jobs and missing references", () => {
    const delivery = { job: "OUTBOX_DELIVERY", limit: 10, jobPolicy, workerPolicy: { leaseMs: 10000, sendTimeoutMs: 5000, retryDelaysMs: [], runBudgetMs: 20000 } };
    expect(parseJobSchedule({ ...base, entries: [delivery] }).entries).toHaveLength(1);
    for (const entries of [
      [], [delivery, delivery], [{ ...delivery, workerPolicy: undefined }], [{ job: "OUTBOX_EXPIRY", limit: 10, jobPolicy, workerPolicy: delivery.workerPolicy }],
      [{ job: "OUTBOX_BUSINESS", limit: 10, jobPolicy }], [{ job: "PAYMENT_RECONCILIATION", limit: 11, jobPolicy }], [{ job: "OUTBOX_EXPIRY", limit: 10, jobPolicy: {} }],
      [{ job: "UNKNOWN_JOB", limit: 10, jobPolicy }], [{ job: "OUTBOX_EXPIRY", limit: 10, jobPolicy, mode: "dry-run" }],
    ]) expect(() => parseJobSchedule({ ...base, entries })).toThrow();
    for (const override of [{ instruction: " " }, { decidedOn: "30 Oktober" }, { inspection: {} }]) expect(() => parseJobSchedule({ ...base, ...override, entries: [delivery] })).toThrow();
  });
  it("runs every entry in order in execute mode with its own policies", async () => {
    const fake = runtime(async request => ({ job: request.job, mode: request.mode, state: "completed", counts: { scanned: 0 } }));
    const tick = await runJobScheduleTick(fake, production);
    expect(fake.run.mock.calls.map(([request]) => request.job)).toEqual(production.entries.map(entry => entry.job));
    for (const [index, entry] of production.entries.entries()) expect(fake.run.mock.calls[index]).toEqual([{ job: entry.job, mode: "execute", limit: entry.limit }, entry.jobPolicy, entry.workerPolicy ?? entry.businessPolicy]);
    expect(fake.inspect).toHaveBeenCalledWith({ maxLagMs: HOUR });
    expect(tick).toMatchObject({ inspection: "ok", alarms: [] }); expect(tick.jobs.every(job => job.state === "completed")).toBe(true);
  });
  it("keeps going past jobs that are not due, failed or unavailable, and forwards alarms", async () => {
    const fake = runtime(async request => {
      if (request.job === "OUTBOX_DELIVERY") return { job: request.job, mode: request.mode, state: "cooldown", cooldownMs: 1000, counts: {} };
      if (request.job === "OUTBOX_BUSINESS") throw appError("PROVIDER_UNAVAILABLE");
      return { job: request.job, mode: request.mode, state: request.job === "PAYMENT_RECONCILIATION" ? "failed" : "busy", counts: {} };
    }, [{ code: "PAYMENT_RECONCILIATION_LAG" }]);
    const tick = await runJobScheduleTick(fake, production);
    expect(fake.run).toHaveBeenCalledTimes(production.entries.length);
    expect(tick.jobs.slice(0, 4).map(job => job.state)).toEqual(["cooldown", "unavailable", "busy", "failed"]);
    expect(tick.alarms).toEqual([{ code: "PAYMENT_RECONCILIATION_LAG" }]);
  });
  it("reports unavailable monitoring without losing the job results", async () => {
    const fake = runtime(async request => ({ job: request.job, mode: request.mode, state: "completed", counts: {} }));
    fake.inspect.mockRejectedValueOnce(appError("PROVIDER_UNAVAILABLE"));
    const tick = await runJobScheduleTick(fake, production);
    expect(tick).toMatchObject({ inspection: "unavailable", alarms: [] }); expect(tick.jobs).toHaveLength(production.entries.length);
  });
});
