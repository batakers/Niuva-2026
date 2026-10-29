import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DurableOutboxMessage, Prisma } from "@/generated/prisma/client";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/customer-auth/core";
import { RunBudget } from "@/modules/jobs/budget";
import type { JobContext } from "@/modules/jobs/core";
import { OutboxPayloadCipher } from "@/modules/outbox/cipher";
import { outboxIdentity, type LegacyProofProjection, type ProofProjection } from "@/modules/outbox/core";
import { PrismaOutboxWorkerRepository } from "@/modules/outbox/worker-repository";
import { DurableOutboxWorker, type OutboxWorkerCoordination } from "@/modules/outbox/worker";
import type { AttemptAction, OutboxSender } from "@/modules/outbox/worker-core";
import type { BusinessCandidate } from "@/modules/outbox/business-repository";
import type { BusinessProofProjection } from "@/modules/outbox/business-core";
import type { OutboxTransaction } from "@/modules/outbox/service";

const business = vi.hoisted(() => ({ candidates: vi.fn(), proof: vi.fn(), backlog: vi.fn() }));
vi.mock("@/modules/outbox/business-repository", () => ({ businessCandidates: business.candidates, readBusinessProof: business.proof, businessBacklog: business.backlog }));
import { createBusinessOutboxHandler } from "@/modules/outbox/business-job";

const base = Date.parse("2026-10-29T13:17:36.000Z"), tx = {} as Prisma.TransactionClient;
const cipher = new OutboxPayloadCipher({ activeKeyId: "budget-fixture", keys: { "budget-fixture": Buffer.alloc(32, 21).toString("base64") } });
let clock = 0;
beforeEach(() => { clock = 0; });

/** Rows and proofs in memory; database calls cost `latencyMs` of fake time per transaction, a send costs `sendMs`. */
class MemoryOutbox extends PrismaOutboxWorkerRepository {
  readonly rows = new Map<string, DurableOutboxMessage>();
  private readonly proofs = new Map<string, ProofProjection>();
  add(state: "PENDING" | "LEASED" = "PENDING"): DurableOutboxMessage {
    const token = createOpaqueToken(), expiresAt = new Date(base + 900_000), at = new Date(base - 60_000 + this.rows.size);
    const proof: LegacyProofProjection = { kind: "AUTH", proofId: randomUUID(), purpose: "AUTH_RESET", to: `budget-${this.rows.size}@example.test`, tokenHash: hashOpaqueToken(token), returnTo: "/account", ownerId: randomUUID(), sessionHash: null, expiresAt };
    const identity = outboxIdentity(proof), id = randomUUID();
    const metadata = { id, ...identity, proofKind: proof.kind, proofId: proof.proofId, purpose: proof.purpose, templateVersion: "v1" as const, expiresAt };
    const row: DurableOutboxMessage = { id, ...identity, proofKind: proof.kind, proofId: proof.proofId, purpose: proof.purpose, templateVersion: "v1", sealedPayload: cipher.seal({ to: proof.to, token, returnTo: proof.returnTo }, metadata), sealedEnvelope: null,
      createdAt: at, dueAt: at, expiresAt, state, attempts: state === "LEASED" ? 1 : 0, leaseId: state === "LEASED" ? randomUUID() : null, leaseExpiresAt: state === "LEASED" ? new Date(base - 1000) : null, terminalAt: null, failureCategory: null, providerReference: null };
    this.proofs.set(proof.proofId, proof); this.rows.set(id, row); return row;
  }
  private due(now: Date) {
    return [...this.rows.values()].filter(row => row.state === "PENDING" && row.dueAt <= now || row.state === "LEASED" && row.leaseExpiresAt !== null && row.leaseExpiresAt <= now)
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.id.localeCompare(b.id));
  }
  override async lock() {}
  override async now() { return new Date(base + clock); }
  override async candidates(_tx: Prisma.TransactionClient, now: Date, limit: number) { return this.due(now).slice(0, limit).map(row => ({ ...row })); }
  override async dueCount(_tx: Prisma.TransactionClient, now: Date, limit: number) { return Math.min(this.due(now).length, limit); }
  override async proof(_tx: Prisma.TransactionClient, input: { proofId: string }) { return this.proofs.get(input.proofId) ?? null; }
  override async find(_tx: Prisma.TransactionClient, id: string) { const row = this.rows.get(id); return row ? { ...row } : null; }
  override async markDelivered() {}
  override async discard(_tx: Prisma.TransactionClient, row: DurableOutboxMessage, now: Date, state: "FAILED" | "CANCELLED" | "EXPIRED", failureCategory: string) {
    const current = this.rows.get(row.id);
    if (!current || current.state !== row.state || current.leaseId !== row.leaseId) return false;
    this.rows.set(row.id, { ...current, state, failureCategory, terminalAt: now, sealedPayload: null, sealedEnvelope: null, leaseId: null, leaseExpiresAt: null }); return true;
  }
  override async claim(_tx: Prisma.TransactionClient, row: DurableOutboxMessage, leaseId: string, _now: Date, leaseExpiresAt: Date, sealedEnvelope = row.sealedEnvelope) {
    const current = this.rows.get(row.id);
    if (current?.state !== "PENDING" || current.attempts !== row.attempts) throw new Error("claim race");
    const leased = { ...current, state: "LEASED", leaseId, leaseExpiresAt, sealedEnvelope, attempts: current.attempts + 1, failureCategory: null };
    this.rows.set(row.id, leased); return { ...leased };
  }
  override async finishOwned(_tx: Prisma.TransactionClient, row: DurableOutboxMessage, now: Date, action: AttemptAction) {
    const current = this.rows.get(row.id);
    if (!current || current.state !== "LEASED" || current.leaseId !== row.leaseId || !current.leaseExpiresAt || current.leaseExpiresAt <= now) return false;
    this.rows.set(row.id, { ...current, state: action.state, leaseId: null, leaseExpiresAt: null, failureCategory: action.failureCategory,
      ...(action.state === "PENDING" ? { dueAt: action.dueAt, terminalAt: null } : { terminalAt: now, sealedPayload: null, sealedEnvelope: null, providerReference: action.providerReference ?? null }) });
    return true;
  }
}
function sender(sends: string[], sendMs: number): OutboxSender {
  return { assertReady() {}, async send() { throw new Error("Worker must use the prepared envelope"); }, prepare(input) {
    return { envelope: { from: "fixture@example.test", to: input.payload.to, subject: "fixture", text: "fixture" }, async send() { clock += sendMs; sends.push(input.metadata.id); return { kind: "accepted", providerReference: "fixture-receipt" }; } };
  } };
}
function worker(memory: MemoryOutbox, sends: string[], options: { runBudgetMs: number; sendMs?: number; latencyMs?: number; coordination?: OutboxWorkerCoordination }) {
  const bound = { async run<T>(_operation: "outbox" | "job", work: (client: Prisma.TransactionClient) => Promise<T>) { clock += options.latencyMs ?? 0; return work(tx); } };
  return new DurableOutboxWorker({ bound, repository: memory, cipherFactory: () => cipher, senderFactory: () => sender(sends, options.sendMs ?? 8000), clock: () => clock, coordination: options.coordination,
    policy: { leaseMs: 10_000, sendTimeoutMs: 5000, retryDelaysMs: [], runBudgetMs: options.runBudgetMs } });
}

describe("run budget gate", () => {
  it("starts a unit only while the remaining budget covers the floor and the slowest earlier interval", () => {
    let elapsed = 0; const budget = new RunBudget(10_000, () => elapsed, 2000);
    expect(budget.allowsNext()).toBe(true); elapsed = 4000;
    expect(budget.allowsNext()).toBe(true); elapsed = 5000;
    expect(budget.allowsNext()).toBe(true); elapsed = 7000;
    expect(budget.allowsNext()).toBe(false);
    const floorOnly = new RunBudget(10_000, () => elapsed, 2000); elapsed = 8001;
    expect(floorOnly.allowsNext()).toBe(false);
  });
  it("needs some remaining time even without a floor", () => {
    let elapsed = 9999; const budget = new RunBudget(10_000, () => elapsed);
    expect(budget.allowsNext()).toBe(true); elapsed = 10_000; expect(budget.allowsNext()).toBe(false);
  });
});

describe("deadline-aware outbox delivery batch", () => {
  it("stops claiming before the budget runs out and leaves later messages due and untouched", async () => {
    const memory = new MemoryOutbox(), rows = [memory.add(), memory.add(), memory.add()], sends: string[] = [];
    // 8 s per send as on staging: the third send would start at 16 s with 5 s left, below the slowest 8 s message.
    expect(await worker(memory, sends, { runBudgetMs: 21_000 }).run({ mode: "execute", limit: 10 })).toMatchObject({ scanned: 2, claimed: 2, accepted: 2, failed: 0, unknown: 0, deferred: 1 });
    expect(sends).toEqual([rows[0].id, rows[1].id]); expect(clock).toBe(16_000);
    expect(memory.rows.get(rows[2].id)).toEqual(rows[2]);
    expect(await worker(memory, sends, { runBudgetMs: 21_000 }).run({ mode: "execute", limit: 10 })).toMatchObject({ accepted: 1, deferred: 0 });
    expect(sends).toEqual(rows.map(row => row.id)); expect([...memory.rows.values()].every(row => row.state === "ACCEPTED" && row.attempts === 1)).toBe(true);
  });
  it("does not claim a message when the remaining budget cannot hold its send timeout", async () => {
    const memory = new MemoryOutbox(), rows = [memory.add(), memory.add()], sends: string[] = [];
    expect(await worker(memory, sends, { runBudgetMs: 6000, latencyMs: 1000 }).run({ mode: "execute", limit: 10 })).toMatchObject({ scanned: 0, claimed: 0, deferred: 2 });
    expect(sends).toEqual([]); expect(rows.map(row => memory.rows.get(row.id))).toEqual(rows);
  });
  it("counts deferred work only up to the remaining limit", async () => {
    const memory = new MemoryOutbox(), sends: string[] = [];
    for (let i = 0; i < 5; i++) memory.add();
    expect(await worker(memory, sends, { runBudgetMs: 21_000 }).run({ mode: "execute", limit: 3 })).toMatchObject({ accepted: 2, deferred: 1 });
  });
  it("leaves an abandoned lease for the next run and never resends it", async () => {
    const memory = new MemoryOutbox(), abandoned = memory.add("LEASED"), sends: string[] = [];
    expect(await worker(memory, sends, { runBudgetMs: 6000, latencyMs: 1000 }).run({ mode: "execute", limit: 10 })).toMatchObject({ failed: 0, unknown: 0, deferred: 1 });
    expect(memory.rows.get(abandoned.id)).toEqual(abandoned);
    expect(await worker(memory, sends, { runBudgetMs: 21_000 }).run({ mode: "execute", limit: 10 })).toMatchObject({ failed: 1, unknown: 1, deferred: 0 });
    expect(sends).toEqual([]); expect(memory.rows.get(abandoned.id)).toMatchObject({ state: "FAILED", failureCategory: "OUTCOME_UNKNOWN", sealedPayload: null });
  });
  it("measures the budget from the coordinating job run, including time spent before the worker started", async () => {
    const memory = new MemoryOutbox(), rows = [memory.add(), memory.add()], sends: string[] = [];
    const coordination: OutboxWorkerCoordination = { beforeClaim: async () => new Date(base + 600_000), recordCooldown: async () => {}, elapsedMs: () => clock + 15_000 };
    expect(await worker(memory, sends, { runBudgetMs: 21_000, coordination }).run({ mode: "execute", limit: 10 })).toMatchObject({ accepted: 1, deferred: 1 });
    expect(memory.rows.get(rows[1].id)).toEqual(rows[1]);
  });
  it("ignores the budget on dry-run", async () => {
    const memory = new MemoryOutbox(), sends: string[] = []; memory.add(); memory.add();
    expect(await worker(memory, sends, { runBudgetMs: 6000, latencyMs: 10_000 }).run({ mode: "dry-run", limit: 10 })).toMatchObject({ scanned: 2, deferred: 0 });
  });
});

describe("deadline-aware business notification projection", () => {
  const policy = { maxAgeMs: 3_600_000, runBudgetMs: 15_000 };
  const candidates: BusinessCandidate[] = Array.from({ length: 4 }, (_, i) => ({ kind: "ORDER", proofId: randomUUID(), sourceAt: new Date(base - 60_000 + i) }));
  function proof(candidate: BusinessCandidate): BusinessProofProjection {
    return { kind: "ORDER", proofId: candidate.proofId, purpose: "ORDER_RECEIVED", to: "buyer@example.test", ownerId: randomUUID(), sourceAt: candidate.sourceAt, expiresAt: new Date(candidate.sourceAt.getTime() + policy.maxAgeMs), content: { reference: "TEST-ORDER", accountPath: `/account/orders/${candidate.proofId}` } };
  }
  function context(mode: "execute" | "dry-run" = "execute"): JobContext {
    return { request: { job: "OUTBOX_BUSINESS", mode, limit: 10 }, lease: null, elapsedMs: () => clock, withLease: async () => { throw new Error("unused"); }, verifyLease: async () => new Date(base + 600_000), recordCooldown: async () => {} };
  }
  function outbox(enqueue: OutboxTransaction["enqueue"]) {
    return { async withTransaction<T>(work: (transaction: OutboxTransaction) => Promise<T>) { clock += 2000; return work({ tx, now: new Date(base + clock), enqueue }); } };
  }
  beforeEach(() => {
    business.candidates.mockResolvedValue(candidates);
    business.proof.mockImplementation(async (_tx: Prisma.TransactionClient, input: { proofId: string }) => { clock += 1000; return proof(candidates.find(value => value.proofId === input.proofId)!); });
    business.backlog.mockResolvedValue({ remainingDue: 1, lagMs: 60_000 });
  });
  it("stops projecting before the budget runs out and leaves later facts unqueued", async () => {
    const enqueue = vi.fn<OutboxTransaction["enqueue"]>(async () => { clock += 3000; return { id: randomUUID(), messageKey: "fixture", state: "PENDING", expiresAt: new Date(base + 600_000), duplicate: false }; });
    // 4 s per fact after a 2 s start: at 14 s only 1 s is left, below the slowest 4 s fact.
    expect(await createBusinessOutboxHandler(outbox(enqueue), policy)(context())).toEqual({ counts: { scanned: 3, enqueued: 3, cancelled: 0, expired: 0, deferred: 1, remainingDue: 1, lagMs: 60_000 } });
    expect(enqueue.mock.calls.map(call => (call[0] as { proofId: string }).proofId)).toEqual(candidates.slice(0, 3).map(value => value.proofId));
    expect(business.proof.mock.calls.map(call => call[1].proofId)).not.toContain(candidates[3].proofId);
  });
  it("projects nothing when the budget is already spent and reports every fetched fact as deferred", async () => {
    clock = 14_000; const enqueue = vi.fn<OutboxTransaction["enqueue"]>();
    expect((await createBusinessOutboxHandler(outbox(enqueue), policy)(context())).counts).toMatchObject({ scanned: 0, enqueued: 0, deferred: 4 });
    expect(enqueue).not.toHaveBeenCalled(); expect(business.proof).not.toHaveBeenCalled();
  });
  it("ignores the budget on dry-run", async () => {
    clock = 14_000; const enqueue = vi.fn<OutboxTransaction["enqueue"]>();
    expect((await createBusinessOutboxHandler(outbox(enqueue), policy)(context("dry-run"))).counts).toMatchObject({ scanned: 4, enqueued: 0, deferred: 0 });
  });
});
