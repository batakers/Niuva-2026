import type { DatabaseBindingExpectation } from "../database-binding/core";
import type { DatabaseBindingRepository } from "../database-binding/repository";
import { checkStagingOperatorEnvironment, type StagingOperatorEnvironmentFailure } from "../database-binding/staging-operator";
import {
  activateCustomPrintRuleInTransaction,
  customPrintV1Definition,
  type PricingRuleActivationResult,
  type QuantitySemantics,
} from "./rule-activation";

// One-off Owner activation of the approved Pricing v1 rule on the staging
// database (Owner E7, 28 October 2026), so MAKE can be priced there. The values
// are the reviewed CUSTOM_PRINT_V1 literals; the Owner types the quantity
// semantics, which is never defaulted. Never calls a provider.

export const STAGING_PRICING_CONFIRMATION = "I_UNDERSTAND_STAGING_PRICING_ACTIVATION";

export class StagingPricingActivationError extends Error {
  constructor(readonly reason: "CONFIRMATION_REQUIRED" | "QUANTITY_SEMANTICS_REQUIRED" | "OWNER_NOT_UNIQUE" | StagingOperatorEnvironmentFailure) {
    super(`Aktivasi pricing staging ditolak (${reason}).`);
    this.name = "StagingPricingActivationError";
  }
}

export function assertStagingPricingActivationEnvironment(
  source: Readonly<Record<string, string | undefined>>,
): Readonly<{ expected: DatabaseBindingExpectation; quantitySemantics: QuantitySemantics }> {
  if (source.PRICING_ACTIVATION_CONFIRMATION !== STAGING_PRICING_CONFIRMATION) throw new StagingPricingActivationError("CONFIRMATION_REQUIRED");
  const quantitySemantics = source.PRICING_QUANTITY_SEMANTICS;
  if (quantitySemantics !== "PER_UNIT" && quantitySemantics !== "AGGREGATE") throw new StagingPricingActivationError("QUANTITY_SEMANTICS_REQUIRED");
  const checked = checkStagingOperatorEnvironment(source);
  if (!checked.ok) throw new StagingPricingActivationError(checked.reason);
  return { expected: checked.expected, quantitySemantics };
}

export async function activateStagingPricingRule(
  bindings: DatabaseBindingRepository,
  expected: DatabaseBindingExpectation,
  quantitySemantics: QuantitySemantics,
): Promise<PricingRuleActivationResult> {
  return bindings.withVerifiedBinding(expected, async tx => {
    // Same lock as the Admin tariff editor, so the two never interleave.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-custom-print-rates'))`;
    // The Owner runs this script, so the approval is attributed to the single active Owner.
    const owners = await tx.adminProfile.findMany({ where: { role: "OWNER", isActive: true }, select: { id: true }, take: 2 });
    const owner = owners.length === 1 ? owners[0] : undefined;
    if (!owner) throw new StagingPricingActivationError("OWNER_NOT_UNIQUE");
    const definitionJson = customPrintV1Definition(quantitySemantics);
    const result = await activateCustomPrintRuleInTransaction(tx, { approvedByAdminId: owner.id, definitionJson, quantitySemantics });
    if (!result.idempotent) {
      await tx.auditLog.create({
        data: {
          action: "pricing-rule.activated",
          actorId: owner.id,
          actorType: "ADMIN",
          afterJson: { code: result.code, definition: definitionJson, status: result.status, version: result.version },
          beforeJson: result.previousStatus === null ? undefined : { status: result.previousStatus },
          entityId: result.id,
          entityType: "PricingRuleVersion",
          metadataJson: { operation: "activate-staging", quantitySemantics: result.quantitySemantics },
        },
      });
    }
    return result;
  }, { maxWait: 10_000, timeout: 60_000 });
}
