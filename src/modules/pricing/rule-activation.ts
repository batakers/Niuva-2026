import type { Prisma } from "../../generated/prisma/client";
import { appError } from "../shared/errors";
import {
  CUSTOM_PRINT_V1_PER_UNIT_POLICY,
  CUSTOM_PRINT_V1_RULE_CODE,
  CUSTOM_PRINT_V1_RULE_VERSION,
  customPrintPricingPolicySchema,
} from "./policy";

// Shared by the loopback development form and the staging Owner script.
// Relative imports only: the staging script runs through jiti, which does not
// resolve the "@/" alias.

export type QuantitySemantics = "PER_UNIT" | "AGGREGATE";

export type PricingRuleActivationResult = Readonly<{
  code: string;
  id: string;
  idempotent: boolean;
  previousStatus: "ACTIVE" | "DRAFT" | "RETIRED" | null;
  quantitySemantics: QuantitySemantics;
  status: "ACTIVE";
  version: number;
}>;

export type PricingRuleActivationInput = Readonly<{
  approvedByAdminId: string;
  definitionJson: Prisma.InputJsonObject;
  quantitySemantics: QuantitySemantics;
}>;

/** The approved Pricing v1 values with the quantity semantics the Owner chose. */
export function customPrintV1Definition(quantitySemantics: QuantitySemantics): Prisma.InputJsonObject {
  const definition = customPrintPricingPolicySchema.parse({ ...CUSTOM_PRINT_V1_PER_UNIT_POLICY, quantitySemantics });
  return JSON.parse(JSON.stringify(definition)) as Prisma.InputJsonObject;
}

/**
 * Activates CUSTOM_PRINT_V1 v1. Idempotent for the same semantics; refuses to
 * replace another active version or switch semantics silently.
 */
export async function activateCustomPrintRuleInTransaction(
  transaction: Prisma.TransactionClient,
  input: PricingRuleActivationInput,
): Promise<PricingRuleActivationResult> {
  const otherActive = await transaction.pricingRuleVersion.findFirst({
    where: {
      code: CUSTOM_PRINT_V1_RULE_CODE,
      status: "ACTIVE",
      version: { not: CUSTOM_PRINT_V1_RULE_VERSION },
    },
    select: { id: true },
  });

  if (otherActive !== null) {
    throw appError("CONFLICT", {
      message:
        "Masih ada versi CUSTOM_PRINT_V1 lain yang aktif; pensiunkan versi tersebut terlebih dahulu.",
    });
  }

  const existing = await transaction.pricingRuleVersion.findUnique({
    where: {
      code_version: {
        code: CUSTOM_PRINT_V1_RULE_CODE,
        version: CUSTOM_PRINT_V1_RULE_VERSION,
      },
    },
    select: { definitionJson: true, id: true, status: true },
  });

  if (existing?.status === "ACTIVE") {
    const current = customPrintPricingPolicySchema.safeParse(existing.definitionJson);

    if (current.success && current.data.quantitySemantics === input.quantitySemantics) {
      return {
        code: CUSTOM_PRINT_V1_RULE_CODE,
        id: existing.id,
        idempotent: true,
        previousStatus: "ACTIVE",
        quantitySemantics: input.quantitySemantics,
        status: "ACTIVE",
        version: CUSTOM_PRINT_V1_RULE_VERSION,
      };
    }

    throw appError("CONFLICT", {
      message:
        "CUSTOM_PRINT_V1 sudah aktif dengan quantity semantics berbeda; tidak diubah diam-diam.",
    });
  }

  const row = existing === null
    ? await transaction.pricingRuleVersion.create({
        data: {
          approvedAt: new Date(),
          approvedByAdminId: input.approvedByAdminId,
          code: CUSTOM_PRINT_V1_RULE_CODE,
          definitionJson: input.definitionJson,
          status: "ACTIVE",
          version: CUSTOM_PRINT_V1_RULE_VERSION,
        },
        select: { id: true },
      })
    : await transaction.pricingRuleVersion.update({
        data: {
          approvedAt: new Date(),
          approvedByAdminId: input.approvedByAdminId,
          definitionJson: input.definitionJson,
          status: "ACTIVE",
        },
        where: { id: existing.id },
        select: { id: true },
      });

  return {
    code: CUSTOM_PRINT_V1_RULE_CODE,
    id: row.id,
    idempotent: false,
    previousStatus: existing?.status ?? null,
    quantitySemantics: input.quantitySemantics,
    status: "ACTIVE",
    version: CUSTOM_PRINT_V1_RULE_VERSION,
  };
}
