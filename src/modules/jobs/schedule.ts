import { z } from "zod";
import type { DeploymentTier } from "@/lib/env/deployment";
import { parseBusinessPolicy, type BusinessPolicy } from "../outbox/business-core";
import { parseWorkerPolicy, type WorkerPolicy } from "../outbox/worker-core";
import { appError } from "../shared/errors";
import { parseJobPolicy, parseJobRequest, type JobName, type JobPolicy, type JobRunSummary } from "./core";
import { parseJobInspectionRequest, type JobAlarm, type JobInspectionRequest } from "./monitoring";
import type { OperationalJobRuntime } from "./runtime";

export type JobScheduleEntry = Readonly<{ job: JobName; limit: number; jobPolicy: JobPolicy; workerPolicy?: WorkerPolicy; businessPolicy?: BusinessPolicy }>;
export type JobSchedule = Readonly<{ instruction: string; decidedOn: string; inspection: JobInspectionRequest; entries: readonly JobScheduleEntry[] }>;
export type JobScheduleTick = { jobs: { job: JobName; state: JobRunSummary["state"] | "unavailable"; counts: JobRunSummary["counts"] }[]; inspection: "ok" | "unavailable"; alarms: JobAlarm[] };

const entrySchema = z.strictObject({ job: z.unknown(), limit: z.unknown(), jobPolicy: z.unknown(), workerPolicy: z.unknown().optional(), businessPolicy: z.unknown().optional() });
const scheduleSchema = z.strictObject({ instruction: z.string().trim().min(1), decidedOn: z.iso.date(), inspection: z.unknown(), entries: z.array(entrySchema).min(1) });
// Same ceiling as the HTTP job adapter: provider-bound jobs stay at 10 per run.
const BOUNDED_JOBS: readonly JobName[] = ["OUTBOX_DELIVERY", "OUTBOX_BUSINESS", "CUSTOMER_FILE_RETENTION", "PAYMENT_RECONCILIATION", "REFUND_RECONCILIATION"];

/** Validates a schedule with the runner's own parsers; every job appears at most once and no value is defaulted. */
export function parseJobSchedule(raw: unknown): JobSchedule {
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) throw appError("VALIDATION_ERROR");
  const entries = parsed.data.entries.map((value): JobScheduleEntry => {
    const request = parseJobRequest({ job: value.job, mode: "execute", limit: value.limit });
    const needsWorker = request.job === "OUTBOX_DELIVERY", needsBusiness = request.job === "OUTBOX_BUSINESS";
    if (needsWorker !== (value.workerPolicy !== undefined) || needsBusiness !== (value.businessPolicy !== undefined) || BOUNDED_JOBS.includes(request.job) && request.limit > 10) throw appError("VALIDATION_ERROR");
    return Object.freeze({ job: request.job, limit: request.limit, jobPolicy: parseJobPolicy(value.jobPolicy),
      ...(needsWorker ? { workerPolicy: parseWorkerPolicy(value.workerPolicy) } : {}), ...(needsBusiness ? { businessPolicy: parseBusinessPolicy(value.businessPolicy) } : {}) });
  });
  if (new Set(entries.map(entry => entry.job)).size !== entries.length) throw appError("VALIDATION_ERROR");
  return Object.freeze({ instruction: parsed.data.instruction, decidedOn: parsed.data.decidedOn, inspection: Object.freeze(parseJobInspectionRequest(parsed.data.inspection)), entries: Object.freeze(entries) });
}

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
// The VPS timer ticks once a minute. A run waits its cadence minus half a tick,
// so a run that finishes a few seconds after its tick is still due on time.
const every = (cadenceMs: number) => cadenceMs - MINUTE / 2;
const policy = (cadenceMs: number) => ({ leaseMs: MINUTE, minIntervalMs: every(cadenceMs), failureCooldownMs: Math.min(every(cadenceMs), every(5 * MINUTE)) });

/**
 * Scheduled operational jobs per tier, from the Owner's Q14 decision of
 * 30 October 2026. A schedule is a reviewed source change, never an env value.
 * Staging stays on manual triggers (E9); production runs only after its
 * activation (T40), because its capability grants are empty until then.
 */
export const JOB_SCHEDULES: Readonly<Record<DeploymentTier, JobSchedule | null>> = Object.freeze({
  "local-test": null,
  staging: null,
  production: parseJobSchedule({
    instruction: "TASKS.md#keputusan-owner-paket-q", decidedOn: "2026-10-30", inspection: { maxLagMs: HOUR },
    entries: [
      { job: "OUTBOX_DELIVERY", limit: 10, jobPolicy: policy(MINUTE), workerPolicy: { leaseMs: 10_000, sendTimeoutMs: 5_000, retryDelaysMs: [], runBudgetMs: 20_000 } },
      { job: "OUTBOX_BUSINESS", limit: 10, jobPolicy: policy(MINUTE), businessPolicy: { maxAgeMs: DAY, runBudgetMs: 20_000 } },
      { job: "INVENTORY_RESERVATIONS", limit: 100, jobPolicy: policy(5 * MINUTE) },
      { job: "PAYMENT_RECONCILIATION", limit: 10, jobPolicy: policy(15 * MINUTE) },
      { job: "OUTBOX_EXPIRY", limit: 100, jobPolicy: policy(15 * MINUTE) },
      { job: "REFUND_RECONCILIATION", limit: 10, jobPolicy: policy(HOUR) },
      { job: "CUSTOMER_FILE_RETENTION", limit: 10, jobPolicy: policy(DAY) },
      { job: "CUSTOMER_AUTH_CLEANUP", limit: 100, jobPolicy: policy(DAY) },
      { job: "CUSTOMER_PRIVACY_CLEANUP", limit: 100, jobPolicy: policy(DAY) },
    ],
  }),
});

/**
 * One scheduler tick: each entry runs in order through the canonical runner, whose
 * persisted lease and cooldown decide whether it is due (`busy`/`cooldown` mean not
 * yet). One failing job does not stop the others. Only safe states, counters and
 * alarm codes are returned.
 */
export async function runJobScheduleTick(runtime: OperationalJobRuntime, schedule: JobSchedule): Promise<JobScheduleTick> {
  const jobs: JobScheduleTick["jobs"] = [];
  for (const entry of schedule.entries) {
    try {
      const result = await runtime.run(parseJobRequest({ job: entry.job, mode: "execute", limit: entry.limit }), entry.jobPolicy, entry.workerPolicy ?? entry.businessPolicy);
      jobs.push({ job: entry.job, state: result.state, counts: result.counts });
    } catch { jobs.push({ job: entry.job, state: "unavailable", counts: {} }); }
  }
  try { return { jobs, inspection: "ok", alarms: (await runtime.inspect(schedule.inspection)).alarms }; }
  catch { return { jobs, inspection: "unavailable", alarms: [] }; }
}
