import Decimal from "decimal.js";

import { appError } from "@/modules/shared/errors";

import {
  parseActiveCustomPrintPricingPolicy,
  type CustomPrintPricingPolicy,
} from "./policy";
import {
  MoneyDecimal,
  roundFinalTotal,
  toDecimal,
  type DecimalInput,
} from "./rounding";

export type PrintMaterial = "PLA" | "ABS";
export type FilamentSource = "NIUVA_STOCK" | "CUSTOMER_OWN" | "COMMUNAL";
export type QuantitySemantics = "PER_UNIT" | "AGGREGATE";
export type PricingPolicy = CustomPrintPricingPolicy;

export type StandardPrintInput = Readonly<{
  filamentSource: FilamentSource;
  material: PrintMaterial;
  policy: PricingPolicy;
  printDurationSeconds: number;
  quantity: number;
  weightGrams: DecimalInput;
}>;

export type PrintCalculation = Readonly<{
  finalTotalRp: Decimal;
  machineSubtotalRp: Decimal;
  materialSubtotalRp: Decimal;
  unroundedTotalRp: Decimal;
}>;

const ZERO = new MoneyDecimal(0);
const FIRST_TIER_GRAMS = new MoneyDecimal(200);
const SECOND_TIER_GRAMS = new MoneyDecimal(300);
const SECONDS_PER_HOUR = new MoneyDecimal(3_600);

function assertNonNegative(value: Decimal, field: string): void {
  if (value.isNegative()) {
    throw appError("VALIDATION_ERROR", {
      details: { [field]: "Nilai tidak boleh negatif." },
    });
  }
}

function assertPositiveQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw appError("VALIDATION_ERROR", {
      details: { quantity: "Quantity harus berupa bilangan bulat positif." },
    });
  }
}

function assertNonNegativeSeconds(seconds: number): void {
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    throw appError("VALIDATION_ERROR", {
      details: {
        printDurationSeconds: "Durasi harus berupa detik nonnegatif yang valid.",
      },
    });
  }
}

function tieredMaterialSubtotal(
  weightGrams: Decimal,
  rates: readonly [Decimal, Decimal, Decimal],
): Decimal {
  const firstTier = Decimal.min(weightGrams, FIRST_TIER_GRAMS);
  const secondTier = Decimal.min(
    Decimal.max(weightGrams.minus(FIRST_TIER_GRAMS), ZERO),
    SECOND_TIER_GRAMS,
  );
  const thirdTier = Decimal.max(
    weightGrams.minus(FIRST_TIER_GRAMS).minus(SECOND_TIER_GRAMS),
    ZERO,
  );

  return firstTier
    .times(rates[0])
    .plus(secondTier.times(rates[1]))
    .plus(thirdTier.times(rates[2]));
}

function standardMaterialRates(
  policy: PricingPolicy,
  material: PrintMaterial,
): readonly [Decimal, Decimal, Decimal] {
  const rates = policy.standardNiuvaStockRateRpPerGram[material];

  return [
    new MoneyDecimal(rates[0]),
    new MoneyDecimal(rates[1]),
    new MoneyDecimal(rates[2]),
  ];
}

function standardSubtotal(
  input: StandardPrintInput,
  policy: PricingPolicy,
  weightGrams: Decimal,
): PrintCalculation {
  const quantity = new MoneyDecimal(input.quantity);
  const duration = new MoneyDecimal(input.printDurationSeconds);
  const rates = standardMaterialRates(policy, input.material);
  const unitMaterial = tieredMaterialSubtotal(weightGrams, rates);
  const unitMachine = duration
    .dividedBy(SECONDS_PER_HOUR)
    .times(policy.standardPrintTimeRateRpPerHour);

  const materialSubtotal =
    policy.quantitySemantics === "PER_UNIT"
      ? unitMaterial.times(quantity)
      : tieredMaterialSubtotal(weightGrams.times(quantity), rates);
  const machineSubtotal = unitMachine.times(quantity);
  const unroundedTotal = materialSubtotal.plus(machineSubtotal);

  return {
    finalTotalRp: roundFinalTotal(unroundedTotal),
    machineSubtotalRp: machineSubtotal,
    materialSubtotalRp: materialSubtotal,
    unroundedTotalRp: unroundedTotal,
  };
}

function ownFilamentSubtotal(
  input: StandardPrintInput,
  policy: PricingPolicy,
  weightGrams: Decimal,
): PrintCalculation {
  const ratePerGram = policy.customerOwnedFilamentRateRpPerGram[input.material];
  const materialSubtotal = weightGrams
    .times(ratePerGram)
    .times(input.quantity);

  return {
    finalTotalRp: roundFinalTotal(materialSubtotal),
    machineSubtotalRp: ZERO,
    materialSubtotalRp: materialSubtotal,
    unroundedTotalRp: materialSubtotal,
  };
}

function communalFilamentSubtotal(
  input: StandardPrintInput,
  policy: PricingPolicy,
  weightGrams: Decimal,
): PrintCalculation {
  const ratePerGram = policy.communalFilamentRateRpPerGram[input.material];
  const materialSubtotal = weightGrams
    .times(ratePerGram)
    .times(input.quantity);

  return {
    finalTotalRp: roundFinalTotal(materialSubtotal),
    machineSubtotalRp: ZERO,
    materialSubtotalRp: materialSubtotal,
    unroundedTotalRp: materialSubtotal,
  };
}

export function calculatePrintQuote(input: StandardPrintInput): PrintCalculation {
  const weightGrams = toDecimal(input.weightGrams, "weightGrams");
  const policy = parseActiveCustomPrintPricingPolicy(input.policy);

  assertNonNegative(weightGrams, "weightGrams");
  assertPositiveQuantity(input.quantity);
  assertNonNegativeSeconds(input.printDurationSeconds);

  if (input.filamentSource === "CUSTOMER_OWN") {
    return ownFilamentSubtotal(input, policy, weightGrams);
  }

  if (input.filamentSource === "COMMUNAL") {
    return communalFilamentSubtotal(input, policy, weightGrams);
  }

  return standardSubtotal(input, policy, weightGrams);
}
