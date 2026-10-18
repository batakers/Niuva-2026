import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import type { BoundDatabaseService } from "@/modules/database-binding/service";
import { appError } from "@/modules/shared/errors";
import { ScheduledJobService } from "@/modules/scheduled-jobs/service";
import type { PrismaScheduledJobRepository } from "@/modules/scheduled-jobs/repository";
import type { DurableOutboxWorker } from "@/modules/outbox/worker";
import type { PrismaOutboxWorkerRepository } from "@/modules/outbox/worker-repository";
import { CustomerOutboxJobRunner } from "@/modules/outbox/job-runner";

const now = new Date("2026-10-18T10:00:00.000Z");
const baseSummary = {
  mode: "execute" as const, limit: 2, scanned: 1, claimed: 1, accepted: 1,
  retried: 0, failed: 0, unknown: 0, cancelled: 0, expired: 0, lostLease: 0, cooldownMs: 0,
};

describe("customer outbox job runner", () => {
  let repository: {
    acquire: ReturnType<typeof vi.fn>; finish: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>; readNow: ReturnType<typeof vi.fn>;
  };
  let workerRepository: { now: ReturnType<typeof vi.fn>; candidates: ReturnType<typeof vi.fn> };
  let worker: { run: ReturnType<typeof vi.fn> };
  let runner: CustomerOutboxJobRunner;

  beforeEach(() => {
    repository = {
      acquire: vi.fn(async (_tx: Prisma.TransactionClient, input: { leaseId: string }) => ({ acquired: true, leaseId: input.leaseId, leaseExpiresAt: new Date(now.getTime() + 30_000) })),
      finish: vi.fn(async () => true),
      find: vi.fn(async () => ({ jobKey: "customer-outbox", status: "SUCCEEDED", cooldownUntil: null, lastStartedAt: now, lastFinishedAt: now, lastSuccessAt: now, lastFailureAt: null, lastErrorCategory: null, lastSummary: baseSummary, lastLagMs: 0, leaseExpiresAt: null })),
      readNow: vi.fn(async () => now),
    };
    workerRepository = {
      now: vi.fn(async () => now),
      candidates: vi.fn(async () => []),
    };
    worker = { run: vi.fn(async () => baseSummary) };
    const bound: Pick<BoundDatabaseService, "run"> = {
      async run<T>(_operation: "outbox" | "job", work: (tx: Prisma.TransactionClient) => Promise<T>) {
        return work({} as Prisma.TransactionClient);
      },
    };
    const scheduledJobs = new ScheduledJobService({ bound, repository: repository as unknown as PrismaScheduledJobRepository });
    runner = new CustomerOutboxJobRunner({
      bound, scheduledJobs, worker: worker as unknown as DurableOutboxWorker,
      workerRepository: workerRepository as unknown as PrismaOutboxWorkerRepository,
      policy: { leaseMs: 60_000, sendTimeoutMs: 10_000 },
    });
  });

  it("keeps dry-run outside the job lease and persisted state", async () => {
    worker.run.mockResolvedValue({ ...baseSummary, mode: "dry-run", scanned: 1 });
    const result = await runner.run({ mode: "dry-run", limit: 2 });
    expect(result.summary.mode).toBe("dry-run");
    expect(repository.acquire).not.toHaveBeenCalled();
    expect(repository.finish).not.toHaveBeenCalled();
    expect(workerRepository.candidates).toHaveBeenCalled();
  });

  it("persists safe counters, lag, and cooldown for an execute run", async () => {
    workerRepository.candidates.mockResolvedValue([{ dueAt: new Date(now.getTime() - 2_500) }]);
    worker.run.mockResolvedValue({ ...baseSummary, retried: 1, accepted: 0, cooldownMs: 15_000 });
    const result = await runner.run({ mode: "execute", limit: 2 });
    expect(result.summary.retried).toBe(1);
    expect(repository.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: "SUCCEEDED", lagMs: 2_500, cooldownMs: 15_000,
      summary: expect.objectContaining({ retried: 1, cooldownMs: 15_000 }),
    }));
  });

  it("marks unknown delivery outcomes partial and never schedules a blind resend", async () => {
    worker.run.mockResolvedValue({ ...baseSummary, accepted: 0, failed: 1, unknown: 1 });
    await runner.run({ mode: "execute", limit: 2 });
    expect(repository.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: "PARTIAL_FAILURE", errorCategory: "PROVIDER_UNAVAILABLE",
    }));
  });

  it("stores only a safe error category when a run fails", async () => {
    worker.run.mockRejectedValue(appError("PROVIDER_UNAVAILABLE", { message: "synthetic token must not persist" }));
    await expect(runner.run({ mode: "execute", limit: 2 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(repository.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: "FAILED", errorCategory: "PROVIDER_UNAVAILABLE", summary: {},
    }));
    expect(JSON.stringify(repository.finish.mock.calls)).not.toContain("synthetic token");
  });
});
