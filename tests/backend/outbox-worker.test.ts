import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerOutboxSender } from "@/modules/outbox/customer-sender";
import type { OutboxDispatch } from "@/modules/outbox/worker-core";
import type { LegacyOutboxPurpose, LegacyOutboxPayload } from "@/modules/outbox/core";
import { ResendEmailGateway } from "@/modules/notifications/resend";
import { createCustomerAuthMailer } from "@/modules/customer-auth/email-mailer";
import { createPrivacyMailer } from "@/modules/customer-privacy/mailer";
import { BoundDatabaseService } from "@/modules/database-binding/service";
import { PrismaOutboxWorkerRepository } from "@/modules/outbox/worker-repository";
import { DurableOutboxWorker } from "@/modules/outbox/worker";

function message(purpose: LegacyOutboxPurpose = "AUTH_VERIFY"): OutboxDispatch & { payload: LegacyOutboxPayload } {
  const proofId = randomUUID(), kind = purpose.startsWith("AUTH") ? "AUTH" : "PRIVACY";
  return { metadata: { id: randomUUID(), proofId, proofKind: kind, purpose, templateVersion: "v1", messageKey: `${kind.toLowerCase()}:${purpose.toLowerCase()}:v1:${proofId}`, fingerprint: "a".repeat(64), expiresAt: new Date(Date.now() + 60_000) }, payload: { to: "buyer@example.test", token: "t".repeat(43), returnTo: kind === "AUTH" ? "/account" : null } };
}
const source = { NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "sandbox", NIUVA_CUSTOMER_AUTH_MOCK: "false", APP_URL: "http://127.0.0.1:3000", DATABASE_URL: "postgresql://fixture@127.0.0.1:55432/niuva_test?schema=public", RESEND_API_KEY: "synthetic-worker-key", EMAIL_FROM: "hello@example.test" };
const internalSource = { ...source, NODE_ENV: "development", NIUVA_RUNTIME_MODE: "live", DATABASE_URL: "postgresql://fixture@127.0.0.1:55433/niuva_dev?schema=public", NIUVA_INTERNAL_AUTH_ENABLED: "true", NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test", NIUVA_INTERNAL_PASSWORD_EMAIL: "buyer@example.test" };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("Customer outbox sender", () => {
  it.each(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE"] as const)("dispatches %s with the immutable message key and abort signal", async purpose => {
    const auth = { send: vi.fn(async () => ({ id: "auth-receipt" })) }, privacy = { send: vi.fn(async () => ({ id: "privacy-receipt" })) };
    const sender = new CustomerOutboxSender({ auth, privacy }), input = message(purpose), signal = new AbortController().signal;
    expect(() => sender.assertReady(purpose)).not.toThrow();
    expect(await sender.send(input, signal)).toEqual({ kind: "accepted", providerReference: purpose.startsWith("AUTH") ? "auth-receipt" : "privacy-receipt" });
    const selected = purpose.startsWith("AUTH") ? auth.send : privacy.send;
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ to: input.payload.to, token: input.payload.token, idempotencyKey: input.metadata.messageKey, signal, purpose: purpose === "AUTH_VERIFY" ? "verify" : purpose === "AUTH_RESET" ? "reset" : purpose === "PRIVACY_EXPORT" ? "EXPORT" : "CLOSE" }));
    expect(purpose.startsWith("AUTH") ? privacy.send : auth.send).not.toHaveBeenCalled();
  });
  it("supports a void fixture receipt without inventing a provider reference", async () => {
    const sender = new CustomerOutboxSender({ auth: { send: async () => {} }, privacy: null });
    expect(await sender.send(message(), new AbortController().signal)).toEqual({ kind: "accepted", providerReference: null });
  });
  it.each(["AUTH_VERIFY", "PRIVACY_EXPORT"] as const)("rejects a missing %s mailer before delivery", purpose => {
    const sender = new CustomerOutboxSender({ auth: null, privacy: null });
    expect(() => sender.assertReady(purpose)).toThrow();
  });
  it("returns a safe unknown result for an unclassified sender failure", async () => {
    const sender = new CustomerOutboxSender({ auth: { send: async () => { throw new Error("synthetic-token-and-address-secret"); } }, privacy: null });
    expect(await sender.send(message(), new AbortController().signal)).toEqual({ kind: "unknown" });
  });
  it("snapshots mailer selection and rejects malformed dispatch without calling mailers", async () => {
    const auth = { send: vi.fn(async () => ({ id: "original" })) }, options = { auth, privacy: null };
    const sender = new CustomerOutboxSender(options); options.auth = { send: vi.fn(async () => ({ id: "replacement" })) };
    expect(await sender.send(message(), new AbortController().signal)).toMatchObject({ providerReference: "original" });
    auth.send.mockClear(); const input = message(); input.payload.returnTo = "//foreign.example.test";
    expect(await sender.send(input, new AbortController().signal)).toEqual({ kind: "permanent" }); expect(auth.send).not.toHaveBeenCalled();
  });
});

describe("outbox job authority boundary", () => {
  it.each(["dry-run", "execute"] as const)("denies %s before repository, cipher or sender allocation", async mode => {
    let allocated = false;
    const factory = () => { allocated = true; throw new Error("private-configuration-fixture"); };
    const authority = new BoundDatabaseService({ context: { env: { ...source, NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_DATABASE_BINDING_ID: randomUUID() }, hasActivationGrant: () => false }, repositoryFactory: factory });
    const worker = new DurableOutboxWorker({ bound: authority, repository: new PrismaOutboxWorkerRepository(), cipherFactory: factory, senderFactory: factory, policy: { leaseMs: 1000, sendTimeoutMs: 500, retryDelaysMs: [] } });
    await expect(worker.run({ mode, limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", status: 503 }); expect(allocated).toBe(false);
  });
  it("rejects malformed run input before authority or factories", async () => {
    const run = vi.fn(async () => { throw new Error("should not be called"); }), factory = () => { throw new Error("should not be allocated"); };
    const worker = new DurableOutboxWorker({ bound: { run }, repository: new PrismaOutboxWorkerRepository(), cipherFactory: factory, senderFactory: factory, policy: { leaseMs: 1000, sendTimeoutMs: 500, retryDelaysMs: [] } });
    await expect(worker.run({ mode: "execute", limit: 1, token: "private-token" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" }); expect(run).not.toHaveBeenCalled();
  });
  it("wraps unexpected binding failure without propagating its message", async () => {
    const run = vi.fn(async () => { throw new Error("private-database-fixture"); }), factory = () => { throw new Error("should not be allocated"); };
    const worker = new DurableOutboxWorker({ bound: { run }, repository: new PrismaOutboxWorkerRepository(), cipherFactory: factory, senderFactory: factory, policy: { leaseMs: 1000, sendTimeoutMs: 500, retryDelaysMs: [] } });
    try { await worker.run({ mode: "execute", limit: 1 }); expect.fail("must deny"); } catch (error) { expect(error).toMatchObject({ code: "PROVIDER_UNAVAILABLE" }); expect(String(error)).not.toContain("private-database-fixture"); }
  });
});

describe("Resend worker outcome boundary", () => {
  it.each([
    [429, "rate_limit_exceeded", "RETRYABLE"], [409, "concurrent_idempotent_requests", "RETRYABLE"],
    [429, "daily_quota_exceeded", "PERMANENT"], [429, "monthly_quota_exceeded", "PERMANENT"],
    [409, "invalid_idempotent_request", "PERMANENT"], [400, "validation_error", "PERMANENT"], [401, "missing_api_key", "PERMANENT"],
    [408, "timeout", "UNKNOWN"], [500, "application_error", "UNKNOWN"], [503, "service_unavailable", "UNKNOWN"],
  ])("classifies HTTP %s %s as %s without copying the response", async (status, name, kind) => {
    const gateway = new ResendEmailGateway({ apiKey: "synthetic-key", from: "hello@example.test", fetch: vi.fn(async () => Response.json({ name, message: "private-response-body" }, { status: Number(status) })) });
    await expect(gateway.send({ to: "buyer@example.test", subject: "Fixture", text: "synthetic-token", idempotencyKey: "fixture-message" })).rejects.toMatchObject({ kind, code: "PROVIDER_UNAVAILABLE", message: "Layanan email sedang tidak tersedia." });
  });
  it("carries numeric Retry-After for the worker's minimum cooldown", async () => {
    const gateway = new ResendEmailGateway({ apiKey: "synthetic-key", from: "hello@example.test", fetch: vi.fn(async () => Response.json({ name: "rate_limit_exceeded" }, { status: 429, headers: { "Retry-After": "30" } })) });
    await expect(gateway.send({ to: "buyer@example.test", subject: "Fixture", text: "fixture", idempotencyKey: "same-key" })).rejects.toMatchObject({ kind: "RETRYABLE", retryAfterMs: 30_000 });
  });
  it.each([["0x10", 0], ["Thu, 15 Oct 2026 00:00:00 GMT", 0], ["9999999999999999", 0], ["1.5", 1500]])("accepts only bounded decimal Retry-After %s", async (header, expected) => {
    const gateway = new ResendEmailGateway({ apiKey: "synthetic-key", from: "hello@example.test", fetch: vi.fn(async () => Response.json({ name: "rate_limit_exceeded" }, { status: 429, headers: { "Retry-After": String(header) } })) });
    await expect(gateway.send({ to: "buyer@example.test", subject: "Fixture", text: "fixture", idempotencyKey: "same-key" })).rejects.toMatchObject({ kind: "RETRYABLE", retryAfterMs: expected });
  });
  it.each([null, [], {}, { id: "" }, { id: " " }])("treats malformed success as unknown %#", async body => {
    const gateway = new ResendEmailGateway({ apiKey: "synthetic-key", from: "hello@example.test", fetch: vi.fn(async () => Response.json(body)) });
    await expect(gateway.send({ to: "buyer@example.test", subject: "Fixture", text: "fixture", idempotencyKey: "same-key" })).rejects.toMatchObject({ kind: "UNKNOWN" });
  });
  it("wraps network exceptions without cause or sensitive message", async () => {
    const gateway = new ResendEmailGateway({ apiKey: "synthetic-key", from: "hello@example.test", fetch: vi.fn(async () => { throw new Error("private-network-token"); }) });
    try { await gateway.send({ to: "buyer@example.test", subject: "Fixture", text: "fixture", idempotencyKey: "same-key" }); expect.fail("must fail"); } catch (error) {
      expect(error).toMatchObject({ kind: "UNKNOWN", code: "PROVIDER_UNAVAILABLE" }); expect(String(error)).not.toContain("private-network-token"); expect((error as Error).cause).toBeUndefined();
    }
  });
  it("passes the same idempotency key and signal to the configured fetch", async () => {
    const fakeFetch = vi.fn(async () => Response.json({ id: "provider-reference" })), signal = new AbortController().signal;
    const gateway = new ResendEmailGateway({ apiKey: "synthetic-key", from: "hello@example.test", fetch: fakeFetch });
    expect(await gateway.send({ to: "buyer@example.test", subject: "Fixture", text: "fixture", idempotencyKey: "same-key", signal })).toEqual({ id: "provider-reference" });
    expect(fakeFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ signal, headers: expect.objectContaining({ "Idempotency-Key": "same-key" }) }));
  });
});

describe("existing Customer mailer connection", () => {
  it("returns the auth provider receipt and preserves explicit source and abort", async () => {
    const fakeFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "auth-provider" }));
    const supplied = { ...source }, mailer = createCustomerAuthMailer(supplied), controller = new AbortController();
    supplied.NIUVA_PROVIDER_MODE = "live";
    expect(mailer).not.toBeNull();
    expect(await mailer!.send({ to: "buyer@example.test", token: "t".repeat(43), purpose: "verify", returnTo: "/account", idempotencyKey: "auth-queue-key", signal: controller.signal })).toEqual({ id: "auth-provider" });
    const sentSignal = fakeFetch.mock.calls[0][1]?.signal; controller.abort(); expect(sentSignal?.aborted).toBe(true);
  });
  it("returns privacy provider receipt from explicit internal source and preserves allowlist", async () => {
    const fakeFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "privacy-provider" }));
    const mailer = createPrivacyMailer(internalSource), controller = new AbortController();
    expect(mailer).not.toBeNull();
    expect(await mailer!.send({ to: "buyer@example.test", token: "t".repeat(43), purpose: "EXPORT", idempotencyKey: "privacy-queue-key", signal: controller.signal })).toEqual({ id: "privacy-provider" });
    const sentSignal = fakeFetch.mock.calls[0][1]?.signal; controller.abort(); expect(sentSignal?.aborted).toBe(true);
    fakeFetch.mockClear();
    await expect(mailer!.send({ to: "foreign@example.test", token: "t".repeat(43), purpose: "CLOSE", idempotencyKey: "foreign" })).rejects.toMatchObject({ code: "LOCAL_SETUP_DISABLED" }); expect(fakeFetch).not.toHaveBeenCalled();
  });
  it("keeps production factories closed before outbound requests", () => {
    const fakeFetch = vi.spyOn(globalThis, "fetch");
    expect(createCustomerAuthMailer({ ...source, NODE_ENV: "production" })).toBeNull();
    expect(createPrivacyMailer({ ...internalSource, NODE_ENV: "production" })).toBeNull(); expect(fakeFetch).not.toHaveBeenCalled();
  });
});
