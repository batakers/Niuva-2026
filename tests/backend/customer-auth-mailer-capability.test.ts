import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertCustomerAuthMailerAllowed,
  buildCustomerAuthMailerCapabilityContext,
  createCustomerAuthMailer,
  type CustomerAuthMailerCapabilityConfig,
} from "@/modules/customer-auth/email-mailer";

const API_KEY = "resend-api-key-do-not-leak";
const FROM = "Niuva <no-reply-private@example.test>";
const CLOSED_GATES = { getStatus: () => ({ closed: true }) };

const baseConfig = {
  apiKey: API_KEY,
  from: FROM,
  nodeEnv: "test",
} as const satisfies CustomerAuthMailerCapabilityConfig;

function expectDenied(config: CustomerAuthMailerCapabilityConfig, reason?: string) {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  let error: { code: string; message: string } | undefined;

  try {
    assertCustomerAuthMailerAllowed(config);
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

describe("Customer auth emailSender capability resolution", () => {
  it("allows sandbox in the local-test tier", () => {
    expect(() =>
      assertCustomerAuthMailerAllowed({
        ...baseConfig,
        capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" },
      }),
    ).not.toThrow();
  });

  it("denies TIER_NOT_ALLOWED for the production tier and live mode", () => {
    expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_DEPLOYMENT_TIER: "production" } },
      "TIER_NOT_ALLOWED",
    );
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

  it("denies CONFIG_INCOMPLETE for a blank key, blank sender or unreadable env", () => {
    expectDenied({ ...baseConfig, apiKey: "  " }, "CONFIG_INCOMPLETE");
    expectDenied({ ...baseConfig, from: "" }, "CONFIG_INCOMPLETE");
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

    expect(
      buildCustomerAuthMailerCapabilityContext(baseConfig).env?.NIUVA_PROVIDER_MODE,
    ).toBeUndefined();
    expect(() => assertCustomerAuthMailerAllowed(baseConfig)).not.toThrow();
  });

  it("denies sending from the factory without an outbound request or leaked values", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const mailer = createCustomerAuthMailer({
      APP_URL: "http://127.0.0.1:3000",
      EMAIL_FROM: FROM,
      NIUVA_DEPLOYMENT_TIER: "production",
      NODE_ENV: "test",
      RESEND_API_KEY: API_KEY,
    });
    let error: { code: string; message: string } | undefined;

    try {
      await mailer?.send({
        idempotencyKey: "k",
        purpose: "verify",
        returnTo: "/",
        to: "someone@example.test",
        token: "tok",
      });
    } catch (thrown) {
      error = thrown as { code: string; message: string };
    }

    expect(mailer).not.toBeNull();
    expect(error?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(error?.message).not.toContain(API_KEY);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
