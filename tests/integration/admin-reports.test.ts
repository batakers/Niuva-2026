import { afterAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AdminReportsService } from "@/modules/admin/reports/service";
import { financeActor, financeOrder, financePrisma as prisma } from "./helpers/finance";
afterAll(() => prisma.$disconnect());
it("counts an older order by paidAt while keeping createdAt and Jakarta windows separate", async () => {
  const actor = await financeActor("ADMIN"), now = new Date("2026-10-08T01:00:00Z"); const service = new AdminReportsService({ now: () => now });
  const before = await service.load(actor, { range: "30d", tab: "orders" });
  const order = await financeOrder(); await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date("2025-01-01T00:00:00Z"), paidAt: new Date("2026-10-07T17:01:00Z"), status: "COMPLETED" } });
  const after = await service.load(actor, { range: "30d", tab: "orders" });
  if (before.operations.status !== "ok" || after.operations.status !== "ok") throw new Error("Operational report failed.");
  expect(after.operations.data.createdOrders).toBe(before.operations.data.createdOrders);
  expect(after.operations.data.paidOrders).toBe(before.operations.data.paidOrders + 1);
  expect(after.operations.data.points.at(-1)?.paidOrders).toBe((before.operations.data.points.at(-1)?.paidOrders ?? 0) + 1);
  expect(after.finance.status).toBe("ok"); expect(after.traffic.status).toBe("ok");
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
});
