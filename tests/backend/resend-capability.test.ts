import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertResendDeliveryAllowed,
  buildResendCapabilityContext,
  createInquiryAdminNotificationFromEnvironment,
  type ResendDeliveryCapabilityConfig,
} from "@/modules/notifications/resend";

const API_KEY = "resend-api-key-do-not-leak";
const ADMIN = "admin-private@example.test";
const FROM = "Niuva <no-reply-private@example.test>";
const CLOSED_GATES = { getStatus: () => ({ closed: true }) };

const baseConfig = {
  apiKey: API_KEY,
  from: FROM,
  nodeEnv: "test",
} as const satisfies ResendDeliveryCapabilityConfig;

function expectDenied(config: ResendDeliveryCapabilityConfig, reason?: string) {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  let error: { code: string; message: string } | undefined;

  try {
    assertResendDeliveryAllowed(config);
  } catch (thrown) {
    error = thrown as { code: string; message: string };
  }

  expect(error?.code).toBe("PROVIDER_UNAVAILABLE");
  expect(error?.message).not.toContain(API_KEY);
  expect(error?.message).not.toContain("example.test");
  if (reason !== undefined) {
    expect(error?.message).toContain(reason);
  }
  expect(fetchSpy).not.toHaveBeenCalled();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Resend emailDelivery capability resolution", () => {
  it("allows sandbox in the local-test tier", () => {
    expect(() =>
      assertResendDeliveryAllowed({
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

  it("denies RESOURCE_NOT_BOUND when the caller declares the database unbound", () => {
    expectDenied({ ...baseConfig, databaseBound: false }, "RESOURCE_NOT_BOUND");
  });

  it("denies CONFIG_INCOMPLETE for a blank API key or sender", () => {
    expectDenied({ ...baseConfig, apiKey: "  " }, "CONFIG_INCOMPLETE");
    expectDenied({ ...baseConfig, from: "" }, "CONFIG_INCOMPLETE");
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

    const context = buildResendCapabilityContext(baseConfig);

    expect(context.env?.NIUVA_PROVIDER_MODE).toBeUndefined();
    expect(() => assertResendDeliveryAllowed(baseConfig)).not.toThrow();
  });

  it("applies the gate to the environment factory without leaking values", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const source = {
      ADMIN_NOTIFICATION_EMAIL: ADMIN,
      EMAIL_FROM: FROM,
      NIUVA_DEPLOYMENT_TIER: "production",
      NODE_ENV: "test",
      RESEND_API_KEY: API_KEY,
    };
    let error: { code: string; message: string } | undefined;

    try {
      createInquiryAdminNotificationFromEnvironment(source);
    } catch (thrown) {
      error = thrown as { code: string; message: string };
    }

    expect(error?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(error?.message).not.toContain(API_KEY);
    expect(error?.message).not.toContain("example.test");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
