import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EnvironmentValidationError,
  getServerCapabilities,
  parseServerEnvironment,
  validateStartupEnvironment,
} from "@/lib/env/server";
import {
  createMidtransSnapGatewayFromEnvironment,
  MidtransSnapGateway,
} from "@/modules/payment/midtrans";

const SANDBOX_ENDPOINT = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const CUSTOM_ENDPOINT = "https://snap.staging.example.test/snap/v1/transactions";
const PRODUCTION_ENDPOINT = "https://app.midtrans.com/snap/v1/transactions";

const providerEnv = {
  MIDTRANS_IS_PRODUCTION: "false",
  MIDTRANS_SERVER_KEY: "test-only-server-key",
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "test-only-client-key",
  NODE_ENV: "test",
} as const;

const paymentInput = {
  amountRp: "12500",
  // The environment factory uses the real clock, so expiry is relative to now.
  expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
  orderId: "order-id-not-sent",
  orderNumber: "ORD-NOT-SENT",
  providerOrderId: "PAY-20260905-ABCDEFGH",
};

function stubFetch(): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ token: "snap-token" }), { status: 201 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MIDTRANS_SNAP_ENDPOINT schema", () => {
  it("accepts an HTTPS URL and keeps it trimmed", () => {
    expect(
      parseServerEnvironment({ MIDTRANS_SNAP_ENDPOINT: `  ${CUSTOM_ENDPOINT}  ` })
        .MIDTRANS_SNAP_ENDPOINT,
    ).toBe(CUSTOM_ENDPOINT);
  });

  it.each([undefined, "", "   "])("treats %j as not configured", (value) => {
    expect(
      parseServerEnvironment({ MIDTRANS_SNAP_ENDPOINT: value })
        .MIDTRANS_SNAP_ENDPOINT,
    ).toBeUndefined();
  });

  it.each([
    "http://snap.staging.example.test/snap/v1/transactions",
    "https://user:secret@snap.staging.example.test/snap/v1/transactions",
    "https://user@snap.staging.example.test/snap/v1/transactions",
    "https://:secret@snap.staging.example.test/snap/v1/transactions",
    "ftp://snap.staging.example.test/snap",
    "not a url",
    "snap.staging.example.test/snap/v1/transactions",
  ])("rejects %j and names the field", (value) => {
    let thrown: unknown;
    try {
      parseServerEnvironment({ MIDTRANS_SNAP_ENDPOINT: value });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(EnvironmentValidationError);
    expect((thrown as EnvironmentValidationError).fields).toEqual([
      "MIDTRANS_SNAP_ENDPOINT",
    ]);
    expect((thrown as Error).message).not.toContain("secret");
  });

  it("stays outside provider capability groups", () => {
    expect(
      getServerCapabilities({ MIDTRANS_SNAP_ENDPOINT: CUSTOM_ENDPOINT }),
    ).toEqual(getServerCapabilities({}));
    expect(
      getServerCapabilities({ ...providerEnv, MIDTRANS_SNAP_ENDPOINT: CUSTOM_ENDPOINT }),
    ).toEqual(getServerCapabilities(providerEnv));
    expect(() =>
      validateStartupEnvironment({ MIDTRANS_SNAP_ENDPOINT: CUSTOM_ENDPOINT }),
    ).not.toThrow();
  });
});

describe("createMidtransSnapGatewayFromEnvironment endpoint", () => {
  it.each([undefined, ""])(
    "calls the sandbox endpoint when the endpoint is %j",
    async (value) => {
      const fetchMock = stubFetch();
      const gateway = createMidtransSnapGatewayFromEnvironment({
        ...providerEnv,
        MIDTRANS_SNAP_ENDPOINT: value,
      });

      await gateway.createPayment(paymentInput);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(SANDBOX_ENDPOINT);
    },
  );

  it("calls the configured endpoint when it is set", async () => {
    const fetchMock = stubFetch();
    const gateway = createMidtransSnapGatewayFromEnvironment({
      ...providerEnv,
      MIDTRANS_SNAP_ENDPOINT: CUSTOM_ENDPOINT,
    });

    await gateway.createPayment(paymentInput);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(CUSTOM_ENDPOINT);
  });

  it("rejects an insecure or credentialed endpoint before any provider call", () => {
    const fetchMock = stubFetch();

    for (const value of [
      "http://snap.staging.example.test/snap/v1/transactions",
      "https://user:secret@snap.staging.example.test/snap/v1/transactions",
    ]) {
      expect(() =>
        createMidtransSnapGatewayFromEnvironment({
          ...providerEnv,
          MIDTRANS_SNAP_ENDPOINT: value,
        }),
      ).toThrow(EnvironmentValidationError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("production provider guard is unchanged by the endpoint setting", () => {
  it.each([
    ["NODE_ENV=production", { MIDTRANS_IS_PRODUCTION: "false", NODE_ENV: "production" }],
    ["MIDTRANS_IS_PRODUCTION=true", { MIDTRANS_IS_PRODUCTION: "true", NODE_ENV: "test" }],
  ])(
    "refuses a production endpoint with %s from the environment",
    (_label, overrides) => {
      const fetchMock = stubFetch();

      expect(() =>
        createMidtransSnapGatewayFromEnvironment({
          ...providerEnv,
          ...overrides,
          MIDTRANS_SNAP_ENDPOINT: PRODUCTION_ENDPOINT,
        }),
      ).toThrowError(expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }));
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["nodeEnv=production", { isProduction: false, nodeEnv: "production" as const }],
    ["isProduction=true", { isProduction: true, nodeEnv: "test" as const }],
  ])(
    "refuses createPayment to a production endpoint with %s",
    async (_label, mode) => {
      const fetchImplementation = vi.fn<typeof fetch>();
      const gateway = new MidtransSnapGateway({
        ...mode,
        endpoint: PRODUCTION_ENDPOINT,
        fetch: fetchImplementation,
        serverKey: "test-only-server-key",
      });

      await expect(gateway.createPayment(paymentInput)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
      });
      expect(fetchImplementation).not.toHaveBeenCalled();
    },
  );
});
