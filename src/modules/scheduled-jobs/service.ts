import { randomUUID } from "node:crypto";
import type { BoundDatabaseService } from "@/modules/database-binding/service";
import { appError } from "@/modules/shared/errors";
import type { PrismaScheduledJobRepository, ScheduledJobErrorCategory, ScheduledJobProjection, ScheduledJobRunSummary, ScheduledJobStatus } from "./repository";

export type ScheduledJobServiceOptions = Readonly<{
  bound: Pick<BoundDatabaseService, "run">;
  repository: PrismaScheduledJobRepository;
}>;

export type ScheduledJobRunLease = Readonly<{ jobKey: string; leaseId: string; leaseExpiresAt: Date }>;

export class ScheduledJobService {
  private readonly bound: ScheduledJobServiceOptions["bound"];
  private readonly repository: ScheduledJobServiceOptions["repository"];
  constructor(options: ScheduledJobServiceOptions) { this.bound = options.bound; this.repository = options.repository; }

  async acquire(jobKey: string, leaseMs: number): Promise<ScheduledJobRunLease> {
    if (!Number.isSafeInteger(leaseMs) || leaseMs < 1 || leaseMs > 2_147_483_647) throw appError("VALIDATION_ERROR");
    const leaseId = randomUUID();
    const result = await this.bound.run("job", tx => this.repository.acquire(tx, { jobKey, leaseId, leaseMs }));
    if (!result.acquired) {
      const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      throw appError("RESOURCE_BUSY", { details: { retryAfterSeconds: String(retryAfterSeconds) } });
    }
    return { jobKey, leaseId, leaseExpiresAt: result.leaseExpiresAt };
  }

  async finish(lease: ScheduledJobRunLease, input: Readonly<{
    status: Exclude<ScheduledJobStatus, "IDLE" | "RUNNING">;
    summary: ScheduledJobRunSummary; errorCategory: ScheduledJobErrorCategory | null;
    lagMs: number | null; cooldownMs?: number;
  }>): Promise<void> {
    const updated = await this.bound.run("job", tx => this.repository.finish(tx, { ...lease, ...input }));
    if (!updated) throw appError("RESOURCE_BUSY");
  }

  async status(jobKey: string): Promise<Readonly<{ state: ScheduledJobProjection | null; checkedAt: Date }>> {
    return this.bound.run("job", async tx => ({ state: await this.repository.find(tx, jobKey), checkedAt: await this.repository.readNow(tx) }));
  }
}
