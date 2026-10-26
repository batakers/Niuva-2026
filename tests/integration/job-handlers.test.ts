import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { operationalJobFixture } from "../helpers/operational-job-fixture";
import { preparedOutboxSender } from "../helpers/prepared-outbox-sender";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { createOpaqueToken } from "@/modules/customer-auth/core";
import { OutboxPayloadCipher, readOutboxCipherConfig } from "@/modules/outbox/cipher";
import { PrismaOutboxRepository } from "@/modules/outbox/repository";
import { DurableOutboxService } from "@/modules/outbox/service";
import { CustomerOutboxProducer } from "@/modules/outbox/producer";
import { createJobHandlers } from "@/modules/jobs/handlers";
import { JobRunner } from "@/modules/jobs/runner";
import { PrismaJobRepository } from "@/modules/jobs/repository";
import type { OutboxSender } from "@/modules/outbox/worker-core";
import type { JobName } from "@/modules/jobs/core";

let f: Awaited<ReturnType<typeof operationalJobFixture>>;
const customers: string[] = [], proofs: string[] = [], cases: string[] = [], googleConsents: string[] = [];
beforeAll(async () => { f = await operationalJobFixture(); });
afterEach(async () => {
  await f.admin.durableOutboxMessage.deleteMany({ where: { proofId: { in: proofs } } });
  await f.admin.customerGoogleConsent.deleteMany({ where: { tokenHash: { in: googleConsents } } });
  await f.admin.customerPrivacyRequest.deleteMany({ where: { id: { in: cases } } });
  await f.admin.customer.deleteMany({ where: { id: { in: customers } } });
  await f.admin.operationalJobState.deleteMany();
  customers.length = 0; proofs.length = 0; cases.length = 0; googleConsents.length = 0;
});
afterAll(async () => { await f?.dispose(); });
function handlers(senderFactory?: () => OutboxSender) { return createJobHandlers({ prisma: f.client, bound: f.bound, source: f.source, workerPolicy: { leaseMs: 60000, sendTimeoutMs: 1000, retryDelaysMs: [1000] }, ...(senderFactory ? { senderFactory } : {}) }); }
function runner(map = handlers(), leaseMs = 60000) { return new JobRunner({ bound: f.bound, expectedRole: f.role, repository: new PrismaJobRepository(), handlers: map, policy: { leaseMs, minIntervalMs: 0, failureCooldownMs: 1000 } }); }
const run = (job: JobName, mode: "execute" | "dry-run" = "execute", limit = 1) => ({ job, mode, limit });
async function account(expired = false) {
  const email = `jobs-${randomUUID()}@example.test`;
  const row = await f.admin.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date(), internalTestExpiresAt: expired ? new Date(Date.now() - 1000) : null, passwordCredential: { create: { passwordHash: "fixture" } } } }); customers.push(row.id); return row;
}
async function enqueue() {
  const owner = await account();
  const producer = new CustomerOutboxProducer({ outbox: new DurableOutboxService({ bound: f.bound, repository: new PrismaOutboxRepository(), cipherFactory: () => new OutboxPayloadCipher(readOutboxCipherConfig(f.source)) }), authRepository: new CustomerEmailRepository(f.client), privacyRepository: new CustomerPrivacyRepository(f.client) });
  await producer.auth({ to: owner.email, token: createOpaqueToken(), purpose: "reset", owner: { customerId: owner.id }, returnTo: "/account" });
  const row = await f.admin.customerEmailToken.findFirstOrThrow({ where: { customerId: owner.id } }); proofs.push(row.id); return row;
}
describe("bound job handlers", () => {
  it("delivers a real producer row through the bound worker and preserves shared cooldown on retry", async () => {
    await enqueue(); let sends = 0;
    const map = handlers(() => preparedOutboxSender(message => ({ envelope: { from: "fixture@example.test", to: message.payload.to, subject: "fixture", text: "fixture" }, async send() { sends++; return { kind: "retryable", retryAfterMs: 600000 }; } })));
    expect(await runner(map).run(run("OUTBOX_DELIVERY"))).toMatchObject({ counts: { retried: 1 } });
    expect(await runner(map).run(run("OUTBOX_DELIVERY"))).toMatchObject({ state: "cooldown" }); expect(sends).toBe(1);
    expect((await f.admin.operationalJobState.findUniqueOrThrow({ where: { name: "OUTBOX_DELIVERY" } })).cooldownUntil!.getTime()).toBeGreaterThan(Date.now() + 500000);
  });
  it("does not start a send after preparation consumes the job lease", async () => {
    await enqueue(); let sends = 0;
    const map = handlers(() => preparedOutboxSender(message => { const until = performance.now() + 250; while (performance.now() < until) { /* simulate synchronous template work */ } return { envelope: { from: "fixture@example.test", to: message.payload.to, subject: "fixture", text: "fixture" }, async send() { sends++; return { kind: "accepted", providerReference: null }; } }; }));
    await runner(map, 150).run(run("OUTBOX_DELIVERY")); expect(sends).toBe(0);
    expect((await f.admin.durableOutboxMessage.findFirstOrThrow({ where: { proofId: proofs[0] } })).state).toBe("PENDING");
  });
  it("bounds internal cleanup, preserves ordinary accounts and is repeatable", async () => {
    const ordinary = await account(); for (let i = 0; i < 3; i++) await account(true);
    expect(await runner().run(run("CUSTOMER_AUTH_CLEANUP", "dry-run"))).toMatchObject({ counts: { customers: 1 } });
    expect(await f.admin.customer.count({ where: { id: { in: customers } } })).toBe(4);
    for (let i = 0; i < 3; i++) expect(await runner().run(run("CUSTOMER_AUTH_CLEANUP"))).toMatchObject({ counts: { customers: 1 } });
    expect(await runner().run(run("CUSTOMER_AUTH_CLEANUP"))).toMatchObject({ counts: { customers: 0 } });
    expect(await f.admin.customer.findUnique({ where: { id: ordinary.id } })).not.toBeNull();
  });
  it("bounds privacy content cleanup without changing deadlines or deleting an active hold", async () => {
    const owner = await account(), deadline = new Date(Date.now() - 1000);
    for (let i = 0; i < 3; i++) { const row = await f.admin.customerPrivacyRequest.create({ data: { customerId: owner.id, referenceNumber: `PRV-JOB-${randomUUID()}`, submissionKey: randomUUID(), kind: "ADDITIONAL", details: "fixture", createdAt: deadline, dueAt: deadline, contentDeleteAt: deadline, receiptDeleteAt: new Date(Date.now() + 86400000), ...(i === 2 ? { holdCategory: "ACTIVE_DISPUTE", holdReviewAt: new Date(Date.now() + 86400000), holdReason: "fixture" } : {}) } }); cases.push(row.id); }
    expect(await runner().run(run("CUSTOMER_PRIVACY_CLEANUP"))).toMatchObject({ counts: { caseContents: 1 } });
    expect(await f.admin.customerPrivacyRequest.count({ where: { id: { in: cases }, contentPurgedAt: null } })).toBe(2);
    const held = await f.admin.customerPrivacyRequest.findUniqueOrThrow({ where: { id: cases[2] } }); expect(held.details).toBe("fixture"); expect(held.contentDeleteAt).toEqual(deadline);
  });
  it("exposes bounded public Google consent cleanup through the canonical privacy job counters", async () => {
    const tokenHash = randomUUID(); googleConsents.push(tokenHash);
    await f.admin.customerGoogleConsent.create({ data: { tokenHash, returnTo: "/account", termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", acceptedAt: new Date(), ageDeclarationVersion: "AGE-18-SELF-DECLARATION-2026-10-05-v1", ageDeclaredAt: new Date(), expiresAt: new Date(Date.now() - 7 * 86400000) } });
    expect(await runner().run(run("CUSTOMER_PRIVACY_CLEANUP"))).toMatchObject({ counts: { googleConsents: 1 } });
    expect(await f.admin.customerGoogleConsent.findUnique({ where: { tokenHash } })).toBeNull();
  });
  it("dry-runs outbox without constructing a cipher/sender or writing state", async () => {
    await enqueue(); const map = handlers(() => { throw new Error("sender must not be built"); });
    expect(await runner(map).run(run("OUTBOX_DELIVERY", "dry-run"))).toMatchObject({ state: "completed", counts: { scanned: 1 } });
    expect(await f.admin.operationalJobState.count()).toBe(0);
  });
});
