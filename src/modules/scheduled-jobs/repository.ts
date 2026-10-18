import { Prisma, type Prisma as PrismaTypes, type ScheduledJobState } from "@/generated/prisma/client";

export type ScheduledJobStatus = "IDLE" | "RUNNING" | "SUCCEEDED" | "PARTIAL_FAILURE" | "FAILED";
export type ScheduledJobErrorCategory = "VALIDATION_ERROR" | "PROVIDER_UNAVAILABLE" | "RESOURCE_BUSY" | "UNKNOWN";
export type ScheduledJobProjection = Pick<ScheduledJobState,
  "jobKey" | "status" | "cooldownUntil" | "lastStartedAt" | "lastFinishedAt" | "lastSuccessAt" |
  "lastFailureAt" | "lastErrorCategory" | "lastSummary" | "lastLagMs" | "leaseExpiresAt">;
export type ScheduledJobRunSummary = Readonly<Record<string, string | number | boolean | null>>;
export type ScheduledJobAcquire = Readonly<{ acquired: true; leaseId: string; leaseExpiresAt: Date }> | Readonly<{ acquired: false; state: ScheduledJobProjection; retryAfterMs: number }>;

async function databaseNow(tx: PrismaTypes.TransactionClient): Promise<Date> {
  const rows = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
  const now = rows[0]?.now;
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Scheduled job clock unavailable.");
  return now;
}

function projection(row: ScheduledJobState): ScheduledJobProjection {
  return {
    jobKey: row.jobKey, status: row.status, cooldownUntil: row.cooldownUntil,
    lastStartedAt: row.lastStartedAt, lastFinishedAt: row.lastFinishedAt,
    lastSuccessAt: row.lastSuccessAt, lastFailureAt: row.lastFailureAt,
    lastErrorCategory: row.lastErrorCategory, lastSummary: row.lastSummary,
    lastLagMs: row.lastLagMs, leaseExpiresAt: row.leaseExpiresAt,
  };
}

export class PrismaScheduledJobRepository {
  async acquire(tx: PrismaTypes.TransactionClient, input: Readonly<{ jobKey: string; leaseId: string; leaseMs: number }>): Promise<ScheduledJobAcquire> {
    await tx.scheduledJobState.createMany({ data: [{ jobKey: input.jobKey }], skipDuplicates: true });
    await tx.$queryRaw`SELECT job_key FROM scheduled_job_states WHERE job_key = ${input.jobKey} FOR UPDATE`;
    const now = await databaseNow(tx);
    const current = await tx.scheduledJobState.findUniqueOrThrow({ where: { jobKey: input.jobKey } });
    if (current.leaseId && current.leaseExpiresAt && current.leaseExpiresAt > now) {
      return { acquired: false, state: projection(current), retryAfterMs: current.leaseExpiresAt.getTime() - now.getTime() };
    }
    if (current.cooldownUntil && current.cooldownUntil > now) {
      return { acquired: false, state: projection(current), retryAfterMs: current.cooldownUntil.getTime() - now.getTime() };
    }
    const leaseExpiresAt = new Date(now.getTime() + input.leaseMs);
    await tx.scheduledJobState.update({ where: { jobKey: input.jobKey }, data: {
      status: "RUNNING", leaseId: input.leaseId, leaseExpiresAt,
      lastStartedAt: now, lastErrorCategory: null, lastSummary: Prisma.DbNull,
      lastLagMs: null, cooldownUntil: null,
    } });
    return { acquired: true, leaseId: input.leaseId, leaseExpiresAt };
  }

  async finish(tx: PrismaTypes.TransactionClient, input: Readonly<{
    jobKey: string; leaseId: string; status: Exclude<ScheduledJobStatus, "IDLE" | "RUNNING">;
    summary: ScheduledJobRunSummary; errorCategory: ScheduledJobErrorCategory | null;
    lagMs: number | null; cooldownMs?: number;
  }>): Promise<boolean> {
    const now = await databaseNow(tx);
    const success = input.status === "SUCCEEDED";
    const cooldownUntil = input.cooldownMs && input.cooldownMs > 0 ? new Date(now.getTime() + input.cooldownMs) : null;
    const result = await tx.scheduledJobState.updateMany({
      where: { jobKey: input.jobKey, status: "RUNNING", leaseId: input.leaseId },
      data: {
        status: input.status, leaseId: null, leaseExpiresAt: null,
        lastFinishedAt: now, lastErrorCategory: input.errorCategory,
        lastSummary: input.summary as PrismaTypes.InputJsonValue,
        lastLagMs: input.lagMs,
        cooldownUntil,
        ...(success ? { lastSuccessAt: now } : { lastFailureAt: now }),
      },
    });
    return result.count === 1;
  }

  async find(tx: PrismaTypes.TransactionClient, jobKey: string): Promise<ScheduledJobProjection | null> {
    const row = await tx.scheduledJobState.findUnique({ where: { jobKey } });
    return row ? projection(row) : null;
  }

  async readNow(tx: PrismaTypes.TransactionClient): Promise<Date> {
    return databaseNow(tx);
  }
}
