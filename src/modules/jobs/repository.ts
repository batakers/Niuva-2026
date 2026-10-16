import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaOutboxRepository } from "../outbox/repository";
import { appError } from "../shared/errors";
import type { JobLease, JobName, JobPolicy, JobResult } from "./core";

export class PrismaJobRepository {
  private readonly clock = new PrismaOutboxRepository();
  now(tx: Prisma.TransactionClient) { return this.clock.now(tx); }
  async assertRole(tx: Prisma.TransactionClient, expectedRole: string): Promise<void> {
    const rows = await tx.$queryRaw<{ role: string; sessionRole: string; privileged: boolean; mutableMarker: boolean }[]>`
      SELECT current_user::text AS "role", session_user::text AS "sessionRole",
        (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls) AS "privileged",
        (c.relowner = r.oid OR has_table_privilege(current_user, c.oid, 'INSERT')
          OR has_table_privilege(current_user, c.oid, 'DELETE') OR has_table_privilege(current_user, c.oid, 'TRUNCATE')
          OR has_column_privilege(current_user, c.oid, 'binding_id', 'UPDATE')
          OR has_column_privilege(current_user, c.oid, 'deployment_tier', 'UPDATE')
          OR has_column_privilege(current_user, c.oid, 'created_at', 'UPDATE')) AS "mutableMarker"
      FROM pg_roles r JOIN pg_class c ON c.oid = 'deployment_database_bindings'::regclass WHERE r.rolname = current_user`;
    const row = rows[0];
    if (!row || row.role !== expectedRole || row.sessionRole !== expectedRole || row.privileged !== false || row.mutableMarker !== false) throw appError("PROVIDER_UNAVAILABLE");
  }
  private async lock(tx: Prisma.TransactionClient, name: JobName) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'niuva-operational-job:' + name}))`;
  }
  async claim(tx: Prisma.TransactionClient, name: JobName, policy: JobPolicy): Promise<{ state: "claimed"; lease: JobLease } | { state: "busy" | "cooldown"; cooldownMs: number }> {
    await this.lock(tx, name);
    const row = await tx.operationalJobState.upsert({ where: { name }, create: { name }, update: {} });
    const now = await this.now(tx);
    if (row.leaseId && row.leaseExpiresAt) {
      if (row.leaseExpiresAt > now) return { state: "busy", cooldownMs: row.leaseExpiresAt.getTime() - now.getTime() };
      const until = new Date(Math.max(row.cooldownUntil?.getTime() ?? 0, now.getTime() + policy.failureCooldownMs));
      await tx.operationalJobState.update({ where: { name }, data: { leaseId: null, leaseExpiresAt: null, cooldownUntil: until, lastFinishedAt: now, lastFailureCategory: "LEASE_EXPIRED", counters: {} } });
      return { state: "cooldown", cooldownMs: until.getTime() - now.getTime() };
    }
    if (row.cooldownUntil && row.cooldownUntil > now) return { state: "cooldown", cooldownMs: row.cooldownUntil.getTime() - now.getTime() };
    const lease = { job: name, id: randomUUID(), expiresAt: new Date(now.getTime() + policy.leaseMs) };
    await tx.operationalJobState.update({ where: { name }, data: { leaseId: lease.id, leaseExpiresAt: lease.expiresAt, lastStartedAt: now, runCount: { increment: 1 } } });
    return { state: "claimed", lease };
  }
  async verifyLease(tx: Prisma.TransactionClient, lease: JobLease): Promise<Date> {
    await this.lock(tx, lease.job);
    const row = await tx.operationalJobState.findUnique({ where: { name: lease.job } }), now = await this.now(tx);
    if (!row || row.leaseId !== lease.id || !row.leaseExpiresAt || row.leaseExpiresAt <= now) throw appError("PROVIDER_UNAVAILABLE");
    return new Date(row.leaseExpiresAt);
  }
  async recordCooldown(tx: Prisma.TransactionClient, lease: JobLease, until: Date): Promise<void> {
    await this.verifyLease(tx, lease);
    await tx.$executeRaw`UPDATE operational_job_states SET cooldown_until = GREATEST(cooldown_until, ${until}) WHERE name = ${lease.job} AND lease_id = ${lease.id}::uuid`;
  }
  async finalize(tx: Prisma.TransactionClient, lease: JobLease, result: JobResult, policy: JobPolicy): Promise<boolean> {
    await this.lock(tx, lease.job);
    const row = await tx.operationalJobState.findUnique({ where: { name: lease.job } }), now = await this.now(tx);
    if (!row || row.leaseId !== lease.id || !row.leaseExpiresAt || row.leaseExpiresAt <= now) return false;
    const cooldownUntil = new Date(Math.max(row.cooldownUntil?.getTime() ?? 0, now.getTime() + Math.max(result.cooldownMs ?? 0, result.failure ? policy.failureCooldownMs : policy.minIntervalMs)));
    await tx.operationalJobState.update({ where: { name: lease.job }, data: { leaseId: null, leaseExpiresAt: null, lastFinishedAt: now, ...(result.failure ? {} : { lastSuccessAt: now }), lastFailureCategory: result.failure ?? null, counters: result.counts, cooldownUntil } });
    return true;
  }
}
