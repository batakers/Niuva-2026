import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { PrismaScheduledJobRepository } from "@/modules/scheduled-jobs/repository";

const prisma = getPrismaClient();
const repository = new PrismaScheduledJobRepository();
const jobKeys: string[] = [];

afterAll(async () => {
  if (jobKeys.length) await prisma.scheduledJobState.deleteMany({ where: { jobKey: { in: jobKeys } } });
});

describe("scheduled job state", () => {
  it("serializes overlapping runs and fences stale completion", async () => {
    const jobKey = "customer-file-retention";
    jobKeys.push(jobKey);
    const leaseIds = [randomUUID(), randomUUID()];
    const acquisitions = await Promise.all(leaseIds.map(leaseId => prisma.$transaction(tx => repository.acquire(tx, { jobKey, leaseId, leaseMs: 60_000 }))));
    const acquired = acquisitions.filter((item): item is Extract<typeof item, { acquired: true }> => item.acquired);
    const denied = acquisitions.filter(item => !item.acquired);
    expect(acquired).toHaveLength(1);
    expect(denied).toHaveLength(1);

    const staleLease = leaseIds.find(id => id !== acquired[0].leaseId)!;
    expect(await prisma.$transaction(tx => repository.finish(tx, {
      jobKey, leaseId: staleLease, status: "SUCCEEDED", summary: { accepted: 99 },
      errorCategory: null, lagMs: 0,
    }))).toBe(false);
    expect(await prisma.$transaction(tx => repository.finish(tx, {
      jobKey, leaseId: acquired[0].leaseId, status: "SUCCEEDED", summary: { accepted: 1 },
      errorCategory: null, lagMs: 1200, cooldownMs: 3000,
    }))).toBe(true);

    const state = await prisma.scheduledJobState.findUniqueOrThrow({ where: { jobKey } });
    expect(state).toMatchObject({ status: "SUCCEEDED", lastLagMs: 1200, lastSummary: { accepted: 1 } });
    expect(state.lastSuccessAt).toBeInstanceOf(Date);
    expect(state.cooldownUntil?.getTime()).toBeGreaterThan(Date.now());
    const cooled = await prisma.$transaction(tx => repository.acquire(tx, { jobKey, leaseId: randomUUID(), leaseMs: 60_000 }));
    expect(cooled.acquired).toBe(false);
  });
});
