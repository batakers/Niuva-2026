import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { deriveActorKey } from "@/lib/security/actor-key";

const salt = "test-salt";
const endpoint = "POST /api/uploads/intents";

function keyFor(
  headers: Record<string, string>,
  overrides: { customerId?: string | null; endpointId?: string } = {},
): string {
  return deriveActorKey({
    endpointId: overrides.endpointId ?? endpoint,
    customerId: overrides.customerId,
    headers: new Headers(headers),
    processSalt: salt,
  });
}

function anonKey(ip: string, endpointId = endpoint): string {
  const digest = createHash("sha256").update(salt + ip).digest("hex");
  return `i:${endpointId}:${digest}`;
}

describe("deriveActorKey", () => {
  it("uses the customer key when a customer session exists", () => {
    expect(keyFor({ "x-real-ip": "1.1.1.1" }, { customerId: "cus_1" })).toBe(
      `c:${endpoint}:cus_1`,
    );
  });

  it("uses a salted hash key for anonymous actors", () => {
    expect(keyFor({ "x-real-ip": "1.1.1.1" })).toBe(anonKey("1.1.1.1"));
  });

  it("gives different keys for different IPs", () => {
    expect(keyFor({ "x-real-ip": "1.1.1.1" })).not.toBe(
      keyFor({ "x-real-ip": "2.2.2.2" }),
    );
  });

  it("gives different keys for the same IP on different endpoints", () => {
    const a = keyFor({ "x-real-ip": "1.1.1.1" }, { endpointId: "POST /a" });
    const b = keyFor({ "x-real-ip": "1.1.1.1" }, { endpointId: "POST /b" });
    expect(a).not.toBe(b);
    expect(a.startsWith("i:POST /a:")).toBe(true);
  });

  it("separates customer and anonymous keys", () => {
    const headers = { "x-real-ip": "1.1.1.1" };
    expect(keyFor(headers, { customerId: "cus_1" })).not.toBe(keyFor(headers));
  });

  it("treats empty or blank customerId as anonymous", () => {
    const headers = { "x-real-ip": "1.1.1.1" };
    expect(keyFor(headers, { customerId: "  " })).toBe(keyFor(headers));
    expect(keyFor(headers, { customerId: null })).toBe(keyFor(headers));
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(
      keyFor({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }),
    ).toBe(anonKey("1.1.1.1"));
  });

  it("uses the trimmed first x-forwarded-for entry when x-real-ip is absent", () => {
    expect(keyFor({ "x-forwarded-for": "  3.3.3.3 , 4.4.4.4" })).toBe(
      anonKey("3.3.3.3"),
    );
  });

  it("falls back to x-forwarded-for when x-real-ip is blank", () => {
    expect(
      keyFor({ "x-real-ip": "   ", "x-forwarded-for": "5.5.5.5" }),
    ).toBe(anonKey("5.5.5.5"));
  });

  it("uses 'unknown' when no IP header or only blank values exist", () => {
    expect(keyFor({})).toBe(anonKey("unknown"));
    expect(keyFor({ "x-forwarded-for": " , 1.1.1.1" })).toBe(
      anonKey("unknown"),
    );
  });

  it("truncates very long IP values to 64 characters", () => {
    const long = "a".repeat(200);
    expect(keyFor({ "x-real-ip": long })).toBe(anonKey("a".repeat(64)));
    expect(keyFor({ "x-real-ip": long + "b" })).toBe(keyFor({ "x-real-ip": long }));
  });

  it("never includes the raw IP in the key", () => {
    const ip = "203.0.113.77";
    expect(keyFor({ "x-real-ip": ip })).not.toContain(ip);
    expect(keyFor({ "x-forwarded-for": ip })).not.toContain(ip);
  });

  it("changes the key when the process salt changes", () => {
    const headers = new Headers({ "x-real-ip": "1.1.1.1" });
    const a = deriveActorKey({ endpointId: endpoint, headers, processSalt: "s1" });
    const b = deriveActorKey({ endpointId: endpoint, headers, processSalt: "s2" });
    expect(a).not.toBe(b);
  });

  it("is stable within a process when no salt is injected", () => {
    const headers = new Headers({ "x-real-ip": "1.1.1.1" });
    expect(deriveActorKey({ endpointId: endpoint, headers })).toBe(
      deriveActorKey({ endpointId: endpoint, headers }),
    );
  });
});
