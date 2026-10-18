import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import type { BoundDatabaseService } from "@/modules/database-binding/service";
import { appError } from "@/modules/shared/errors";
import type { InventoryService } from "@/modules/inventory/service";
import {
  INVENTORY_RESERVATION_JOB_KEY,
  InventoryReservationJobRunner,
} from "@/modules/inventory/reservation-job";
import type { PrismaScheduledJobRepository } from "@/modules/scheduled-jobs/repository";
import { ScheduledJobService } from "@/modules/scheduled-jobs/service";

const now = new Date("2026-10-18T10:00:00.000Z");
const expiredAt = new Date(now.getTime() - 5_000);

describe("inventory reservation job runner", () => {
  let scheduledRepository: {
    acquire: ReturnType<typeof vi.fn>;
    finish: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    readNow: ReturnType<typeof vi.fn>;
  };
  let reservations: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  let inventory: { releaseExpired: ReturnType<typeof vi.fn> };
  let runner: InventoryReservationJobRunner;

  beforeEach(() => {
    scheduledRepository = {
      acquire: vi.fn(async (_tx: Prisma.TransactionClient, input: { leaseId: string }) => ({
        acquired: true,
        leaseId: input.leaseId,
        leaseExpiresAt: new Date(now.getTime() + 300_000),
      })),
      finish: vi.fn(async () => true),
      find: vi.fn(async () => null),
      readNow: vi.fn(async () => now),
    };
    reservations = {
      findMany: vi.fn(async () => [{ id: "reservation-1" }, { id: "reservation-2" }, { id: "reservation-3" }]),
      count: vi.fn(async () => 3),
      findFirst: vi.fn(async () => ({ expiresAt: expiredAt })),
    };
    const transaction = { stockReservation: reservations } as unknown as Prisma.TransactionClient;
    const bound: Pick<BoundDatabaseService, "run"> = {
      async run<T>(_operation: "outbox" | "job", work: (tx: Prisma.TransactionClient) => Promise<T>) {
        return work(transaction);
      },
    };
    const scheduledJobs = new ScheduledJobService({
      bound,
      repository: scheduledRepository as unknown as PrismaScheduledJobRepository,
    });
    inventory = {
      releaseExpired: vi.fn(async () => [{ id: "reservation-1" }, { id: "reservation-2" }]),
    };
    runner = new InventoryReservationJobRunner({
      bound,
      inventory: inventory as unknown as Pick<InventoryService, "releaseExpired">,
      scheduledJobRepository: scheduledRepository as unknown as PrismaScheduledJobRepository,
      scheduledJobs,
    });
  });

  it("keeps dry-run outside the job lease and inventory mutations", async () => {
    const result = await runner.run({ mode: "dry-run", limit: 2 });

    expect(result.summary).toMatchObject({ mode: "dry-run", limit: 2, eligible: 2, released: 0, remainingDue: 3 });
    expect(result.status).toMatchObject({ jobKey: INVENTORY_RESERVATION_JOB_KEY, lagMs: 5_000, remainingDue: 3 });
    expect(scheduledRepository.acquire).not.toHaveBeenCalled();
    expect(scheduledRepository.finish).not.toHaveBeenCalled();
    expect(inventory.releaseExpired).not.toHaveBeenCalled();
  });

  it("leases the job, releases only the requested batch, and records safe status", async () => {
    reservations.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValue(1);
    inventory.releaseExpired.mockResolvedValue([{ id: "reservation-1" }, { id: "reservation-2" }]);

    const result = await runner.run({ mode: "execute", limit: 2 });

    expect(scheduledRepository.acquire).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      jobKey: INVENTORY_RESERVATION_JOB_KEY,
      leaseMs: 300_000,
    }));
    expect(inventory.releaseExpired).toHaveBeenCalledWith(undefined, now, 2);
    expect(result.summary).toMatchObject({ mode: "execute", limit: 2, eligible: 2, released: 2, remainingDue: 1 });
    expect(scheduledRepository.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      jobKey: INVENTORY_RESERVATION_JOB_KEY,
      status: "SUCCEEDED",
      errorCategory: null,
      lagMs: 5_000,
      summary: { mode: "execute", limit: 2, eligible: 2, released: 2, remainingDue: 1 },
    }));
  });

  it("stores a safe failed status and rethrows when the inventory operation fails", async () => {
    inventory.releaseExpired.mockRejectedValue(appError("PROVIDER_UNAVAILABLE", { message: "synthetic detail" }));

    await expect(runner.run({ mode: "execute", limit: 2 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(scheduledRepository.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: "FAILED",
      errorCategory: "PROVIDER_UNAVAILABLE",
      summary: {},
    }));
    expect(JSON.stringify(scheduledRepository.finish.mock.calls)).not.toContain("synthetic detail");
  });

  it("rejects an invalid request as a validation error", async () => {
    await expect(runner.run({ mode: "execute", limit: 101 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(scheduledRepository.acquire).not.toHaveBeenCalled();
    expect(inventory.releaseExpired).not.toHaveBeenCalled();
  });
});
