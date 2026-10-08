import { randomUUID } from "node:crypto";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
export const financePrisma = getPrismaClient();
export async function financeActor(role: "OWNER" | "ADMIN" = "OWNER"): Promise<AdminAccess> { const profile = await financePrisma.adminProfile.create({ data: { role, isActive: true } }); return { authUserId: randomUUID(), profile: { id: profile.id, role, isActive: true } }; }
export async function financeOrder(totalRp = "100000") {
  const product = await financePrisma.product.create({ data: { slug: `test-fin-${randomUUID()}`, name: "Synthetic Finance Product", description: "Synthetic automated TEST fixture", variants: { create: { sku: randomUUID(), name: "Fixture", priceRp: totalRp, weightGrams: "100" } } }, include: { variants: true } });
  return financePrisma.order.create({ data: { orderNumber: `TEST-FIN-${randomUUID()}`, orderType: "RETAIL", customerName: "Synthetic Finance Fixture", customerEmail: "synthetic-finance@example.test", customerPhone: "+628000000000", grandTotalRp: totalRp, itemsSubtotalRp: totalRp, shippingTotalRp: "0", publicTokenHash: randomUUID(), items: { create: { variantId: product.variants[0]!.id, itemType: "PRODUCT", nameSnapshot: "Synthetic fixture product", unitPriceRp: totalRp, lineTotalRp: totalRp, quantity: 1 } } } });
}
export const testBillingInstructions = { issuerName: "Synthetic Niuva TEST", issuerAddress: "Synthetic address for automated TEST only", issuerEmail: "invoice-fixture@example.test", bankName: "Synthetic TEST Bank", accountName: "Synthetic TEST account", accountNumber: "000000000000", transferInstructions: "Instruksi transfer sintetis khusus pengujian." };
