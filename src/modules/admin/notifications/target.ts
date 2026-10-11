import { z } from "zod";
import { PrismaActivityTargetReader } from "./target-repository";

export type ActivityTargetInput = Readonly<{ id: string; entityType: string; entityId: string; action: string }>;
export type ActivityDestination = Readonly<{ kind: "order" | "inquiry" | "proposal" | "custom-print" | "review" | "product" | "portfolio" | "privacy" | "admins" | "pricing" | "invoice" | "expense" | "site-information" | "payment" | "billing" | "billing-settings"; id: string }>;
export interface ActivityTargetReader { lookup(event: ActivityTargetInput): Promise<ActivityDestination | null> }

export async function resolveActivityTarget(event: ActivityTargetInput, reader: ActivityTargetReader = new PrismaActivityTargetReader()): Promise<string | null> {
  if (!z.uuid().safeParse(event.entityId).success) return null;
  if (["B2BInquiry", "B2BQuote", "B2BBillingTerms"].includes(event.entityType)) return null;
  const target = await reader.lookup(event);
  if (target === null || !z.uuid().safeParse(target.id).success) return null;
  if (["inquiry", "proposal", "billing"].includes(target.kind)) return null;
  const routes: Record<ActivityDestination["kind"], string | null> = {
    order: `/admin/orders/${target.id}`, inquiry: null,
    proposal: null, "custom-print": `/admin/custom-print/${target.id}`,
    review: `/admin/custom-print/${target.id}/review`, product: `/admin/products/${target.id}`,
    portfolio: `/admin/portfolio/${target.id}`, privacy: `/admin/privacy/${target.id}`,
    admins: "/admin/admins", pricing: "/admin/settings/custom-print-rates", "site-information": "/admin/content/site-information",
    invoice: `/admin/finance/invoices/${target.id}`, expense: `/admin/finance/expenses/${target.id}`,
    payment: `/admin/finance/payments/${target.id}`, billing: null, "billing-settings": "/admin/finance/settings",
  };
  return routes[target.kind];
}
