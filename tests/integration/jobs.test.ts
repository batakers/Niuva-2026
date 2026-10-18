import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";
import { createOutboxBinding } from "@/modules/outbox/runtime";
import { PrismaJobRepository } from "@/modules/jobs/repository";
import { JobRunner } from "@/modules/jobs/runner";
import type { JobContext, JobHandler, JobName } from "@/modules/jobs/core";

const admin = getPrismaClient(), bindingId = randomUUID(), role = `niuva_job_${randomUUID().replaceAll("-", "")}`;
let client: PrismaClient;
let marker = false, roleCreated = false;
const policy = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1000 };
const request = { job: "OUTBOX_DELIVERY", mode: "execute", limit: 10 } as const;
function runner(handler: JobHandler = async () => ({ counts: { scanned: 1 } }), expectedRole = role, db = client) {
  const env = { NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock", DATABASE_URL: process.env.TEST_DATABASE_URL, NIUVA_DATABASE_BINDING_ID: bindingId };
  const handlers = Object.fromEntries(["OUTBOX_DELIVERY", "OUTBOX_EXPIRY", "CUSTOMER_AUTH_CLEANUP", "CUSTOMER_PRIVACY_CLEANUP"].map(name => [name, handler])) as Record<JobName, JobHandler>;
  return new JobRunner({ bound: createOutboxBinding(db, env), repository: new PrismaJobRepository(), expectedRole, policy, handlers });
}
beforeAll(async () => {
  const url = new URL(getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }));
  if (await admin.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })) throw new Error("Foreign test marker");
  await admin.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "local-test" } }); marker = true;
  if (!/^niuva_job_[a-f0-9]{32}$/.test(role)) throw new Error("Invalid fixture role");
  await admin.$executeRawUnsafe(`CREATE ROLE "${role}" LOGIN NOINHERIT`); roleCreated = true;
  await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`);
  await admin.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${role}"`);
  await admin.$executeRawUnsafe(`REVOKE ALL ON deployment_database_bindings FROM "${role}"`);
  await admin.$executeRawUnsafe(`GRANT SELECT, UPDATE(id) ON deployment_database_bindings TO "${role}"`);
  url.username = role; url.password = "";
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href, max: 4 }) });
});
beforeEach(async () => { await admin.operationalJobState.deleteMany(); });
afterAll(async () => {
  await client?.$disconnect();
  if (roleCreated) { await admin.$executeRawUnsafe(`DROP OWNED BY "${role}"`); await admin.$executeRawUnsafe(`DROP ROLE "${role}"`); }
  if (marker) await admin.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } });
  await admin.operationalJobState.deleteMany();
});
describe("persistent operational jobs", () => {
  it("runs under a matching limited database identity and records only safe counters", async () => {
    expect(await runner().run(request)).toMatchObject({ state: "completed", counts: { scanned: 1 } });
    const row = await admin.operationalJobState.findUniqueOrThrow({ where: { name: request.job } });
    expect(row).toMatchObject({ leaseId: null, runCount: 1, lastFailureCategory: null, counters: { scanned: 1 } }); expect(row.lastSuccessAt).not.toBeNull();
  });
  it("rejects identity mismatch and privileged roles before executing a handler", async () => {
    let called = false; const handler: JobHandler = async () => { called = true; return { counts: {} }; };
    await expect(runner(handler, "other_role").run(request)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(runner(handler, "niuva_test", admin).run(request)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(called).toBe(false); expect(await admin.operationalJobState.count()).toBe(0);
  });
  it("does not mutate job state during dry-run", async () => {
    expect(await runner().run({ ...request, mode: "dry-run" })).toMatchObject({ state: "completed" }); expect(await admin.operationalJobState.count()).toBe(0);
  });
  it("prevents overlapping instances from executing the same job", async () => {
    let release!: () => void, started!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { started = resolve; });
    const first = runner(async () => { started(); await waiting; return { counts: { accepted: 1 } }; }).run(request);
    await entered;
    try { expect(await runner().run(request)).toMatchObject({ state: "busy" }); } finally { release(); }
    expect(await first).toMatchObject({ state: "completed" });
  });
  it("persists provider cooldown independently of launcher finalization", async () => {
    let release!: () => void, started!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { started = resolve; });
    const first = runner(async context => { await context.withLease(async (tx, now) => { await new PrismaJobRepository().recordCooldown(tx, context.lease!, new Date(now.getTime() + 600000)); }); started(); await waiting; throw new Error("simulated launcher interruption"); }).run(request);
    await entered; release();
    expect(await first).toMatchObject({ state: "failed" }); expect(await runner().run(request)).toMatchObject({ state: "cooldown" });
    expect((await admin.operationalJobState.findUniqueOrThrow({ where: { name: request.job } })).cooldownUntil!.getTime()).toBeGreaterThan(Date.now() + 500000);
  });
  it("fences stale cleanup contexts and stale finalization", async () => {
    let saved!: JobContext;
    expect(await runner(async context => { saved = context; await admin.operationalJobState.update({ where: { name: request.job }, data: { leaseId: randomUUID(), leaseExpiresAt: new Date(Date.now() + 60000) } }); return { counts: { accepted: 9 } }; }).run(request)).toMatchObject({ state: "lost-lease" });
    await expect(saved.withLease(async () => undefined)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect((await admin.operationalJobState.findUniqueOrThrow({ where: { name: request.job } })).lastSuccessAt).toBeNull();
  });
  it("sanitizes handler exceptions and unsafe output before persistence", async () => {
    expect(await runner(async () => { throw new Error("private@example.test sensitive-token"); }).run(request)).toMatchObject({ state: "failed", counts: {} });
    const row = await admin.operationalJobState.findUniqueOrThrow({ where: { name: request.job } }); expect(JSON.stringify(row)).not.toMatch(/private@example|sensitive-token/);
    await admin.operationalJobState.deleteMany();
    expect(await runner(async () => ({ counts: { token: 1 } } as unknown as Awaited<ReturnType<JobHandler>>)).run(request)).toMatchObject({ state: "failed", counts: {} });
  });
});
