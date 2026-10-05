import { describe, expect, it } from "vitest";

import { resolveAppOrigin } from "@/lib/env/origin";

const ok = (tier: "production" | "staging" | "local-test", appUrl: string | undefined) =>
  resolveAppOrigin({ tier, appUrl });

describe("resolveAppOrigin", () => {
  it.each(["production", "staging"] as const)("accepts https origin on %s and normalizes", (tier) => {
    for (const value of [
      "https://niuva.example",
      "https://niuva.example/",
      "HTTPS://Niuva.EXAMPLE:443/",
      "  https://niuva.example  ",
    ]) {
      expect(ok(tier, value)).toEqual({
        ok: true,
        origin: "https://niuva.example",
        allowedOrigins: ["niuva.example"],
      });
    }

    expect(ok(tier, "https://niuva.example:8443")).toEqual({
      ok: true,
      origin: "https://niuva.example:8443",
      allowedOrigins: ["niuva.example:8443"],
    });
  });

  it.each([
    ["http://niuva.example", "insecure-scheme"],
    ["ftp://niuva.example", "insecure-scheme"],
    ["javascript:alert(1)", "insecure-scheme"],
    ["https://user:pw@niuva.example", "credentials"],
    ["https://niuva.example@evil.example", "credentials"],
    ["https://niuva.example/app", "path"],
    ["https://niuva.example?x=1", "path"],
    ["https://niuva.example#x", "path"],
    ["https://*.niuva.example", "wildcard"],
    ["https://niuva.example\\@evil.example", "malformed"],
    ["https://niuva.example%2f.evil.example", "malformed"],
    ["https://niuva.example\r\nX: y", "malformed"],
    ["https://niuva .example", "malformed"],
    ["https://localhost", "disallowed-host"],
    ["https://127.0.0.1", "disallowed-host"],
    ["https://niuva.example.", "disallowed-host"],
    ["https://intranet", "disallowed-host"],
    ["niuva.example", "malformed"],
    ["", "missing"],
    ["   ", "missing"],
    [undefined, "missing"],
  ] as const)("rejects %j in production and staging", (value, reason) => {
    expect(ok("production", value)).toEqual({ ok: false, reason });
    expect(ok("staging", value)).toEqual({ ok: false, reason });
  });

  it("allows loopback http/https on local-test only", () => {
    expect(ok("local-test", "http://localhost:3000")).toMatchObject({
      ok: true,
      origin: "http://localhost:3000",
      allowedOrigins: ["localhost:3000"],
    });
    expect(ok("local-test", "http://127.0.0.1:3100/")).toMatchObject({
      ok: true,
      origin: "http://127.0.0.1:3100",
    });
    expect(ok("local-test", "http://[::1]:3000")).toMatchObject({ ok: true });
    expect(ok("local-test", "HTTP://LOCALHOST:80")).toMatchObject({
      ok: true,
      origin: "http://localhost",
    });
  });

  it("rejects non-loopback and malformed values on local-test, including missing", () => {
    expect(ok("local-test", "http://niuva.example")).toEqual({ ok: false, reason: "disallowed-host" });
    expect(ok("local-test", "http://localhost.evil.example")).toEqual({ ok: false, reason: "disallowed-host" });
    expect(ok("local-test", "http://localhost@evil.example")).toEqual({ ok: false, reason: "credentials" });
    expect(ok("local-test", "http://localhost/path")).toEqual({ ok: false, reason: "path" });
    expect(ok("local-test", undefined)).toEqual({ ok: false, reason: "missing" });
  });

  it("is deterministic", () => {
    const first = ok("production", "https://Niuva.example/");

    expect(ok("production", "https://Niuva.example/")).toEqual(first);
    expect(ok("production", "https://niuva.example")).toEqual(first);
  });
});
