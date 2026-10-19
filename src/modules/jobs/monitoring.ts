import { z } from "zod";
import { expiredReservationBacklog } from "../inventory/repository";
import { fileRetentionBacklog } from "../files/retention-repository";
import type { BoundDatabaseService } from "../database-binding/service";
import { appError } from "../shared/errors";
import { jobNameSchema, parseJobResult, parseJobRole, type JobName, type JobResult } from "./core";
import type { PrismaJobRepository } from "./repository";

const inspectionSchema = z.strictObject({ maxLagMs: z.number().int().min(1).max(2147483647) });
export type JobInspectionRequest = z.infer<typeof inspectionSchema>;
export function parseJobInspectionRequest(raw: unknown): JobInspectionRequest { const value = inspectionSchema.safeParse(raw); if (!value.success) throw appError("VALIDATION_ERROR"); return value.data; }
export type JobAlarm = { code: "JOB_NEVER_RUN" | "JOB_STALE_LEASE" | "JOB_LAG" | "JOB_FAILED" | "JOB_INVALID_STATE" | "OUTBOX_UNKNOWN" | "OUTBOX_STALE_LEASE" | "OUTBOX_LAG" | "OUTBOX_EXPIRED" | "PRIVACY_OVERDUE" | "PRIVACY_HOLD_OVERDUE" | "INVENTORY_LAG" | "FILE_DELETION_LAG" | "FILE_DELETE_FAILED" | "FILE_HOLD_OVERDUE"; job?: JobName };
export type JobInspection = {
  checkedAt: string;
  jobs: { name: JobName; state: "never-run" | "running" | "stale-lease" | "failed" | "idle"; lastStartedAt: string | null; lastFinishedAt: string | null; lastSuccessAt: string | null; successLagMs: number | null; cooldownUntil: string | null; counts: JobResult["counts"] }[];
  outbox: { pending: number; leased: number; failed: number; unknown: number; expiredPending: number; staleLeases: number; dueLagMs: number };
  privacy: { overdue: number; overdueHolds: number };
  inventory: { remainingDue: number; lagMs: number };
  files: { pendingDeletion: number; failedDeletion: number; held: number; overdueHolds: number; oldestPendingLagMs: number };
  alarms: JobAlarm[];
};
export class JobMonitoring {
  private readonly expectedRole: string;
  constructor(private readonly bound: Pick<BoundDatabaseService, "run">, private readonly repository: PrismaJobRepository, expectedRole: string) { this.expectedRole = parseJobRole(expectedRole); }
  async inspect(raw: unknown): Promise<JobInspection> {
    const request = parseJobInspectionRequest(raw);
    try { return await this.bound.run("job", async tx => {
      await this.repository.assertRole(tx, this.expectedRole);
      const now = await this.repository.now(tx), alarms: JobAlarm[] = [];
      const rows = await tx.operationalJobState.findMany({ where: { name: { in: [...jobNameSchema.options] } } });
      const jobs: JobInspection["jobs"] = jobNameSchema.options.map(name => {
        const row = rows.find(value => value.name === name), successLagMs = row?.lastSuccessAt ? Math.max(0, now.getTime() - row.lastSuccessAt.getTime()) : null;
        let counts: JobResult["counts"] = {};
        try { counts = parseJobResult({ counts: row?.counters ?? {} }).counts; } catch { alarms.push({ code: "JOB_INVALID_STATE", job: name }); }
        if (!row?.lastStartedAt) alarms.push({ code: "JOB_NEVER_RUN", job: name });
        if (row?.leaseId && row.leaseExpiresAt && row.leaseExpiresAt <= now) alarms.push({ code: "JOB_STALE_LEASE", job: name });
        if (row?.lastFailureCategory) alarms.push({ code: "JOB_FAILED", job: name });
        if (successLagMs !== null && successLagMs > request.maxLagMs || row?.lastStartedAt && successLagMs === null && now.getTime() - row.lastStartedAt.getTime() > request.maxLagMs) alarms.push({ code: "JOB_LAG", job: name });
        return { name, state: !row?.lastStartedAt ? "never-run" : row.leaseId ? row.leaseExpiresAt && row.leaseExpiresAt > now ? "running" : "stale-lease" : row.lastFailureCategory ? "failed" : "idle", lastStartedAt: row?.lastStartedAt?.toISOString() ?? null, lastFinishedAt: row?.lastFinishedAt?.toISOString() ?? null, lastSuccessAt: row?.lastSuccessAt?.toISOString() ?? null, successLagMs, cooldownUntil: row?.cooldownUntil?.toISOString() ?? null, counts };
      });
      const pending = await tx.durableOutboxMessage.count({ where: { state: "PENDING" } });
      const leased = await tx.durableOutboxMessage.count({ where: { state: "LEASED" } });
      const failed = await tx.durableOutboxMessage.count({ where: { state: "FAILED" } });
      const unknown = await tx.durableOutboxMessage.count({ where: { state: "FAILED", failureCategory: "OUTCOME_UNKNOWN" } });
      const expiredPending = await tx.durableOutboxMessage.count({ where: { state: { in: ["PENDING", "LEASED"] }, expiresAt: { lte: now } } });
      const staleLeases = await tx.durableOutboxMessage.count({ where: { state: "LEASED", leaseExpiresAt: { lte: now } } });
      const oldest = await tx.durableOutboxMessage.findFirst({ where: { state: "PENDING", dueAt: { lte: now }, expiresAt: { gt: now } }, orderBy: { dueAt: "asc" }, select: { dueAt: true } });
      const dueLagMs = oldest ? Math.max(0, now.getTime() - oldest.dueAt.getTime()) : 0;
      const overdue = await tx.customerPrivacyRequest.count({ where: { resolvedAt: null, dueAt: { lte: now } } });
      const overdueHolds = await tx.customerPrivacyRequest.count({ where: { holdCategory: { not: null }, holdReviewAt: { lte: now } } });
      if (unknown > 0) alarms.push({ code: "OUTBOX_UNKNOWN" });
      if (staleLeases > 0) alarms.push({ code: "OUTBOX_STALE_LEASE" });
      if (dueLagMs > request.maxLagMs) alarms.push({ code: "OUTBOX_LAG" });
      if (expiredPending > 0) alarms.push({ code: "OUTBOX_EXPIRED" });
      if (overdue > 0) alarms.push({ code: "PRIVACY_OVERDUE" });
      if (overdueHolds > 0) alarms.push({ code: "PRIVACY_HOLD_OVERDUE" });
      const inventory = await expiredReservationBacklog(tx, now);
      if (inventory.lagMs > request.maxLagMs) alarms.push({ code: "INVENTORY_LAG" });
      const files = await fileRetentionBacklog(tx, now);
      if (files.oldestPendingLagMs > request.maxLagMs) alarms.push({ code: "FILE_DELETION_LAG" });
      if (files.failedDeletion > 0) alarms.push({ code: "FILE_DELETE_FAILED" });
      if (files.overdueHolds > 0) alarms.push({ code: "FILE_HOLD_OVERDUE" });
      return { checkedAt: now.toISOString(), jobs, inventory, files, outbox: { pending, leased, failed, unknown, expiredPending, staleLeases, dueLagMs }, privacy: { overdue, overdueHolds }, alarms };
    }); } catch { throw appError("PROVIDER_UNAVAILABLE"); }
  }
}
