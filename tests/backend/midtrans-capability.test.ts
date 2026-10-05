import { describe, expect, it, vi } from "vitest";

import {
  buildMidtransCapabilityContext,
  MidtransSnapGateway,
  type MidtransSnapGatewayConfig,
} from "@/modules/payment/midtrans";

const SECRET = "midtrans-secret-server-key-do-not-leak";
const CLOSED_GATES = { getStatus: () => ({ closed: true }) };

const baseConfig = {
  isProduction: false,
  nodeEnv: "test",
  serverKey: SECRET,
} as const satisfies MidtransSnapGatewayConfig;

const input = {
  amountRp: "12500",
  expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
  orderId: "order-1",
  orderNumber: "ORD-1",
  providerOrderId: "PAY-20260905-ABCDEFGH",
};

function run(config: MidtransSnapGatewayConfig) {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ token: "snap-token" }), { status: 201 }),
  );
  const gateway = new MidtransSnapGateway({ ...config, fetch: fetchMock });

  return { fetchMock, result: gateway.createPayment(input) };
}

async function expectDenied(config: MidtransSnapGatewayConfig, reason?: string) {
  const { fetchMock, result } = run(config);
  const error = await result.then(
    () => undefined,
    (thrown: unknown) => thrown as { code: string; message: string },
  );

  expect(error?.code).toBe("PROVIDER_UNAVAILABLE");
  expect(error?.message).not.toContain(SECRET);
  if (reason !== undefined) {
    expect(error?.message).toContain(reason);
  }
  expect(fetchMock).not.toHaveBeenCalled();
}

describe("Midtrans gateway capability resolution", () => {
  it("allows sandbox in the local-test tier", async () => {
    const { fetchMock, result } = run({
      ...baseConfig,
      capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" },
    });

    await expect(result).resolves.toEqual({ token: "snap-token" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("denies TIER_NOT_ALLOWED for the production tier", async () => {
    await expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_DEPLOYMENT_TIER: "production" } },
      "TIER_NOT_ALLOWED",
    );
  });

  it("denies TIER_NOT_ALLOWED for live provider mode", async () => {
    await expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_PROVIDER_MODE: "live" } },
      "TIER_NOT_ALLOWED",
    );
  });

  it("keeps the legacy production and live-provider rejections", async () => {
    await expectDenied({ ...baseConfig, nodeEnv: "production" }, "belum diaktifkan");
    await expectDenied({ ...baseConfig, isProduction: true }, "belum diaktifkan");
    await expectDenied(
      { ...baseConfig, capabilityEnv: { NODE_ENV: "production" } },
      "belum diaktifkan",
    );
  });

  it("denies RESOURCE_NOT_BOUND when the caller declares the database unbound", async () => {
    await expectDenied({ ...baseConfig, databaseBound: false }, "RESOURCE_NOT_BOUND");
  });

  it("denies CONFIG_INCOMPLETE when the server key is blank", async () => {
    await expectDenied({ ...baseConfig, serverKey: "   " }, "CONFIG_INCOMPLETE");
  });

  it("denies CONFIG_INCOMPLETE for an unreadable caller environment", async () => {
    await expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_PROVIDER_MODE: "bogus" } },
      "CONFIG_INCOMPLETE",
    );
  });

  it("denies POLICY_NOT_PUBLISHED in staging while the policy gate is open", async () => {
    await expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_DEPLOYMENT_TIER: "staging" } },
      "POLICY_NOT_PUBLISHED",
    );
  });

  it("denies ACTIVATION_NOT_GRANTED in staging without a recorded grant", async () => {
    await expectDenied(
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
    try {
      const context = buildMidtransCapabilityContext(baseConfig);

      expect(context.env?.NIUVA_PROVIDER_MODE).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
