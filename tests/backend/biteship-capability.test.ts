import { describe, expect, it, vi } from "vitest";

import {
  BiteshipRateGateway,
  buildBiteshipCapabilityContext,
  type BiteshipRateGatewayConfig,
} from "@/modules/shipping/biteship";

const SECRET = "biteship_test.secret-key-do-not-leak";
const CLOSED_GATES = { getStatus: () => ({ closed: true }) };

const baseConfig = {
  apiKey: SECRET,
  couriers: ["jne"],
  nodeEnv: "test",
  originAreaId: "origin-area",
} as const satisfies BiteshipRateGatewayConfig;

const request = {
  destination: { countryCode: "ID", postalCode: "12240" },
  items: [],
} as const;

function pricingResponse() {
  return {
    pricing: [
      {
        courier_code: "jne",
        courier_name: "JNE",
        courier_service_code: "reg",
        courier_service_name: "Reguler",
        currency: "IDR",
        price: 10_000,
      },
    ],
    success: true,
  };
}

function run(config: BiteshipRateGatewayConfig) {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(pricingResponse()), { status: 200 }),
  );
  const gateway = new BiteshipRateGateway({ ...config, fetch: fetchMock });

  return { fetchMock, result: gateway.getRates(request) };
}

async function expectDenied(config: BiteshipRateGatewayConfig, reason?: string) {
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

describe("Biteship gateway capability resolution", () => {
  it("allows sandbox in the local-test tier", async () => {
    const { fetchMock, result } = run({
      ...baseConfig,
      capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" },
    });

    await expect(result).resolves.toHaveLength(1);
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

  it("keeps the legacy production and live-key rejections", async () => {
    await expectDenied({ ...baseConfig, nodeEnv: "production" }, "belum diaktifkan");
    await expectDenied(
      { ...baseConfig, apiKey: "biteship_live.secret-live-key" },
      "belum diaktifkan",
    );
    await expectDenied(
      { ...baseConfig, capabilityEnv: { NODE_ENV: "production" } },
      "belum diaktifkan",
    );
  });

  it("denies RESOURCE_NOT_BOUND when the caller declares the database unbound", async () => {
    await expectDenied({ ...baseConfig, databaseBound: false }, "RESOURCE_NOT_BOUND");
  });

  it("denies CONFIG_INCOMPLETE when the API key is blank", async () => {
    await expectDenied({ ...baseConfig, apiKey: "   " }, "CONFIG_INCOMPLETE");
  });

  it("denies CONFIG_INCOMPLETE for an unreadable caller environment", async () => {
    await expectDenied(
      { ...baseConfig, capabilityEnv: { NIUVA_PROVIDER_MODE: "bogus" } },
      "CONFIG_INCOMPLETE",
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
      const context = buildBiteshipCapabilityContext(baseConfig);

      expect(context.env?.NIUVA_PROVIDER_MODE).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
