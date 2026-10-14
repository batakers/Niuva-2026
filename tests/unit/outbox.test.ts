import { describe, expect, it } from "vitest";
import { outboxIdentity, parseOutboxInput, type ProofProjection } from "@/modules/outbox/core";
import { OutboxPayloadCipher, readOutboxCipherConfig } from "@/modules/outbox/cipher";

const token = "a".repeat(43);
const key = Buffer.alloc(32, 7).toString("base64");
const secondKey = Buffer.alloc(32, 9).toString("base64");
const proof: ProofProjection = {
  kind: "AUTH", proofId: "9be320fd-d173-4117-a39b-cc45bd9e1178", purpose: "AUTH_VERIFY",
  to: "fixture@example.test", tokenHash: "stored-proof-hash", returnTo: "/checkout",
  ownerId: "a66474c6-edb6-46ed-b116-e603358ee50b", sessionHash: null,
  expiresAt: new Date("2030-01-01T00:15:00Z"),
};
const metadata = {
  id: "bf9688d1-4266-458d-b3f0-31f433cc8706", proofKind: proof.kind, proofId: proof.proofId,
  purpose: proof.purpose, templateVersion: "v1" as const, ...outboxIdentity(proof), expiresAt: proof.expiresAt,
};
const payload = { to: "fixture@example.test", token, returnTo: "/checkout" };
function cipher() { return new OutboxPayloadCipher({ activeKeyId: "fixture-v1", keys: { "fixture-v1": key } }); }

describe("outbox identity and input boundary", () => {
  it.each(["AUTH", "PRIVACY"])("accepts an explicit %s proof without destination/deadline authority", kind => {
    expect(parseOutboxInput({ kind, proofId: proof.proofId, token })).toEqual({ kind, proofId: proof.proofId, token });
  });
  it.each([
    null, {}, { kind: "OTHER", proofId: proof.proofId, token },
    { kind: "AUTH", proofId: "bad-id", token }, { kind: "AUTH", proofId: proof.proofId, token: "short" },
    { kind: "AUTH", proofId: proof.proofId, token, to: "attacker@example.test" },
    { kind: "AUTH", proofId: proof.proofId, token, expiresAt: "2099-01-01" },
  ])("rejects malformed or caller-authoritative input %#", raw => {
    try { parseOutboxInput(raw); expect.fail("must reject input"); }
    catch (error) { expect(error).toMatchObject({ code: "VALIDATION_ERROR" }); expect(String(error)).not.toContain(token); }
  });
  it("derives one logical message from the proof and template", () => {
    expect(outboxIdentity(proof).messageKey).toBe("auth:auth_verify:v1:9be320fd-d173-4117-a39b-cc45bd9e1178");
    expect(outboxIdentity({ ...proof })).toEqual(outboxIdentity(proof));
  });
  it.each([
    { to: "changed@example.test" }, { returnTo: "/account" }, { tokenHash: "replacement-proof-hash" },
    { ownerId: "df99ecb9-c74a-451b-8604-4d66a4318341" }, { sessionHash: "new-session" },
    { expiresAt: new Date("2030-01-01T00:16:00Z") },
  ])("detects an immutable projection change %#", mutation => {
    expect(outboxIdentity({ ...proof, ...mutation }).fingerprint).not.toBe(outboxIdentity(proof).fingerprint);
  });
});

describe("sealed outbox payload", () => {
  it("encrypts recipient and token with a fresh nonce and authenticates the round trip", () => {
    const writer = cipher(), first = writer.seal(payload, metadata), second = writer.seal(payload, metadata);
    expect(first).not.toBe(second);
    expect(first).not.toContain(payload.to); expect(first).not.toContain(token);
    expect(writer.open(first, metadata)).toEqual(payload);
  });
  it("supports rotation while retained keys remain available", () => {
    const first = cipher().seal(payload, metadata);
    const rotated = new OutboxPayloadCipher({ activeKeyId: "fixture-v2", keys: { "fixture-v1": key, "fixture-v2": secondKey } });
    expect(rotated.open(first, metadata)).toEqual(payload);
    expect(rotated.open(rotated.seal(payload, metadata), metadata)).toEqual(payload);
    expect(() => new OutboxPayloadCipher({ activeKeyId: "fixture-v2", keys: { "fixture-v2": secondKey } }).open(first, metadata)).toThrow();
  });
  it("snapshots caller-owned key material", () => {
    const keys = { "fixture-v1": key }, writer = new OutboxPayloadCipher({ activeKeyId: "fixture-v1", keys });
    const sealed = writer.seal(payload, metadata); keys["fixture-v1"] = secondKey;
    expect(writer.open(sealed, metadata)).toEqual(payload);
  });
  it.each([{ ...payload, to: "not-email" }, { ...payload, token: "short" }, { ...payload, returnTo: "//external.example.test" }])("rejects invalid payload before encryption %#", invalid => {
    expect(() => cipher().seal(invalid, metadata)).toThrow();
  });
  it("rejects a wrong key even when its identifier matches", () => {
    const wrong = new OutboxPayloadCipher({ activeKeyId: "fixture-v1", keys: { "fixture-v1": secondKey } });
    expect(() => wrong.open(cipher().seal(payload, metadata), metadata)).toThrow();
  });
  it("authenticates the key identifier even if two identifiers share key bytes", () => {
    const writer = new OutboxPayloadCipher({ activeKeyId: "fixture-v1", keys: { "fixture-v1": key, alias: key } });
    const sealed = writer.seal(payload, metadata); expect(sealed.length).toBeGreaterThan(0);
    const envelope = JSON.parse(sealed) as { kid: string }; envelope.kid = "alias";
    expect(() => writer.open(JSON.stringify(envelope), metadata)).toThrow();
  });
  it.each([
    { id: "bb16a18c-b61e-4280-9c78-7ee30f803e46" }, { messageKey: "different-message" },
    { proofId: "bb16a18c-b61e-4280-9c78-7ee30f803e46" }, { fingerprint: "f".repeat(64) },
    { expiresAt: new Date("2030-01-01T00:16:00Z") },
  ])("rejects ciphertext after bound metadata changes %#", mutation => {
    expect(() => cipher().open(cipher().seal(payload, metadata), { ...metadata, ...mutation })).toThrow();
  });
  it("rejects a modified tag without returning plaintext or private details", () => {
    const writer = cipher();
    const sealed = writer.seal(payload, metadata);
    expect(sealed.length).toBeGreaterThan(0);
    const envelope = JSON.parse(sealed) as { tag: string };
    envelope.tag = Buffer.alloc(16).toString("base64");
    try { writer.open(JSON.stringify(envelope), metadata); expect.fail("must reject tamper"); }
    catch (error) { for (const value of [token, key, payload.to]) expect(String(error)).not.toContain(value); }
  });
  it.each(["not-json", "{}", JSON.stringify({ v: 99 }), "x".repeat(9000)])("rejects malformed/oversized envelopes %#", value => {
    expect(() => cipher().open(value, metadata)).toThrow();
  });
  it.each([{}, { NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "fixture-v1" },
    { NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "bad key id", NIUVA_OUTBOX_ENCRYPTION_KEY: key },
    { NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "fixture-v1", NIUVA_OUTBOX_ENCRYPTION_KEY: "not-a-key" },
    { NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "fixture-v1", NIUVA_OUTBOX_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64") },
  ])("fails closed for missing/invalid explicit cipher config %#", source => {
    expect(() => readOutboxCipherConfig(source)).toThrow();
  });
  it("reads only explicit server config and returns a usable cipher", () => {
    const config = readOutboxCipherConfig({ NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "fixture-v1", NIUVA_OUTBOX_ENCRYPTION_KEY: key });
    expect(new OutboxPayloadCipher(config).open(new OutboxPayloadCipher(config).seal(payload, metadata), metadata)).toEqual(payload);
  });
});
