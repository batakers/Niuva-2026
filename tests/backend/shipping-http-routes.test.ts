import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  createBiteshipProvider: vi.fn(),
  createMidtransProvider: vi.fn(),
  getRate: vi.fn(),
  getRates: vi.fn(),
}));

vi.mock("@/modules/shipping/biteship", () => ({
  createBiteshipRateGatewayFromEnvironment: mocks.createBiteshipProvider,
}));

vi.mock("@/modules/shipping/retail-rate-service", () => ({
  RetailShippingRateService: class {
    getRate = mocks.getRate;
    getRates = mocks.getRates;
  },
}));

vi.mock("@/modules/payment/midtrans", () => ({
  createMidtransSnapGatewayFromEnvironment: mocks.createMidtransProvider,
}));

vi.mock("@/modules/checkout/service", () => ({
  CheckoutService: class {
    create = mocks.checkoutCreate;
  },
}));

import { POST as postCheckout } from "@/app/api/checkout/route";
import { POST as postShippingRates } from "@/app/api/shipping/rates/route";

function publicRequest(path: string, payload: unknown, includeOrigin = true): Request {
  const url = `https://app.example.test${path}`;

  return new Request(url, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      ...(includeOrigin ? { origin: "https://app.example.test" } : {}),
    },
    method: "POST",
  });
}

beforeEach(() => {
  mocks.checkoutCreate.mockReset();
  mocks.createBiteshipProvider.mockReset();
  mocks.createMidtransProvider.mockReset();
  mocks.getRate.mockReset();
  mocks.getRates.mockReset();
  mocks.createBiteshipProvider.mockReturnValue({ getRates: vi.fn() });
  mocks.createMidtransProvider.mockReturnValue({ createPayment: vi.fn() });
});

describe("retail shipping and checkout HTTP boundaries", () => {
  it("rejects cross-origin rate requests before creating a provider", async () => {
    const response = await postShippingRates(
      publicRequest(
        "/api/shipping/rates",
        { destination: { postalCode: "12240" }, items: [] },
        false,
      ),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "ORIGIN_NOT_ALLOWED",
    });
    expect(mocks.createBiteshipProvider).not.toHaveBeenCalled();
  });

  it("returns only public rate fields and delegates checkout to the service", async () => {
    const ratePayload = {
      destination: { countryCode: "ID", postalCode: "12240" },
      items: [{ quantity: 1, variantId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4" }],
    };
    mocks.getRates.mockResolvedValue({
      expiresAt: new Date("2026-09-05T09:05:00.000Z"),
      options: [
        {
          courierCode: "jne",
          courierName: "JNE",
          etaText: "2 - 3 days",
          optionId: "opaque-option",
          priceRp: { toString: () => "12500" },
          providerPayload: { shouldNotAppear: true },
          serviceCode: "reg",
          serviceName: "Reguler",
        },
      ],
    });
    mocks.checkoutCreate.mockResolvedValue({
      kind: "CREATED",
      orderAccessToken: { token: "order-access-token" },
      orderId: "order-id",
      orderNumber: "ORD-20260905-ABCDEFGH",
      payment: { redirectUrl: "https://payment.example.test/redirect", token: "snap-token" },
      paymentAttemptId: "payment-attempt-id",
      totalRp: "262500",
    });

    const rateResponse = await postShippingRates(
      publicRequest("/api/shipping/rates", ratePayload),
    );
    const checkoutPayload = {
      address: {
        addressLine: "Jl. Contoh",
        city: "Jakarta",
        countryCode: "ID",
        phone: "+628000000000",
        postalCode: "12240",
        province: "DKI Jakarta",
        recipientName: "Client",
      },
      customerEmail: "client@example.test",
      customerName: "Client",
      customerPhone: "+628000000000",
      idempotencyKey: "checkout-key-1",
      items: ratePayload.items,
      shippingOptionId: "opaque-option",
    };
    const checkoutResponse = await postCheckout(
      publicRequest("/api/checkout", checkoutPayload),
    );

    expect(rateResponse.status).toBe(200);
    await expect(rateResponse.json()).resolves.toEqual({
      expiresAt: "2026-09-05T09:05:00.000Z",
      options: [
        {
          courierCode: "jne",
          courierName: "JNE",
          etaText: "2 - 3 days",
          optionId: "opaque-option",
          priceRp: "12500",
          serviceCode: "reg",
          serviceName: "Reguler",
        },
      ],
    });
    expect(mocks.getRates).toHaveBeenCalledWith(ratePayload);
    expect(checkoutResponse.status).toBe(201);
    await expect(checkoutResponse.json()).resolves.toEqual({
      accessToken: "order-access-token",
      kind: "CREATED",
      orderId: "order-id",
      orderNumber: "ORD-20260905-ABCDEFGH",
      payment: {
        redirectUrl: "https://payment.example.test/redirect",
        token: "snap-token",
      },
      paymentAttemptId: "payment-attempt-id",
      totalRp: "262500",
    });
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(checkoutPayload);
  });
});
