import { parseActiveCustomPrintPricingPolicy, type CustomPrintPricingPolicy } from "@/modules/pricing/policy";

import { CustomPrintRequestRepository } from "./repository";

type RuleRepository = Pick<CustomPrintRequestRepository, "findActiveCustomerPreviewRules">;

/**
 * The active Pricing v1 rule for the public calculator: exactly one valid per-unit rule, as in the
 * request form's simulation. Anything else, including a database failure, keeps the calculator unavailable.
 */
export async function readPublicEstimatePolicy(
  createRepository: () => RuleRepository = () => new CustomPrintRequestRepository(),
): Promise<CustomPrintPricingPolicy | null> {
  try {
    const rules = await createRepository().findActiveCustomerPreviewRules();
    if (rules.length !== 1) return null;
    const policy = parseActiveCustomPrintPricingPolicy(rules[0].definitionJson);
    return rules[0].version === policy.version && policy.quantitySemantics === "PER_UNIT" ? policy : null;
  } catch {
    return null;
  }
}
