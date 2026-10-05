import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDevAllowedOrigins,
  isValidDevOrigin,
  parseDevOriginList,
} from "@/lib/env/dev-origins";
import {
  EnvironmentValidationError,
  getServerCapabilities,
  parseServerEnvironment,
  validateStartupEnvironment,
} from "@/lib/env/server";

const FIELD = "NIUVA_DEV_ALLOWED_ORIGINS";

describe("NIUVA_DEV_ALLOWED_ORIGINS schema field", () => {
  it("is undefined when unset, blank, or only separators", () => {
    expect(parseServerEnvironment({})[FIELD]).toBeUndefined();
    expect(parseServerEnvironment({ [FIELD]: "" })[FIELD]).toBeUndefined();
    expect(parseServerEnvironment({ [FIELD]: "   " })[FIELD]).toBeUndefined();
    expect(parseServerEnvironment({ [FIELD]: " , ," })[FIELD]).toBeUndefined();
  });

  it("accepts and trims a comma-separated list of hosts, IPs, and wildcard domains", () => {
    expect(parseServerEnvironment({ [FIELD]: " 192.0.2.10 " })[FIELD]).toEqual([
      "192.0.2.10",
    ]);
    expect(
      parseServerEnvironment({
        [FIELD]: "192.0.2.10, dev.example.test ,*.lan.example.test,",
      })[FIELD],
    ).toEqual(["192.0.2.10", "dev.example.test", "*.lan.example.test"]);
  });

  it.each([
    "http://192.0.2.10",
    "192.0.2.10:3000",
    "dev.example.test/path",
    "user:pass@dev.example.test",
    "dev example.test",
    "192.0.2.10, bad host",
    "192.0.2.10,http://evil.test",
    "*",
    "**",
    "*.com",
    "*.168.1.11",
    "a.*.example.test",
    "[::1]",
    "-bad.example.test",
    "dev..example.test",
  ])("rejects %j with the field name", (value) => {
    expect(() => parseServerEnvironment({ [FIELD]: value })).toThrow(
      EnvironmentValidationError,
    );
    expect(() => parseServerEnvironment({ [FIELD]: value })).toThrow(FIELD);
  });

  it("does not change capabilities or startup validation", () => {
    const source = { [FIELD]: "192.0.2.10,*.lan.example.test" };

    expect(getServerCapabilities(source)).toEqual(getServerCapabilities({}));
    expect(() => validateStartupEnvironment(source)).not.toThrow();
  });
});

describe("dev origin parsing shared with next.config.ts", () => {
  it("defaults to an empty list", () => {
    expect(getDevAllowedOrigins({})).toEqual([]);
    expect(getDevAllowedOrigins({ [FIELD]: "" })).toEqual([]);
  });

  it("passes valid entries and ignores invalid ones without throwing", () => {
    expect(
      getDevAllowedOrigins({
        [FIELD]: "192.0.2.10, http://bad.test, 198.51.100.7:3000 ,dev.example.test",
      }),
    ).toEqual(["192.0.2.10", "dev.example.test"]);
    expect(parseDevOriginList("ok.example.test,bad host")).toEqual({
      invalid: ["bad host"],
      valid: ["ok.example.test"],
    });
  });

  it("accepts localhost-style single labels but not bare wildcards", () => {
    expect(isValidDevOrigin("localhost")).toBe(true);
    expect(isValidDevOrigin("**.lan.example.test")).toBe(true);
    expect(isValidDevOrigin("*.test")).toBe(false);
  });
});

describe("next.config.ts allowedDevOrigins", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is empty by default and holds no hardcoded LAN address", async () => {
    vi.stubEnv(FIELD, "");
    vi.resetModules();
    const { default: config } = await import("../../next.config");

    expect(config.allowedDevOrigins).toEqual([]);
  });

  it("forwards valid env entries and survives a malformed value", async () => {
    vi.stubEnv(FIELD, "192.0.2.10, http://bad.test");
    vi.resetModules();
    const { default: config } = await import("../../next.config");

    expect(config.allowedDevOrigins).toEqual(["192.0.2.10"]);
  });
});
