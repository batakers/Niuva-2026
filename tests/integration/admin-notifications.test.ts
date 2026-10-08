import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { AdminNotificationService } from "@/modules/admin/notifications/service";
import { PrismaAdminNotificationRepository } from "@/modules/admin/notifications/repository";

const prisma = getPrismaClient();
const service = new AdminNotificationService(new PrismaAdminNotificationRepository(prisma));
let owner: AdminAccess;
let adminA: AdminAccess;
let adminB: AdminAccess;
let inquiryId: string;
const sameTime = new Date("2026-10-08T01:00:00Z");

async function actor(role: "OWNER" | "ADMIN"): Promise<AdminAccess> {
  const id = randomUUID();
  const user = await prisma.adminAuthUser.create({ data: { id, email: `notifications-${id}@example.test`, name: "TEST notification operator", emailVerified: true, twoFactorEnabled: true, profile: { create: { role, isActive: true } } }, include: { profile: true } });
  if (!user.profile) throw new Error("Missing fixture profile");
  return { authUserId: id, profile: user.profile };
}
async function event(action = "inquiry.submitted", entityType = "B2BInquiry", entityId = inquiryId) {
  return prisma.auditLog.create({ data: { id: randomUUID(), entityType, entityId, action, actorType: "SYSTEM", createdAt: sameTime, metadataJson: { private: "TEST-PRIVATE-MUST-NOT-LEAK" } } });
}
beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  owner = await actor("OWNER"); adminA = await actor("ADMIN"); adminB = await actor("ADMIN");
  inquiryId = randomUUID();
  await prisma.b2BInquiry.create({ data: { id: inquiryId, referenceNumber: `INQ-TEST-${inquiryId}`, publicTokenHash: randomUUID(), name: "TEST Customer", email: "notifications@example.test", phone: "+628000000000", currentStage: "CAD", description: "Synthetic notification fixture", projectGoal: "TEST only", referenceLink: "https://example.test/fixture", targetQuantity: "1 prototype", confidentialityAck: true } });
});

describe("persistent per-account notifications", () => {
  it("accepts concurrent first bootstrap requests without losing the account baseline", async () => {
    await event();
    const results = await Promise.all([service.bootstrap(adminA), service.bootstrap(adminA)]);
    expect(results.map(result => result.toastCandidates)).toEqual([[], []]);
    expect(await prisma.adminNotificationState.count({ where: { profileId: adminA.profile.id } })).toBe(1);
  });
  it("keeps unread history independent for two accounts and does not change business state", async () => {
    const item = await event();
    const before = await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiryId } });
    expect((await service.bootstrap(adminA)).unreadCount).toBe(1);
    await service.markRead(adminA, { ids: [item.id] });
    expect((await service.poll(adminA, {})).unreadCount).toBe(0);
    expect((await service.bootstrap(adminB)).items.find(row => row.id === item.id)?.isRead).toBe(false);
    expect((await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiryId } })).status).toBe(before.status);
  });
  it("filters team/privacy/settings before unread counts and pagination", async () => {
    await event();
    await event("admin.deactivated", "AdminProfile", adminA.profile.id);
    await event("PRIVACY_REQUEST_HANDLED", "CUSTOMER_PRIVACY_REQUEST");
    await event("pricing-rule.activated", "PricingRuleVersion");
    await event("finance.settings.updated", "BillingInstructions");
    const admin = await service.bootstrap(adminA);
    const own = await service.bootstrap(owner);
    expect(admin.unreadCount).toBe(1);
    expect(own.unreadCount).toBe(5);
    expect(admin.items.map(row => row.group)).toEqual(["B2B Inquiries"]);
    expect(JSON.stringify(own)).not.toContain("TEST-PRIVATE-MUST-NOT-LEAK");
  });
  it("retains more than fifty unread events and paginates identical timestamps without loss", async () => {
    for (let index = 0; index < 70; index++) await event();
    const first = await service.bootstrap(adminA);
    expect(first.unreadCount).toBe(70);
    expect(first.items).toHaveLength(30);
    const second = await service.poll(adminA, { cursor: first.nextCursor });
    const third = await service.poll(adminA, { cursor: second.nextCursor });
    expect(new Set([...first.items, ...second.items, ...third.items].map(row => row.id)).size).toBe(70);
    expect(third.nextCursor).toBeNull();
  });
  it("suppresses old popups on bootstrap and atomically claims new events even at the same timestamp", async () => {
    await event();
    expect((await service.bootstrap(adminA)).toastCandidates).toEqual([]);
    const fresh = await event();
    const [left, right] = await Promise.all([service.poll(adminA, {}), service.poll(adminA, {})]);
    expect([...left.toastCandidates, ...right.toastCandidates].map(row => row.id)).toEqual([fresh.id]);
    expect((await service.bootstrap(adminA)).toastCandidates).toEqual([]);
    expect((await service.poll(adminA, {})).toastCandidates).toEqual([]);
  });
  it("shows routine updates in history while only attention-worthy new events become popups", async () => {
    await service.bootstrap(adminA);
    const routine = await event("inquiry.status.transition");
    const attention = await event();
    const feed = await service.poll(adminA, {});
    expect(feed.items.map(row => row.id)).toEqual(expect.arrayContaining([routine.id, attention.id]));
    expect(feed.toastCandidates.map(row => row.id)).toEqual([attention.id]);
  });
  it("rejects inactive profiles and foreign/Owner-only receipt mutations", async () => {
    const hidden = await event("admin.deactivated", "AdminProfile", owner.profile.id);
    await expect(service.markRead(adminA, { ids: [hidden.id] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.markRead(adminA, { ids: [], profileId: owner.profile.id })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await prisma.adminProfile.update({ where: { id: adminA.profile.id }, data: { isActive: false } });
    await expect(service.bootstrap(adminA)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows legitimate audit cleanup to cascade derived receipts without changing business records", async () => {
    const item = await event();
    await service.bootstrap(adminA);
    expect(await prisma.adminNotificationReceipt.count({ where: { auditLogId: item.id } })).toBe(1);
    await prisma.auditLog.delete({ where: { id: item.id } });
    expect(await prisma.adminNotificationReceipt.count({ where: { auditLogId: item.id } })).toBe(0);
    expect(await prisma.b2BInquiry.findUnique({ where: { id: inquiryId } })).not.toBeNull();
  });
});
