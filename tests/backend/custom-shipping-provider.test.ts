import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createCustomShippingProvider } from "@/modules/shipping/custom-provider";
import type { BiteshipRateProvider } from "@/modules/shipping/biteship";

describe("custom shipping provider adapter", () => {
  it("maps the final package and selects the lowest normalized provider rate", async () => {
    const requests: unknown[] = [];
    const provider: BiteshipRateProvider = {
      async getRates(input) {
        requests.push(input);
        return [
          {
            courierCode: "jne",
            courierName: "JNE",
            priceRp: new Decimal("30000"),
            providerPayload: { price: 30000 },
            serviceCode: "reg",
            serviceName: "Reguler",
          },
          {
            courierCode: "sicepat",
            courierName: "SiCepat",
            priceRp: new Decimal("25000"),
            providerPayload: { price: 25000 },
            serviceCode: "best",
            serviceName: "Best",
          },
        ];
      },
    };

    const result = await createCustomShippingProvider(provider).getRate({
      context: {
        address: {
          addressLine: "Jl. Test 1",
          biteshipAreaId: "area-1",
          city: "Jakarta",
          countryCode: "ID",
          district: "Setiabudi",
          phone: "+62800000000",
          postalCode: "12910",
          province: "DKI Jakarta",
          recipientName: "Client",
        },
        grandTotalRp: "125000",
        orderNumber: "ORD-CUSTOM-1",
        orderType: "CUSTOM_PRINT",
        status: "FINISHING_QC",
      },
      measurement: {
        finalHeightCm: "4.5",
        finalLengthCm: "12",
        finalWeightGrams: "350",
        finalWidthCm: "8",
      },
      orderId: "order-1",
    });

    expect(requests[0]).toEqual({
      destination: {
        areaId: "area-1",
        countryCode: "ID",
        postalCode: "12910",
      },
      items: [
        {
          heightCm: 4.5,
          lengthCm: 12,
          name: "Custom print ORD-CUSTOM-1",
          quantity: 1,
          sku: "CUSTOM-order-1",
          valueRp: 125000,
          weightGrams: 350,
          widthCm: 8,
        },
      ],
    });
    expect(result).toMatchObject({
      courierCode: "sicepat",
      priceRp: new Decimal("25000"),
      serviceCode: "best",
    });
  });

  it("fails closed when the custom order has no shipping address", async () => {
    let providerCalls = 0;
    const provider: BiteshipRateProvider = {
      async getRates() {
        providerCalls += 1;
        return [];
      },
    };

    await expect(
      createCustomShippingProvider(provider).getRate({
        context: {
          address: null,
          orderNumber: "ORD-CUSTOM-2",
          orderType: "CUSTOM_PRINT",
          status: "FINISHING_QC",
        },
        measurement: {
          finalHeightCm: "4",
          finalLengthCm: "12",
          finalWeightGrams: "350",
          finalWidthCm: "8",
        },
        orderId: "order-2",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(providerCalls).toBe(0);
  });
});
