import Decimal from "decimal.js";

import { appError } from "@/modules/shared/errors";

import type {
  BiteshipRate,
  BiteshipRateProvider,
} from "./biteship";
import type {
  CustomShippingProvider,
  ShippingProviderRate,
} from "./service";

export function createCustomShippingProvider(
  provider: BiteshipRateProvider,
): CustomShippingProvider {
  return {
    async getRate({ context, measurement, orderId }) {
      const address = context.address;

      if (address === null) {
        throw appError("CONFLICT", {
          message: "Order custom belum memiliki alamat pengiriman.",
        });
      }

      if (address.countryCode.toUpperCase() !== "ID") {
        throw appError("VALIDATION_ERROR", {
          details: { countryCode: "Shipping custom saat ini hanya mendukung Indonesia." },
        });
      }

      const rates = await provider.getRates({
        destination: {
          ...(address.biteshipAreaId === null
            ? {}
            : { areaId: address.biteshipAreaId }),
          countryCode: "ID",
          postalCode: address.postalCode,
        },
        items: [
          {
            heightCm: providerNumber(measurement.finalHeightCm, "finalHeightCm"),
            lengthCm: providerNumber(measurement.finalLengthCm, "finalLengthCm"),
            name: `Custom print ${context.orderNumber}`,
            quantity: 1,
            sku: `CUSTOM-${orderId}`,
            valueRp: providerMoney(context.grandTotalRp),
            weightGrams: providerNumber(
              measurement.finalWeightGrams,
              "finalWeightGrams",
            ),
            widthCm: providerNumber(measurement.finalWidthCm, "finalWidthCm"),
          },
        ],
      });

      const selected = selectLowestRate(rates);

      if (selected === null) {
        throw appError("SHIPPING_PROVIDER_UNAVAILABLE", {
          message: "Tidak ada opsi pengiriman untuk paket custom ini.",
        });
      }

      return toCustomRate(selected);
    },
  };
}

function selectLowestRate(rates: readonly BiteshipRate[]): BiteshipRate | null {
  return rates.reduce<BiteshipRate | null>(
    (lowest, current) =>
      lowest === null || current.priceRp.lessThan(lowest.priceRp)
        ? current
        : lowest,
    null,
  );
}

function toCustomRate(rate: BiteshipRate): ShippingProviderRate {
  return {
    courierCode: rate.courierCode,
    courierName: rate.courierName,
    ...(rate.etaText === undefined ? {} : { etaText: rate.etaText }),
    priceRp: new Decimal(rate.priceRp.toString()),
    providerPayload: rate.providerPayload,
    serviceCode: rate.serviceCode,
    serviceName: rate.serviceName,
  };
}

function providerNumber(value: string, field: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw appError("VALIDATION_ERROR", {
      details: { [field]: "Nilai pengukuran harus lebih besar dari nol." },
    });
  }

  return parsed;
}

function providerMoney(value: string | undefined): number {
  if (value === undefined) return 0;

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw appError("VALIDATION_ERROR", {
      details: { grandTotalRp: "Nilai order custom tidak valid untuk provider." },
    });
  }

  return parsed;
}
