import Decimal from "decimal.js";
export const MoneyDecimal = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export function sumMoney(values: readonly string[]): string { return values.reduce((sum, value) => sum.plus(value), new MoneyDecimal(0)).toFixed(0); }
export function remainingMoney(total: string, paid: string): string { return MoneyDecimal.max(new MoneyDecimal(total).minus(paid), 0).toFixed(0); }
