import { describe, expect, it } from "vitest";
import { parseJobRequest, parseJobPolicy, parseJobResult } from "@/modules/jobs/core";
describe("operational job boundaries", () => {
  it("accepts only the server-defined jobs and bounded requests", () => {
    expect(parseJobRequest({ job: "OUTBOX_DELIVERY", mode: "dry-run", limit: 1 })).toEqual({ job: "OUTBOX_DELIVERY", mode: "dry-run", limit: 1 });
    for (const input of [{ job: "REFUND", mode: "execute", limit: 1 }, { job: "OUTBOX_DELIVERY", mode: "execute", limit: 101 }, { job: "OUTBOX_DELIVERY", mode: "execute", limit: 1, role: "admin" }]) expect(() => parseJobRequest(input)).toThrow();
  });
  it("requires explicit finite timing and snapshots the policy", () => {
    const input = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1000 }, policy = parseJobPolicy(input);
    input.leaseMs = 1; expect(policy.leaseMs).toBe(60000);
    for (const invalid of [{}, { ...input, leaseMs: Infinity }, { ...input, failureCooldownMs: 0 }, { ...input, minIntervalMs: -1 }]) expect(() => parseJobPolicy(invalid)).toThrow();
  });
  it("rejects unknown counters, nested data, recipient text and raw errors", () => {
    expect(parseJobResult({ counts: { scanned: 2, accepted: 1 }, cooldownMs: 5000 })).toMatchObject({ counts: { scanned: 2, accepted: 1 } });
    for (const raw of [{ counts: { token: 1 } }, { counts: { accepted: "private@example.test" } }, { counts: { failed: -1 } }, { counts: {}, rawError: "secret" }]) expect(() => parseJobResult(raw)).toThrow();
  });
});
