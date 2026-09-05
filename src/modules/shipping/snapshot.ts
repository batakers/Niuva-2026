type ShippingPayloadValue = boolean | number | string | null;

const SHIPPING_PAYLOAD_KEYS = [
  "courierCode",
  "courierName",
  "etaText",
  "priceRp",
  "serviceCode",
  "serviceName",
] as const;

type ShippingPayloadKey = (typeof SHIPPING_PAYLOAD_KEYS)[number];

export type ShippingRatePayload = Readonly<
  Partial<Record<ShippingPayloadKey, ShippingPayloadValue>>
>;

function isShippingPayloadValue(value: unknown): value is ShippingPayloadValue {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

export function minimizeShippingRatePayload(
  payload: Readonly<Record<string, unknown>>,
): ShippingRatePayload {
  const result: Partial<Record<ShippingPayloadKey, ShippingPayloadValue>> = {};

  for (const key of SHIPPING_PAYLOAD_KEYS) {
    const value = payload[key];

    if (isShippingPayloadValue(value)) {
      result[key] = value;
    }
  }

  return result;
}
