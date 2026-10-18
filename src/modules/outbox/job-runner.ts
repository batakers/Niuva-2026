import { z } from "zod";
import type { BoundDatabaseService } from "@/modules/database-binding/service";
import { isAppError } from "@/modules/shared/errors";
import type { ScheduledJobService } from "@/modules/scheduled-jobs/service";
import type { ScheduledJobRunSummary, ScheduledJobStatus } from "@/modules/scheduled-jobs/repository";
import type { DurableOutboxWorker } from "./worker";
import { parseWorkerRequest, type WorkerRequest, type WorkerSummary } from "./worker-core";
import type { PrismaOutboxWorkerRepository } from "./worker-repository";

const JOB_KEY = "customer-outbox";
const publicSummarySchema = z.strictObject({
  mode: z.enum(["dry-run", "execute"]), limit: z.number().int().min(1).max(100),
  scanned: z.number().int().nonnegative(), claimed: z.number().int().nonnegative(),
  accepted: z.number().int().nonnegative(), retried: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(), unknown: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(), expired: z.number().int().nonnegative(),
  lostLease: z.number().int().nonnegative(), cooldownMs: z.number().int().nonnegative(),
});

function safeSummary(summary: WorkerSummary): ScheduledJobRunSummary {
  const parsed = publicSummarySchema.parse(summary);
  return parsed;
}

function errorCategory(error: unknown): "VALIDATION_ERROR" | "PROVIDER_UNAVAILABLE" | "RESOURCE_BUSY" | "UNKNOWN" {
  if (!isAppError(error)) return "UNKNOWN";
  return error.code === "VALIDATION_ERROR" || error.code === "PROVIDER_UNAVAILABLE" || error.code === "RESOURCE_BUSY"
    ? error.code : "UNKNOWN";
}

export type CustomerOutboxJobRunnerOptions = Readonly<{
  bound: Pick<BoundDatabaseService, "run">;
  worker: Pick<DurableOutboxWorker, "run">;
  workerRepository: PrismaOutboxWorkerRepository;
  scheduledJobs: ScheduledJobService;
  policy: Readonly<{ leaseMs: number; sendTimeoutMs: number }>;
}>;

export class CustomerOutboxJobRunner {
  private readonly bound: CustomerOutboxJobRunnerOptions["bound"];
  private readonly worker: CustomerOutboxJobRunnerOptions["worker"];
  private readonly workerRepository: CustomerOutboxJobRunnerOptions["workerRepository"];
  private readonly scheduledJobs: CustomerOutboxJobRunnerOptions["scheduledJobs"];
  private readonly policy: CustomerOutboxJobRunnerOptions["policy"];

  constructor(options: CustomerOutboxJobRunnerOptions) {
    this.bound = options.bound; this.worker = options.worker;
    this.workerRepository = options.workerRepository; this.scheduledJobs = options.scheduledJobs;
    this.policy = Object.freeze({ ...options.policy });
  }

  private async currentLagMs(): Promise<number> {
    return this.bound.run("job", async tx => {
      const now = await this.workerRepository.now(tx);
      const oldest = (await this.workerRepository.candidates(tx, now, 1, false))[0];
      return oldest ? Math.min(2_147_483_647, Math.max(0, now.getTime() - oldest.dueAt.getTime())) : 0;
    });
  }

  async status() {
    const [operational, lagMs] = await Promise.all([
      this.scheduledJobs.status(JOB_KEY),
      this.currentLagMs(),
    ]);
    return { jobKey: JOB_KEY, ...operational, lagMs };
  }

  async run(raw: unknown): Promise<Readonly<{ summary: WorkerSummary; status: Awaited<ReturnType<CustomerOutboxJobRunner["status"]>> }>> {
    const request: WorkerRequest = parseWorkerRequest(raw);
    if (request.mode === "dry-run") return { summary: await this.worker.run(request), status: await this.status() };

    const leaseMs = request.limit * (this.policy.sendTimeoutMs + 5_000) + this.policy.leaseMs;
    const lease = await this.scheduledJobs.acquire(JOB_KEY, leaseMs);
    let summary: WorkerSummary;
    try {
      summary = await this.worker.run(request);
    } catch (error) {
      try {
        await this.scheduledJobs.finish(lease, {
          status: "FAILED", summary: {}, errorCategory: errorCategory(error),
          lagMs: await this.currentLagMs(),
        });
      } catch {
        // The expired lease remains visible as RUNNING until another run can safely reclaim it.
      }
      throw error;
    }

    const status: Exclude<ScheduledJobStatus, "IDLE" | "RUNNING"> = summary.failed + summary.unknown > 0 ? "PARTIAL_FAILURE" : "SUCCEEDED";
    await this.scheduledJobs.finish(lease, {
      status, summary: safeSummary(summary), errorCategory: status === "SUCCEEDED" ? null : "PROVIDER_UNAVAILABLE",
      lagMs: await this.currentLagMs(), cooldownMs: summary.cooldownMs,
    });
    return { summary, status: await this.status() };
  }
}

export const CUSTOMER_OUTBOX_JOB_REQUEST_LIMIT = 10;
export const CUSTOMER_OUTBOX_JOB_KEY = JOB_KEY;
