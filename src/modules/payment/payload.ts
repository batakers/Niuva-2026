type Scalar = boolean | number | string | null;

const PAYMENT_EVENT_KEYS = [
  "fraudStatus",
  "grossAmount",
  "orderId",
  "statusCode",
  "transactionId",
  "transactionStatus",
] as const;

type PaymentEventKey = (typeof PAYMENT_EVENT_KEYS)[number];

export type PaymentEventPayload = Readonly<
  Partial<Record<PaymentEventKey, Scalar>>
>;

function isScalar(value: unknown): value is Scalar {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

export function minimizePaymentEventPayload(
  payload: Readonly<Record<string, unknown>>,
): PaymentEventPayload | undefined {
  const result: Partial<Record<PaymentEventKey, Scalar>> = {};

  for (const key of PAYMENT_EVENT_KEYS) {
    const value = payload[key];

    if (isScalar(value)) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
