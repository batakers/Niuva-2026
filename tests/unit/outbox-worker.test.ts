import { describe, expect, it } from "vitest";
import { parseDeliveryOutcome, parseWorkerPolicy, parseWorkerRequest } from "@/modules/outbox/worker-core";
import { EmailDeliveryError } from "@/modules/notifications/email-delivery";
import { OutboxPayloadCipher } from "@/modules/outbox/cipher";
import type { OutboxMetadata } from "@/modules/outbox/core";
import { randomUUID } from "node:crypto";

const policy = { leaseMs: 1000, sendTimeoutMs: 500, retryDelaysMs: [100, 200], runBudgetMs: 2000 };

describe("durable provider envelope protection", () => {
  const metadata: OutboxMetadata = { id: randomUUID(), messageKey: "fixture-message", proofKind: "AUTH", proofId: randomUUID(), purpose: "AUTH_VERIFY", templateVersion: "v1", fingerprint: "a".repeat(64), expiresAt: new Date("2026-10-15T00:00:00Z") };
  const cipher = new OutboxPayloadCipher({ activeKeyId: "fixture", keys: { fixture: Buffer.alloc(32, 15).toString("base64") } });
  const envelope = { from: "sender@example.test", to: "buyer@example.test", subject: "Fixture", text: "private-token-link" };
  it("protects the entire rendered request body and returns an immutable snapshot", () => {
    const sealed = cipher.sealEnvelope(envelope, metadata), opened = cipher.openEnvelope(sealed, metadata);
    expect(opened).toEqual(envelope); expect(Object.isFrozen(opened)).toBe(true);
    expect(sealed).not.toContain(envelope.to); expect(sealed).not.toContain(envelope.text);
  });
  it("binds an envelope to its message identity and rejects ciphertext modification", () => {
    const sealed = cipher.sealEnvelope(envelope, metadata), changed = JSON.parse(sealed) as { ct: string };
    changed.ct = Buffer.alloc(32, 1).toString("base64");
    expect(() => cipher.openEnvelope(sealed, { ...metadata, messageKey: "another-message" })).toThrow("Outbox payload protection unavailable.");
    expect(() => cipher.openEnvelope(JSON.stringify(changed), metadata)).toThrow("Outbox payload protection unavailable.");
  });
  it("keeps raw token payloads and provider envelopes in separate authenticated contexts", () => {
    const payload = cipher.seal({ to: envelope.to, token: "t".repeat(43), returnTo: "/account" }, metadata);
    expect(() => cipher.openEnvelope(payload, metadata)).toThrow();
    expect(() => cipher.open(cipher.sealEnvelope(envelope, metadata), metadata)).toThrow();
  });
  it("requires the original encryption key and supports an explicitly retained rotation key", () => {
    const sealed = cipher.sealEnvelope(envelope, metadata), next = Buffer.alloc(32, 16).toString("base64");
    const rotated = new OutboxPayloadCipher({ activeKeyId: "next", keys: { next, fixture: Buffer.alloc(32, 15).toString("base64") } });
    expect(rotated.openEnvelope(sealed, metadata)).toEqual(envelope);
    expect(() => new OutboxPayloadCipher({ activeKeyId: "next", keys: { next } }).openEnvelope(sealed, metadata)).toThrow();
  });
});

describe("outbox worker input and policy", () => {
  it("accepts explicit modes and bounded batch sizes without defaults", () => {
    expect(parseWorkerRequest({ mode: "execute", limit: 100 })).toEqual({ mode: "execute", limit: 100 });
    expect(parseWorkerRequest({ mode: "dry-run", limit: 1 })).toEqual({ mode: "dry-run", limit: 1 });
  });
  it.each([{}, { mode: "execute" }, { mode: "other", limit: 1 }, { mode: "execute", limit: 0 }, { mode: "execute", limit: 101 }, { mode: "execute", limit: 1.5 }, { mode: "execute", limit: 1, token: "sensitive-fixture" }])("rejects invalid request %# without echoing input", raw => {
    try { parseWorkerRequest(raw); expect.fail("request must fail"); } catch (error) {
      expect(error).toMatchObject({ code: "VALIDATION_ERROR", status: 422 });
      expect(String(error)).not.toContain("sensitive-fixture");
    }
  });
  it("snapshots and freezes the explicit policy and delay array", () => {
    const source = { ...policy, retryDelaysMs: [...policy.retryDelaysMs] };
    const parsed = parseWorkerPolicy(source); source.leaseMs = 9000; source.retryDelaysMs[0] = 999;
    expect(parsed).toEqual(policy); expect(Object.isFrozen(parsed)).toBe(true); expect(Object.isFrozen(parsed.retryDelaysMs)).toBe(true);
    expect(parseWorkerPolicy({ ...policy, retryDelaysMs: [] }).retryDelaysMs).toEqual([]);
  });
  it.each([{}, { leaseMs: 0 }, { leaseMs: 2_147_483_648 }, { sendTimeoutMs: 0 }, { sendTimeoutMs: 1000 }, { sendTimeoutMs: 1001 }, { retryDelaysMs: [0] }, { retryDelaysMs: [-1] }, { retryDelaysMs: [1.5] }, { retryDelaysMs: [2_147_483_648] }, { retryDelaysMs: Array(100).fill(1) }, { extra: true }, { runBudgetMs: undefined }, { runBudgetMs: 0 }, { runBudgetMs: 400 }, { runBudgetMs: 500 }, { runBudgetMs: 1.5 }, { runBudgetMs: 2_147_483_648 }])("rejects invalid policy %#", mutation => {
    const raw = Object.keys(mutation).length ? { ...policy, ...mutation } : {};
    expect(() => parseWorkerPolicy(raw)).toThrow();
  });
  it.each(["RETRYABLE", "PERMANENT", "UNKNOWN"] as const)("uses a safe compatible %s delivery error", kind => {
    const error = new EmailDeliveryError(kind);
    expect(error).toMatchObject({ kind, code: "PROVIDER_UNAVAILABLE", status: 503, message: "Layanan email sedang tidak tersedia." });
    expect(error.cause).toBeUndefined(); expect(error.details).toBeUndefined();
  });
});

describe("outbox sender outcome validation", () => {
  it("accepts bounded safe receipts and retry cooldown", () => {
    expect(parseDeliveryOutcome({ kind: "accepted", providerReference: "email-1" })).toEqual({ kind: "accepted", providerReference: "email-1" });
    expect(parseDeliveryOutcome({ kind: "accepted", providerReference: null })).toEqual({ kind: "accepted", providerReference: null });
    expect(parseDeliveryOutcome({ kind: "retryable", retryAfterMs: 30_000 })).toEqual({ kind: "retryable", retryAfterMs: 30_000 });
  });
  it.each([null, { kind: "accepted", providerReference: "private@example.test" }, { kind: "accepted", providerReference: "x".repeat(201) }, { kind: "retryable", retryAfterMs: NaN }, { kind: "retryable", retryAfterMs: -1 }, { kind: "accepted", providerReference: "email-1", token: "private-token" }])("normalizes unsafe or malformed outcome %# to unknown", raw => {
    expect(parseDeliveryOutcome(raw)).toEqual({ kind: "unknown" });
  });
});
