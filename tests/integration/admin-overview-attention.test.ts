import { afterAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadAdminOverview } from "@/modules/admin/overview-service";
import { PrismaAdminOperationsReadRepository } from "@/modules/admin/operations-read-repository";
import { AdminNotificationService } from "@/modules/admin/notifications/service";
import { financeActor, financeOrder, financePrisma as prisma } from "./helpers/finance";
afterAll(() => prisma.$disconnect());
it("attention is independent of period and notification read, and the direct list uses the same business signals", async () => {
  const actor = await financeActor("ADMIN"); const paid = await financeOrder(); const pending = await financeOrder();
  await prisma.adminAuthUser.create({ data: { id: actor.authUserId, email: `attention-${actor.authUserId}@example.test`, name: "Synthetic attention Admin", profile: { connect: { id: actor.profile.id } } } });
  await prisma.order.update({ where: { id: paid.id }, data: { status: "PAID" } });
  const event = await prisma.auditLog.create({ data: { actorType: "SYSTEM", action: "checkout.created", entityType: "Order", entityId: paid.id } });
  const before = await loadAdminOverview(actor, "30d"); await new AdminNotificationService().markRead(actor, { ids: [event.id] }); const after = await loadAdminOverview(actor, "13m");
  if (before.attention.status !== "ok" || after.attention.status !== "ok") throw new Error("Attention could not load.");
  expect(after.attention.data.summary).toEqual(before.attention.data.summary); expect(after.finance.status === "ok" && after.finance.data.range).toBe("13m");
  const list = await new PrismaAdminOperationsReadRepository(prisma).listOrders({ page: 1, view: "needs-action", q: paid.orderNumber });
  expect(list.items.map(item => item.id)).toEqual([paid.id]);
  expect((await new PrismaAdminOperationsReadRepository(prisma).listOrders({ page: 1, view: "needs-action", q: pending.orderNumber })).items).toHaveLength(0);
});
