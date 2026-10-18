import { z } from "zod";
import type { BoundDatabaseService } from "@/modules/database-binding/service";
import { appError, isAppError } from "@/modules/shared/errors";
import type { PrismaScheduledJobRepository } from "@/modules/scheduled-jobs/repository";
import type { ScheduledJobService } from "@/modules/scheduled-jobs/service";
import type { InventoryService } from "./service";
import { MAX_EXPIRED_RESERVATIONS_PER_BATCH } from "./service";
import { expiredReservationWhere } from "./repository";

const JOB_KEY = "inventory-reservations";
const JOB_LEASE_MS = 5 * 60_000;

export const inventoryReservationJobRequestSchema = z.strictObject({
  mode: z.enum(["dry-run", "execute"]),
  limit: z.number().int().min(1).max(MAX_EXPIRED_RESERVATIONS_PER_BATCH),
});

const summarySchema = z.strictObject({
  mode: z.enum(["dry-run", "execute"]),
  limit: z.number().int().min(1).max(MAX_EXPIRED_RESERVATIONS_PER_BATCH),
  eligible: z.number().int().nonnegative(),
  released: z.number().int().nonnegative(),
  remainingDue: z.number().int().nonnegative(),
});

type JobSummary = z.infer<typeof summarySchema>;

function errorCategory(error: unknown): "VALIDATION_ERROR" | "PROVIDER_UNAVAILABLE" | "RESOURCE_BUSY" | "UNKNOWN" {
  if (!isAppError(error)) return "UNKNOWN";
  return error.code === "VALIDATION_ERROR" || error.code === "PROVIDER_UNAVAILABLE" || error.code === "RESOURCE_BUSY"
    ? error.code : "UNKNOWN";
}

export type InventoryReservationJobRunnerOptions = Readonly<{
  bound: Pick<BoundDatabaseService, "run">;
  inventory: Pick<InventoryService, "releaseExpired">;
  scheduledJobRepository: PrismaScheduledJobRepository;
  scheduledJobs: ScheduledJobService;
}>;

export class InventoryReservationJobRunner {
  private readonly bound: InventoryReservationJobRunnerOptions["bound"];
  private readonly inventory: InventoryReservationJobRunnerOptions["inventory"];
  private readonly scheduledJobRepository: InventoryReservationJobRunnerOptions["scheduledJobRepository"];
  private readonly scheduledJobs: InventoryReservationJobRunnerOptions["scheduledJobs"];

  constructor(options: InventoryReservationJobRunnerOptions) {
    this.bound = options.bound;
    this.inventory = options.inventory;
    this.scheduledJobRepository = options.scheduledJobRepository;
    this.scheduledJobs = options.scheduledJobs;
  }

  private async snapshot() {
    return this.bound.run("job", async (tx) => {
      const now = await this.scheduledJobRepository.readNow(tx);
      const where = expiredReservationWhere(now);
      const [candidates, remainingDue, oldest] = await Promise.all([
        tx.stockReservation.findMany({
          where,
          orderBy: [{ orderId: "asc" }, { variantId: "asc" }, { createdAt: "asc" }],
          take: MAX_EXPIRED_RESERVATIONS_PER_BATCH,
          select: { id: true },
        }),
        tx.stockReservation.count({ where }),
        tx.stockReservation.findFirst({ where, orderBy: [{ expiresAt: "asc" }, { id: "asc" }], select: { expiresAt: true } }),
      ]);
      const lagMs = oldest === null ? 0 : Math.min(2_147_483_647, Math.max(0, now.getTime() - oldest.expiresAt.getTime()));
      return { now, candidates, lagMs, remainingDue };
    });
  }

  async status() {
    const [operational, snapshot] = await Promise.all([
      this.scheduledJobs.status(JOB_KEY),
      this.snapshot(),
    ]);
    return { jobKey: JOB_KEY, ...operational, lagMs: snapshot.lagMs, remainingDue: snapshot.remainingDue };
  }

  async run(raw: unknown): Promise<Readonly<{ summary: JobSummary; status: Awaited<ReturnType<InventoryReservationJobRunner["status"]>> }>> {
    const parsed = inventoryReservationJobRequestSchema.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    const request = parsed.data;

    if (request.mode === "dry-run") {
      const snapshot = await this.snapshot();
      const summary = summarySchema.parse({
        mode: request.mode,
        limit: request.limit,
        eligible: Math.min(snapshot.candidates.length, request.limit),
        released: 0,
        remainingDue: snapshot.remainingDue,
      });
      return { summary, status: await this.status() };
    }

    const lease = await this.scheduledJobs.acquire(JOB_KEY, JOB_LEASE_MS);
    let summary: JobSummary;
    try {
      const before = await this.snapshot();
      const released = await this.inventory.releaseExpired(undefined, before.now, request.limit);
      const after = await this.snapshot();
      summary = summarySchema.parse({
        mode: request.mode,
        limit: request.limit,
        eligible: Math.min(before.candidates.length, request.limit),
        released: released.length,
        remainingDue: after.remainingDue,
      });
    } catch (error) {
      try {
        const snapshot = await this.snapshot();
        await this.scheduledJobs.finish(lease, {
          status: "FAILED", summary: {}, errorCategory: errorCategory(error), lagMs: snapshot.lagMs,
        });
      } catch {
        // Keep the active lease visible if the failure state cannot be persisted.
      }
      throw error;
    }

    await this.scheduledJobs.finish(lease, {
      status: "SUCCEEDED", summary,
      errorCategory: null, lagMs: (await this.snapshot()).lagMs,
    });
    return { summary, status: await this.status() };
  }
}

export const INVENTORY_RESERVATION_JOB_KEY = JOB_KEY;
