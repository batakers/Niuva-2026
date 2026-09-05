import Decimal from "decimal.js";

import { appError } from "@/modules/shared/errors";

export const MoneyDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export type DecimalInput = Decimal | string;

export function toDecimal(value: DecimalInput, field: string): Decimal {
  if (typeof value !== "string" && !(value instanceof Decimal)) {
    throw appError("VALIDATION_ERROR", {
      details: { [field]: "Nilai harus berupa string decimal atau Decimal." },
    });
  }

  let decimal: Decimal;
  try {
    decimal = new MoneyDecimal(value);
  } catch {
    throw appError("VALIDATION_ERROR", {
      details: { [field]: "Nilai decimal tidak valid." },
    });
  }

  if (!decimal.isFinite()) {
    throw appError("VALIDATION_ERROR", {
      details: { [field]: "Nilai decimal harus finite." },
    });
  }

  return decimal;
}

export function roundFinalTotal(value: Decimal): Decimal {
  return value.toDecimalPlaces(0, MoneyDecimal.ROUND_HALF_UP);
}
