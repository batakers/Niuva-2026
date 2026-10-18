import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { operationalJobFixture } from "../helpers/operational-job-fixture";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";

let f: Awaited<ReturnType<typeof operationalJobFixture>>;
const rows: string[] = [], cases: string[] = [];
beforeAll(async () => { f = await operationalJobFixture(); });
afterEach(async () => { await f.admin.operationalJobState.deleteMany(); await f.admin.durableOutboxMessage.deleteMany({ where: { id: { in: rows } } }); await f.admin.customerPrivacyRequest.deleteMany({ where: { id: { in: cases } } }); rows.length = 0; cases.length = 0; });
afterAll(async () => { await f?.dispose(); });
const runtime = () => createOperationalJobRuntime({ prisma: f.client, source: f.source });
describe("operational inspection", () => {
  it("reports never-run jobs without creating state or requiring cipher keys", async () => {
    const source = { ...f.source, NIUVA_OUTBOX_ENCRYPTION_KEY: undefined, RESEND_API_KEY: undefined, EMAIL_FROM: undefined };
    const result = await createOperationalJobRuntime({ prisma: f.client, source }).inspect({ maxLagMs: 1000 });
    expect(result.jobs).toHaveLength(5); expect(result.alarms.filter(a => a.code === "JOB_NEVER_RUN")).toHaveLength(5); expect(await f.admin.operationalJobState.count()).toBe(0);
  });
  it("reports stale leases, old success and unknown provider outcomes without exposing content", async () => {
    const old = new Date(Date.now() - 60000);
    await f.admin.operationalJobState.create({ data: { name: "OUTBOX_DELIVERY", leaseId: randomUUID(), leaseExpiresAt: old, lastStartedAt: old, lastSuccessAt: old, runCount: 1, counters: { token: "sensitive-token" } } });
    const row = await f.admin.durableOutboxMessage.create({ data: { messageKey: randomUUID(), proofKind: "AUTH", proofId: randomUUID(), purpose: "AUTH_RESET", templateVersion: "v1", fingerprint: "a".repeat(64), createdAt: old, dueAt: old, expiresAt: new Date(Date.now() + 60000), state: "FAILED", terminalAt: old, failureCategory: "OUTCOME_UNKNOWN", sealedPayload: null, sealedEnvelope: null } }); rows.push(row.id);
    const result = await runtime().inspect({ maxLagMs: 1000 });
    expect(result.alarms.map(a => a.code)).toEqual(expect.arrayContaining(["JOB_STALE_LEASE", "JOB_LAG", "JOB_INVALID_STATE", "OUTBOX_UNKNOWN"]));
    expect(JSON.stringify(result)).not.toContain("sensitive-token"); expect(result.outbox.unknown).toBeGreaterThanOrEqual(1);
  });
  it("reports overdue privacy work and holds using original deadlines", async () => {
    const old = new Date(Date.now() - 1000);
    const row = await f.admin.customerPrivacyRequest.create({ data: { referenceNumber: `PRV-MON-${randomUUID()}`, submissionKey: randomUUID(), kind: "ADDITIONAL", details: "private@example.test", createdAt: old, dueAt: old, holdCategory: "ACTIVE_DISPUTE", holdReviewAt: old, holdReason: "private" } }); cases.push(row.id);
    const result = await runtime().inspect({ maxLagMs: 1000 }); expect(result.privacy).toMatchObject({ overdue: expect.any(Number), overdueHolds: expect.any(Number) }); expect(result.alarms.map(a => a.code)).toEqual(expect.arrayContaining(["PRIVACY_OVERDUE", "PRIVACY_HOLD_OVERDUE"])); expect(JSON.stringify(result)).not.toContain("private@example.test"); expect((await f.admin.customerPrivacyRequest.findUniqueOrThrow({ where: { id: row.id } })).dueAt).toEqual(old);
  });
  it("snapshots trusted runtime config and refuses production activation", async () => {
    const source = { ...f.source }, saved = createOperationalJobRuntime({ prisma: f.client, source }); source.NIUVA_JOB_DATABASE_ROLE = "changed_role";
    await expect(saved.inspect({ maxLagMs: 1000 })).resolves.toHaveProperty("checkedAt");
    await expect(createOperationalJobRuntime({ prisma: f.client, source: { ...f.source, NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "production" } }).inspect({ maxLagMs: 1000 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
  it("rejects an unconfigured delivery runtime before claiming a job lease", async () => {
    await expect(runtime().run({ job: "OUTBOX_DELIVERY", mode: "execute", limit: 1 }, { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1000 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await f.admin.operationalJobState.count()).toBe(0);
  });
});
