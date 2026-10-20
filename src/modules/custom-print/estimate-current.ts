import { z } from "zod";

export function isEstimateCurrent(snapshot: unknown, reviewUpdatedAt: Date | null | undefined, activePricingRuleId?: string): boolean {
  if (reviewUpdatedAt == null) return false;
  const parsed = z.object({ reviewUpdatedAt: z.iso.datetime(), pricingRule: z.object({ id: z.uuid() }).optional() }).safeParse(snapshot);
  return parsed.success && parsed.data.reviewUpdatedAt === reviewUpdatedAt.toISOString() &&
    (activePricingRuleId === undefined || parsed.data.pricingRule?.id === activePricingRuleId);
}
