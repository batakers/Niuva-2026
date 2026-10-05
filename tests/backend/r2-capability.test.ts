import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildR2CapabilityContext,
  R2PrivateObjectStorage,
  type R2PrivateStorageConfig,
} from "@/modules/files/r2";

const ACCESS_KEY = "r2-access-key-do-not-leak";
const SECRET = "r2-secret-key-do-not-leak";
const CLOSED_GATES = { getStatus: () => ({ closed: true }) };

const baseConfig = {
  accessKeyId: ACCESS_KEY,
  endpoint: "https://account.r2.cloudflarestorage.com",
  nodeEnv: "test",
  privateBucket: "niuva-private",
  secretAccessKey: SECRET,
} as const satisfies R2PrivateStorageConfig;

function expectDenied(config: R2PrivateStorageConfig, reason?: string) {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  let error: { code: string; message: string } | undefined;

  try {
    new R2PrivateObjectStorage(config);
  } catch (thrown) {
    error = thrown as { code: string; message: string };
  }

  expect(error?.code).toBe("PROVIDER_UNAVAILABLE");
  expect(error?.message).not.toContain(ACCESS_KEY);
  expect(error?.message).not.toContain(SECRET);
  expect(error?.message).not.toContain("cloudflarestorage");
  if (reason !== undefined) {
    expect(error?.message).toContain(reason);
  }
  expect(fetchSpy).not.toHaveBeenCalled();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("R2 private storage capability resolution", () => {
  it("allows sandbox in the local-test tier", () => {
    expect(
      () =>
        new R2PrivateObjectStorage({
          ...baseConfig,
          capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" },
        }),
    ).not.toThrow();
  });

  it("denies TIER_NOT_ALLOWED for the production tier", () => {
    expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_DEPLOYMENT_TIER: "production" } },
      "TIER_NOT_ALLOWED",
    );
  });

  it("denies TIER_NOT_ALLOWED for live provider mode", () => {
    expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_PROVIDER_MODE: "live" } },
      "TIER_NOT_ALLOWED",
    );
  });

  it("keeps the legacy production rejections", () => {
    expectDenied({ ...baseConfig, nodeEnv: "production" }, "belum diaktifkan");
    expectDenied(
      { ...baseConfig, capabilityEnv: { NODE_ENV: "production" } },
      "belum diaktifkan",
    );
  });

  it("denies RESOURCE_NOT_BOUND when the caller declares private storage unbound", () => {
    expectDenied({ ...baseConfig, privateStorageBound: false }, "RESOURCE_NOT_BOUND");
  });

  it("denies when the R2 configuration is missing", () => {
    expectDenied({ ...baseConfig, secretAccessKey: "  " }, "ditolak");
    expectDenied({ ...baseConfig, endpoint: "" }, "ditolak");
  });

  it("denies CONFIG_INCOMPLETE for an unreadable caller environment", () => {
    expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_PROVIDER_MODE: "bogus" } },
      "CONFIG_INCOMPLETE",
    );
  });

  it("denies ACTIVATION_NOT_GRANTED in staging without a recorded grant", () => {
    expectDenied(
      {
        ...baseConfig,
        capabilityEnv: { NIUVA_DEPLOYMENT_TIER: "staging" },
        gates: CLOSED_GATES,
      },
      "ACTIVATION_NOT_GRANTED",
    );
  });

  it("uses the injected environment, not process.env", () => {
    vi.stubEnv("NIUVA_PROVIDER_MODE", "live");

    const context = buildR2CapabilityContext(baseConfig);

    expect(context.env?.NIUVA_PROVIDER_MODE).toBeUndefined();
    expect(() => new R2PrivateObjectStorage(baseConfig)).not.toThrow();
  });
});
