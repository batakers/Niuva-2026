import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaActionQueueRepository } from "./action-queue-repository";
import type { AdminListQuery } from "./list-query";
/** Uses the same uncapped server projection as the current attention counters. */
export async function attentionRecordIds(prisma: PrismaClient, area: "orders" | "custom-print" | "inquiries", view: AdminListQuery["view"]): Promise<readonly string[] | null> {
  if (!view) return null;
  const signals = await new PrismaActionQueueRepository(prisma).listSignals();
  return [...new Set(signals.flatMap(signal => {
    if (area === "inquiries") return view === "needs-action" && signal.kind === "B2B_INQUIRY" ? [signal.entityId] : [];
    if (area === "custom-print") return view === "needs-action" && ["CUSTOM_PRINT_REVIEW", "QUOTE_PREPARATION", "QUOTE_SEND"].includes(signal.kind) ? [signal.targetId ?? signal.entityId] : [];
    const issue = signal.kind === "PAYMENT_EXCEPTION" || signal.kind === "SHIPPING_EXCEPTION";
    return (issue || view === "needs-action" && ["ORDER_PROCESSING", "PACKAGE_MEASUREMENT"].includes(signal.kind)) ? [signal.targetId ?? signal.entityId] : [];
  }))];
}
