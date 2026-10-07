import "server-only";
import type { AdminAccess } from "@/lib/auth/admin";
import { loadAdminRecordLogged, recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { AdminOperationsService } from "@/modules/admin/operations";
import { CustomPrintEstimateService } from "@/modules/custom-print/estimate";
export function loadCustomPrintPageData(id: string, access: AdminAccess) {
  return loadAdminRecordLogged("page:/admin/custom-print/[id]", async () => {
    const service = new AdminOperationsService({ authorize: async () => access });
    const request = await service.getCustomPrintRequest(id);
    if (request === null) return null;
    const [pricing, activeRule, latestEstimate, linkedOrders] = await Promise.all([
      loadPricing(access), loadActivePricing(access),
      new CustomPrintEstimateService({ authorizeAdmin: async () => access }).latestForAdmin(id),
      service.getCustomPrintLinkedOrders(id),
    ]);
    return { request, pricing, activeRule, latestEstimate, linkedOrders };
  }, { id, op: "detail" });
}
export type CustomPrintPageData = Extract<Awaited<ReturnType<typeof loadCustomPrintPageData>>, { status: "found" }>["record"];
async function loadPricing(access: AdminAccess): Promise<Awaited<ReturnType<AdminOperationsService["listPricingRules"]>> | null> { try { return await new AdminOperationsService({ authorize: async () => access }).listPricingRules(); } catch (error) { recordAdminPageFailure(error, "page:/admin/custom-print/[id]", { op: "pricing-rules" }); return null; } }
async function loadActivePricing(access: AdminAccess): Promise<Awaited<ReturnType<AdminOperationsService["getActivePricingRule"]>> | null> { try { return await new AdminOperationsService({ authorize: async () => access }).getActivePricingRule(); } catch (error) { recordAdminPageFailure(error, "page:/admin/custom-print/[id]", { op: "active-pricing-rule" }); return null; } }
