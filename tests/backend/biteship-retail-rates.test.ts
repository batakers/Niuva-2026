import Decimal from "decimal.js";
import { describe, expect, it, vi } from "vitest";

import {
  BiteshipRateGateway,
  type BiteshipRateProvider,
} from "@/modules/shipping/biteship";
import {
  RetailShippingRateService,
  type RetailShippingCatalogRepository,
} from "@/modules/shipping/retail-rate-service";

const NOW = new Date("2026-09-05T09:00:00.000Z");
const VARIANT_ID = "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4";

function providerResponse() {
  return {
    pricing: [
      {
        courier_code: "jne",
        courier_name: "JNE",
        courier_service_code: "reg",
        courier_service_name: "Reguler",
        currency: "IDR",
        duration: "2 - 3 days",
        price: 12_500,
      },
    ],
    success: true,
  };
}

function catalogRepository(
  overrides: Partial<Awaited<ReturnType<RetailShippingCatalogRepository["findPublishedVariants"]>>[number]> = {},
): RetailShippingCatalogRepository {
  return {
    async findPublishedVariants() {
      return [
        {
          heightCm: new Decimal("4"),
          id: VARIANT_ID,
          lengthCm: new Decimal("20"),
          priceRp: new Decimal("250000"),
          productName: "Lamp",
          sku: "LAMP-01",
          variantName: "Small",
          weightGrams: new Decimal("450"),
          widthCm: new Decimal("10"),
          ...overrides,
        },
      ];
    },
  };
}

function rateProvider(): BiteshipRateProvider {
  return {
    async getRates() {
      return [
        {
          courierCode: "jne",
          courierName: "JNE",
          etaText: "2 - 3 days",
          priceRp: new Decimal("12500"),
          providerPayload: {
            courierCode: "jne",
            priceRp: 12_500,
            serviceCode: "reg",
          },
          serviceCode: "reg",
          serviceName: "Reguler",
        },
      ];
    },
  };
}

describe("Biteship non-production rate gateway", () => {
  it("sends only server-owned package data and normalizes the final provider price", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImplementation: typeof fetch = async (input, init) => {
      calls.push({ input, init });
      return new Response(JSON.stringify(providerResponse()), { status: 200 });
    };
    const gateway = new BiteshipRateGateway({
      apiKey: "biteship_test.local-example",
      couriers: ["jne", "sicepat"],
      fetch: fetchImplementation,
      nodeEnv: "test",
      originAreaId: "IDNP6IDNC148IDND836IDZ12410",
    });

    const rates = await gateway.getRates({
      destination: {
        areaId: "IDNP6IDNC148IDND836IDZ12430",
        countryCode: "ID",
        postalCode: "12240",
      },
      items: [
        {
          heightCm: 4,
          lengthCm: 20,
          name: "Lamp — Small",
          quantity: 1,
          sku: "LAMP-01",
          valueRp: 250_000,
          weightGrams: 450,
          widthCm: 10,
        },
      ],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(
      "https://api.biteship.com/v1/rates/couriers",
    );
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe(
      "biteship_test.local-example",
    );
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      couriers: "jne,sicepat",
      destination_area_id: "IDNP6IDNC148IDND836IDZ12430",
      items: [
        {
          height: 4,
          length: 20,
          name: "Lamp — Small",
          quantity: 1,
          sku: "LAMP-01",
          value: 250_000,
          weight: 450,
          width: 10,
        },
      ],
      origin_area_id: "IDNP6IDNC148IDND836IDZ12410",
    });
    expect(rates).toEqual([
      {
        courierCode: "jne",
        courierName: "JNE",
        etaText: "2 - 3 days",
        priceRp: new Decimal("12500"),
        providerPayload: {
          courierCode: "jne",
          courierName: "JNE",
          etaText: "2 - 3 days",
          priceRp: 12_500,
          serviceCode: "reg",
          serviceName: "Reguler",
        },
        serviceCode: "reg",
        serviceName: "Reguler",
      },
    ]);
  });

  it("refuses a live key before any outbound request", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const gateway = new BiteshipRateGateway({
      apiKey: "biteship_live.example",
      couriers: ["jne"],
      fetch: fetchImplementation,
      nodeEnv: "test",
      originAreaId: "origin-area",
    });

    await expect(
      gateway.getRates({
        destination: { countryCode: "ID", postalCode: "12240" },
        items: [],
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("fails closed when the provider does not respond before the timeout", async () => {
    let aborted = false;
    const fetchImplementation: typeof fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    const gateway = new BiteshipRateGateway({
      apiKey: "biteship_test.local-example",
      couriers: ["jne"],
      fetch: fetchImplementation,
      nodeEnv: "test",
      originAreaId: "origin-area",
      timeoutMs: 1,
    });

    await expect(
      gateway.getRates({
        destination: { countryCode: "ID", postalCode: "12240" },
        items: [],
      }),
    ).rejects.toMatchObject({ code: "SHIPPING_PROVIDER_UNAVAILABLE" });
    expect(aborted).toBe(true);
  });
});

describe("retail shipping rate service", () => {
  it("loads package facts from the catalog and revalidates a selected option", async () => {
    const provider = rateProvider();
    const providerSpy = vi.spyOn(provider, "getRates");
    const service = new RetailShippingRateService({
      now: () => NOW,
      provider,
      repository: catalogRepository(),
    });
    const request = {
      destination: { countryCode: "ID" as const, postalCode: "12240" },
      items: [{ quantity: 2, variantId: VARIANT_ID }],
    };

    const rates = await service.getRates(request);
    const selected = await service.getRate({
      address: {
        addressLine: "Jl. Contoh",
        city: "Jakarta",
        countryCode: "ID",
        phone: "+628000000000",
        postalCode: "12240",
        province: "DKI Jakarta",
        recipientName: "Client",
      },
      items: request.items,
      optionId: rates.options[0]!.optionId,
    });

    expect(providerSpy).toHaveBeenCalledWith({
      destination: { countryCode: "ID", postalCode: "12240" },
      items: [
        {
          heightCm: 4,
          lengthCm: 20,
          name: "Lamp — Small",
          quantity: 2,
          sku: "LAMP-01",
          valueRp: 250_000,
          weightGrams: 450,
          widthCm: 10,
        },
      ],
    });
    expect(rates.expiresAt).toEqual(new Date("2026-09-05T09:05:00.000Z"));
    expect(rates.options[0]).toMatchObject({
      priceRp: new Decimal("12500"),
      serviceCode: "reg",
    });
    expect(rates.options[0]).not.toHaveProperty("providerPayload");
    expect(selected.catalogFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(selected.priceRp.toString()).toBe("12500");
  });

  it("fails closed when catalog package data is incomplete or the option changed", async () => {
    const missingDimensions = new RetailShippingRateService({
      provider: rateProvider(),
      repository: catalogRepository({ widthCm: null }),
    });

    await expect(
      missingDimensions.getRates({
        destination: { countryCode: "ID", postalCode: "12240" },
        items: [{ quantity: 1, variantId: VARIANT_ID }],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const service = new RetailShippingRateService({
      provider: rateProvider(),
      repository: catalogRepository(),
    });
    await expect(
      service.getRate({
        address: {
          addressLine: "Jl. Contoh",
          city: "Jakarta",
          countryCode: "ID",
          phone: "+628000000000",
          postalCode: "12240",
          province: "DKI Jakarta",
          recipientName: "Client",
        },
        items: [{ quantity: 1, variantId: VARIANT_ID }],
        optionId: "not-a-provider-option",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
