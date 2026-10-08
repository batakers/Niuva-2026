import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminForSession, type AdminAccess } from "@/lib/auth/admin";
import { PrismaAdminProfileRepository } from "@/modules/admin/repository";
import { AdminAccessManagementService } from "@/modules/admin-auth/access-management-service";
import { PrismaAdminAccessManagementRepository } from "@/modules/admin-auth/access-management-repository";
import { AdminGlobalSearchService } from "@/modules/admin/global-search";
import { AdminActivityTimelineService } from "@/modules/admin/activity-timeline";

const prisma = getPrismaClient();
const service = new AdminAccessManagementService(new PrismaAdminAccessManagementRepository(prisma));
let owner: AdminAccess;
let admin: AdminAccess;

beforeEach(async () => {
  const ownerId = randomUUID();
  const adminId = randomUUID();
  const ownerUser = await prisma.adminAuthUser.create({
    data: {
      id: ownerId,
      email: `owner-${ownerId}@example.test`,
      name: "Owner fixture",
      emailVerified: true,
      twoFactorEnabled: true,
      profile: { create: { displayName: "Owner fixture", role: "OWNER", isActive: true } },
    },
    include: { profile: true },
  });
  const adminUser = await prisma.adminAuthUser.create({
    data: {
      id: adminId,
      email: `admin-${adminId}@example.test`,
      name: "Admin fixture",
      emailVerified: true,
      twoFactorEnabled: true,
      profile: { create: { displayName: "Admin fixture", role: "ADMIN", isActive: true } },
    },
    include: { profile: true },
  });
  owner = { authUserId: ownerId, profile: ownerUser.profile! };
  admin = { authUserId: adminId, profile: adminUser.profile! };
});

describe("Owner Admin & Akses", () => {
  it("deactivates an Admin, revokes their sessions and blocks subsequent access", async () => {
    const sessionId = randomUUID();
    await prisma.adminAuthSession.create({ data: { id: sessionId, token: `session-${sessionId}`, userId: admin.authUserId, expiresAt: new Date(Date.now() + 60_000), mfaVerified: true } });

    await service.deactivate(owner, { adminId: admin.profile.id });

    expect(await prisma.adminProfile.findUnique({ where: { id: admin.profile.id } })).toMatchObject({ role: "ADMIN", isActive: false });
    expect(await prisma.adminAuthSession.count({ where: { userId: admin.authUserId } })).toBe(0);
    await expect(requireAdminForSession({ userId: admin.authUserId, mfaVerified: true, twoFactorEnabled: true }, new PrismaAdminProfileRepository(prisma))).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await prisma.auditLog.findFirst({ where: { entityType: "AdminProfile", entityId: admin.profile.id, action: "admin.deactivated" } })).toMatchObject({ actorId: owner.profile.id, actorType: "ADMIN" });
  });

  it("rejects ordinary Admin, Owner targets and stale inactive Owners", async () => {
    await expect(service.deactivate(admin, { adminId: admin.profile.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.deactivate(owner, { adminId: owner.profile.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await prisma.adminProfile.update({ where: { id: owner.profile.id }, data: { isActive: false } });
    await expect(service.deactivate(owner, { adminId: admin.profile.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await prisma.adminProfile.findUnique({ where: { id: admin.profile.id } })).toMatchObject({ isActive: true });
  });

  it("rejects malformed and repeated deactivation without changing another account", async () => {
    await expect(service.deactivate(owner, { adminId: "bad" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.deactivate(owner, { adminId: admin.profile.id });
    await expect(service.deactivate(owner, { adminId: admin.profile.id })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.auditLog.count({ where: { entityType: "AdminProfile", entityId: admin.profile.id, action: "admin.deactivated" } })).toBe(1);
  });
});

describe("Admin search and activity visibility", () => {
  it("excludes privacy-closed customer records from global search", async () => {
    const marker = `SEARCH-${randomUUID()}`;
    const createOrder = (suffix: string, closed: boolean) => prisma.order.create({ data: { orderNumber: `${marker}-ORDER-${suffix}`, orderType: "RETAIL", customerName: "Search Fixture", customerEmail: `${randomUUID()}@example.test`, customerPhone: "TEST", publicTokenHash: randomUUID(), itemsSubtotalRp: "100", shippingTotalRp: "0", grandTotalRp: "100", accountClosedAt: closed ? new Date() : null } });
    const createInquiry = (suffix: string, closed: boolean) => prisma.b2BInquiry.create({ data: { referenceNumber: `${marker}-B2B-${suffix}`, name: "Search Fixture", email: `${randomUUID()}@example.test`, phone: "TEST", projectGoal: "Fixture", currentStage: "IDEA", description: "Fixture", targetQuantity: "1", confidentialityAck: true, publicTokenHash: randomUUID(), accountClosedAt: closed ? new Date() : null } });
    const createCustom = (suffix: string, closed: boolean) => prisma.customPrintRequest.create({ data: { referenceNumber: `${marker}-CUSTOM-${suffix}`, customerName: "Search Fixture", customerEmail: `${randomUUID()}@example.test`, customerPhone: "TEST", materialRequested: "PLA", quantity: 1, publicTokenHash: randomUUID(), accountClosedAt: closed ? new Date() : null } });
    await Promise.all([createOrder("OPEN", false), createOrder("CLOSED", true), createInquiry("OPEN", false), createInquiry("CLOSED", true), createCustom("OPEN", false), createCustom("CLOSED", true)]);
    const results = await new AdminGlobalSearchService(prisma).search(admin, marker);
    expect(results.filter(item => item.kind !== "MENU").map(item => item.title).sort()).toEqual([`${marker}-B2B-OPEN`, `${marker}-CUSTOM-OPEN`, `${marker}-ORDER-OPEN`].sort());
  });

  it("hides Owner-only audit events from Admin activity", async () => {
    const privacy = await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId: owner.profile.id, entityType: "CUSTOMER_PRIVACY_REQUEST", entityId: randomUUID(), action: "PRIVACY_REQUEST_HANDLED", createdAt: new Date("2030-01-01T00:00:01.000Z") } });
    const operational = await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId: admin.profile.id, entityType: "Order", entityId: randomUUID(), action: "order.status.transition", createdAt: new Date("2030-01-01T00:00:02.000Z"), metadataJson: { secret: "not-for-timeline" } } });
    const service = new AdminActivityTimelineService(prisma);
    const adminPage = await service.list(admin);
    const ownerPage = await service.list(owner);
    expect(adminPage.items.some(item => item.id === privacy.id)).toBe(false);
    expect(adminPage.items.some(item => item.id === operational.id)).toBe(true);
    expect(ownerPage.items.some(item => item.id === privacy.id)).toBe(true);
    expect(JSON.stringify(adminPage)).not.toContain("not-for-timeline");
  });
});
