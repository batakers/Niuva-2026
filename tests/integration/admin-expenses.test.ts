import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { ExpenseService } from "@/modules/finance/expense-service";
import { financeActor, financePrisma as prisma } from "./helpers/finance";
describe("append-only expense bookkeeping", () => {
  it("deduplicates creation, corrects once with history, and voids without deleting", async () => {
    const admin = await financeActor("ADMIN"), owner = await financeActor(), service = new ExpenseService();
    const input = { amountRp: "100000", expenseDate: new Date().toISOString().slice(0, 10), category: "MATERIALS", description: "Synthetic material expense TEST", idempotencyKey: randomUUID() };
    const original = await service.record(admin, input); expect((await service.record(admin, input)).id).toBe(original.id);
    await expect(service.correct(admin, { ...input, expenseId: original.id, expectedVersion: 1, amountRp: "120000", reason: "", idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const corrected = await service.correct(admin, { ...input, expenseId: original.id, expectedVersion: 1, amountRp: "120000", reason: "Nominal pengeluaran fixture salah.", idempotencyKey: randomUUID() });
    const ids = [original.id, corrected.id];
    expect((await prisma.expenseEntry.aggregate({ where: { id: { in: ids }, reversalOfId: null, reversedBy: { is: null } }, _sum: { amountRp: true } }))._sum.amountRp?.toFixed(0)).toBe("120000");
    await expect(service.correct(owner, { ...input, expenseId: original.id, expectedVersion: 1, amountRp: "130000", reason: "Koreksi kedua fixture.", idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    await service.void(owner, { expenseId: corrected.id, expectedVersion: corrected.version, reason: "Pembatalan catatan fixture.", idempotencyKey: randomUUID() });
    expect((await prisma.expenseEntry.aggregate({ where: { id: { in: ids }, reversalOfId: null, reversedBy: { is: null } }, _sum: { amountRp: true } }))._sum.amountRp).toBeNull();
    expect(await prisma.expenseEntry.count({ where: { id: { in: ids } } })).toBe(2);
  });
  it("rejects stale actor, future date, floating money and other-record evidence", async () => {
    const admin = await financeActor("ADMIN"), service = new ExpenseService();
    const input = { amountRp: "100", expenseDate: "2099-01-01", category: "OTHER", description: "Synthetic expense TEST", idempotencyKey: randomUUID() };
    await expect(service.record(admin, input)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.record(admin, { ...input, expenseDate: "2026-10-01", amountRp: "1.5" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.record(admin, { ...input, expenseDate: "2026-10-01", proofFileId: randomUUID() })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await prisma.adminProfile.update({ where: { id: admin.profile.id }, data: { isActive: false } });
    await expect(service.record(admin, { ...input, expenseDate: "2026-10-01" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
