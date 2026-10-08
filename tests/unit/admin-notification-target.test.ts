import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { AdminActivityTimelineService } from "@/modules/admin/activity-timeline";

const id = "1ed82d3d-10bc-4c3b-b204-2cc03a23484a";
const parentId = "f52c7aad-6d6d-4c4d-87f0-26c67289b372";
const access: AdminAccess = { authUserId: "test-owner", profile: { id, isActive: true, role: "OWNER" } };

function database(entityType: string, action: string, found = true): PrismaClient {
  return {
    auditLog: { findMany: vi.fn().mockResolvedValue([{ id, entityId: id, entityType, action, actorType: "SYSTEM", createdAt: new Date("2026-10-08T00:00:00Z"), afterJson: { private: "never-send" } }]) },
    order: { findFirst: vi.fn().mockResolvedValue(found ? { id } : null) },
    paymentAttempt: { findFirst: vi.fn().mockResolvedValue(found ? { order: { id: parentId } } : null) },
    b2BQuote: { findFirst: vi.fn().mockResolvedValue(found ? { inquiry: { id: parentId } } : null) },
    customPrintQuote: { findFirst: vi.fn().mockResolvedValue(found ? { request: { id: parentId } } : null) },
  } as unknown as PrismaClient;
}

describe("notification record destinations", () => {
  it.each([
    ["Order", "order.status.transition", `/admin/orders/${id}`],
    ["PaymentAttempt", "state.transition", `/admin/orders/${parentId}`],
    ["PaymentEvent", "payment.webhook.processed", `/admin/orders/${id}`],
    ["B2BQuote", "b2b.quote.accepted", `/admin/inquiries/${parentId}/proposal`],
    ["CustomPrintQuote", "quote.sent", `/admin/custom-print/${parentId}/review`],
  ])("resolves %s through its legitimate parent", async (entityType, action, href) => {
    const result = await new AdminActivityTimelineService(database(entityType, action)).list(access);
    expect(result.items[0]?.href).toBe(href);
    expect(JSON.stringify(result)).not.toContain("never-send");
  });
  it("does not offer a link when the business record is deleted or inaccessible", async () => {
    const result = await new AdminActivityTimelineService(database("Order", "order.status.transition", false)).list(access);
    expect(result.items[0]?.href).toBeNull();
  });
});
