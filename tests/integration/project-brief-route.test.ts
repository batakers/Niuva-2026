import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getPrismaClient } from "@/lib/db/prisma";
import { PrismaActionQueueRepository } from "@/modules/admin/action-queue-repository";
import { ActionQueueService } from "@/modules/admin/action-queue-service";
import { PrismaAdminProfileRepository } from "@/modules/admin/repository";
import { requireAdminForSession } from "@/lib/auth/clerk";
import { POST as postProjectBrief } from "@/app/api/project-brief/route";

const prisma = getPrismaClient();

async function cleanIntegrationDatabase(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "audit_logs",
      "idempotency_records",
      "payment_events",
      "payment_attempts",
      "shipments",
      "shipment_rate_snapshots",
      "stock_reservations",
      "order_addresses",
      "order_items",
      "orders",
      "custom_print_quotes",
      "custom_print_reviews",
      "custom_print_request_files",
      "custom_print_requests",
      "b2b_inquiry_files",
      "b2b_inquiries",
      "stored_files",
      "product_media",
      "product_variants",
      "products",
      "categories",
      "portfolio_media",
      "portfolio_projects",
      "services",
      "pricing_rule_versions",
      "admin_profiles"
    RESTART IDENTITY CASCADE
  `;
}

beforeEach(cleanIntegrationDatabase);
afterAll(cleanIntegrationDatabase);

describe("Project Brief route integration", () => {
  it("persists a valid brief and exposes it to the Action Queue", async () => {
    const response = await postProjectBrief(
      new Request("http://127.0.0.1:3000/api/project-brief", {
        body: JSON.stringify({
          confidentialityAck: true,
          currentStage: "CAD",
          description: "Integration route-to-database smoke.",
          email: "integration@example.test",
          name: "Integration Client",
          phone: "+628000000000",
          projectGoal: "Verify the Project Brief operational path",
          referenceLink: "https://example.test/reference",
          targetDeadline: "2026-10-01",
          targetQuantity: "1 prototype",
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("x-correlation-id")).toMatch(/^[0-9a-f-]{36}$/);

    const body = (await response.json()) as Record<string, unknown>;
    expect(typeof body.accessToken).toBe("string");
    expect(body.accessToken).not.toBe("");
    expect(body.referenceNumber).toMatch(/^INQ-[0-9]{8}-[A-Z0-9]{8}$/);

    const referenceNumber = body.referenceNumber;
    if (typeof referenceNumber !== "string") {
      throw new Error("Response tidak mengembalikan reference number.");
    }

    const inquiry = await prisma.b2BInquiry.findUnique({
      select: {
        currentStage: true,
        email: true,
        id: true,
        name: true,
        referenceLink: true,
        referenceNumber: true,
        status: true,
      },
      where: { referenceNumber },
    });

    expect(inquiry).not.toBeNull();
    if (inquiry === null) {
      throw new Error("Inquiry tidak tersimpan pada database test.");
    }

    expect(inquiry).toMatchObject({
      currentStage: "CAD",
      email: "integration@example.test",
      name: "Integration Client",
      referenceLink: "https://example.test/reference",
      referenceNumber,
      status: "NEW",
    });

    await expect(
      prisma.auditLog.findFirst({
        select: { action: true, entityId: true, entityType: true },
        where: { action: "inquiry.submitted", entityId: inquiry.id },
      }),
    ).resolves.toEqual({
      action: "inquiry.submitted",
      entityId: inquiry.id,
      entityType: "B2BInquiry",
    });

    const queue = await new ActionQueueService({
      now: () => new Date("2026-09-14T00:00:00.000Z"),
      repository: new PrismaActionQueueRepository(prisma),
    }).list();

    expect(queue.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "B2B_INQUIRY",
          nextAction: "Tinjau brief proyek baru",
          reference: referenceNumber,
          title: "Brief proyek baru",
        }),
      ]),
    );
  });

  it("resolves an active Clerk user through the database-owned AdminProfile", async () => {
    await prisma.adminProfile.create({
      data: {
        clerkUserId: "clerk_test_owner",
        isActive: true,
        role: "OWNER",
      },
    });

    const access = await requireAdminForSession(
      { userId: "clerk_test_owner" },
      new PrismaAdminProfileRepository(prisma),
    );

    expect(access).toMatchObject({
      clerkUserId: "clerk_test_owner",
      profile: {
        clerkUserId: "clerk_test_owner",
        isActive: true,
        role: "OWNER",
      },
    });
    await expect(
      requireAdminForSession(
        { userId: "clerk_test_unknown" },
        new PrismaAdminProfileRepository(prisma),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
