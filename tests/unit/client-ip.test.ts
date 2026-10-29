import { describe, expect, it } from "vitest";

import { clientIpCandidate, HOSTED_CLIENT_IP_HEADER, trustedClientIpHeaders } from "@/lib/security/client-ip";

const spoofed = { "x-forwarded-for": "9.9.9.9, 203.0.113.5", "x-real-ip": "8.8.4.4" };

describe("clientIpCandidate", () => {
  it.each(["staging", "production"])("trusts only the platform connection header on %s", (tier) => {
    const source = { NIUVA_DEPLOYMENT_TIER: tier };
    expect(clientIpCandidate(new Headers({ ...spoofed, [HOSTED_CLIENT_IP_HEADER]: " 203.0.113.5 " }), source)).toBe("203.0.113.5");
    // A spoofed forwarded header must never pick a fresh bucket on a hosted tier.
    expect(clientIpCandidate(new Headers(spoofed), source)).toBeNull();
    expect(clientIpCandidate(new Headers({ ...spoofed, [HOSTED_CLIENT_IP_HEADER]: "  " }), source)).toBeNull();
  });

  it.each([undefined, "", "local-test", "development"])("keeps the forwarded headers for local tier %s", (tier) => {
    const source = { NIUVA_DEPLOYMENT_TIER: tier };
    expect(clientIpCandidate(new Headers(spoofed), source)).toBe("8.8.4.4");
    expect(clientIpCandidate(new Headers({ "x-forwarded-for": " 3.3.3.3 , 4.4.4.4" }), source)).toBe("3.3.3.3");
    expect(clientIpCandidate(new Headers({ [HOSTED_CLIENT_IP_HEADER]: "203.0.113.5" }), source)).toBeNull();
  });

  it("truncates long values to 64 characters", () => {
    expect(clientIpCandidate(new Headers({ [HOSTED_CLIENT_IP_HEADER]: "a".repeat(200) }), { NIUVA_DEPLOYMENT_TIER: "staging" })).toBe("a".repeat(64));
  });
});

describe("trustedClientIpHeaders", () => {
  it("names the platform header only on hosted tiers", () => {
    expect(trustedClientIpHeaders({ NIUVA_DEPLOYMENT_TIER: "staging" })).toEqual([HOSTED_CLIENT_IP_HEADER]);
    expect(trustedClientIpHeaders({ NIUVA_DEPLOYMENT_TIER: "production" })).toEqual([HOSTED_CLIENT_IP_HEADER]);
    expect(trustedClientIpHeaders({ NIUVA_DEPLOYMENT_TIER: "local-test" })).toBeUndefined();
    expect(trustedClientIpHeaders({})).toBeUndefined();
  });
});
