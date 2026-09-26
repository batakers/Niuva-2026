import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

const environmentMocks = vi.hoisted(() => ({
  getServerCapabilities: vi.fn(),
}));

const nextServerMocks = vi.hoisted(() => ({
  connection: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkMocks.auth,
}));

vi.mock("@/lib/env/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env/server")>();

  return {
    ...actual,
    getServerCapabilities: environmentMocks.getServerCapabilities,
  };
});

vi.mock("next/server", () => ({
  connection: nextServerMocks.connection,
}));

import AdminPage from "@/app/admin/page";
import AdminQueuePage from "@/app/admin/queue/page";
import { getPrismaClient } from "@/lib/db/prisma";

const prisma = getPrismaClient();
const ownerClerkUserId = "clerk_test_admin_page_owner";

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

beforeEach(async () => {
  await cleanIntegrationDatabase();
  clerkMocks.auth.mockReset();
  clerkMocks.auth.mockResolvedValue({ userId: ownerClerkUserId });
  environmentMocks.getServerCapabilities.mockReset();
  environmentMocks.getServerCapabilities.mockReturnValue({
    biteship: false,
    clerkAdmin: true,
    customUploads: false,
    database: true,
    midtrans: false,
    objectStorage: false,
    resend: false,
  });
  nextServerMocks.connection.mockReset();
  nextServerMocks.connection.mockResolvedValue(undefined);
});

afterAll(cleanIntegrationDatabase);

describe("Admin page route integration", () => {
  it("resolves the Clerk test identity through AdminProfile and renders database-backed work", async () => {
    await prisma.adminProfile.create({
      data: {
        clerkUserId: ownerClerkUserId,
        isActive: true,
        role: "OWNER",
      },
    });
    const inquiry = await prisma.b2BInquiry.create({
      data: {
        confidentialityAck: true,
        currentStage: "CAD",
        description: "Admin page route integration fixture.",
        email: "admin-page@example.test",
        name: "Admin Page Fixture",
        phone: "+628000000000",
        projectGoal: "Verify the protected Action Queue page",
        publicTokenHash: "admin-page-route-token-hash",
        referenceNumber: "INQ-20260914-ADMIN001",
        referenceLink: "https://example.test/admin-page-fixture",
        targetQuantity: "1 prototype",
      },
    });

    const markup = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(clerkMocks.auth).toHaveBeenCalledOnce();
    expect(nextServerMocks.connection).toHaveBeenCalledOnce();
    expect(markup).toContain("Overview");
    expect(markup).toContain(inquiry.referenceNumber);
    expect(markup).toContain("Aktivitas 30 hari");
    expect(markup).toContain("Owner");
    expect(markup).not.toContain("admin-page@example.test");
    expect(markup).not.toContain("+628000000000");
    expect(markup).not.toContain("https://example.test/admin-page-fixture");
    expect(markup).not.toContain("Development-only preview");
  });

  it("applies the queue group on the server before rendering rows", async () => {
    await prisma.adminProfile.create({ data: { clerkUserId: ownerClerkUserId, isActive: true, role: "OWNER" } });
    await prisma.b2BInquiry.create({ data: {
      confidentialityAck: true,
      currentStage: "CAD",
      description: "Queue group fixture.",
      email: "queue-group@example.test",
      name: "Queue Group Fixture",
      phone: "+628000000001",
      projectGoal: "Verify filtered queue",
      publicTokenHash: "admin-queue-group-token-hash",
      referenceNumber: "INQ-20260914-GROUP001",
      targetQuantity: "1 prototype",
    } });

    const markup = renderToStaticMarkup(await AdminQueuePage({ searchParams: Promise.resolve({ group: "orders" }) }));
    expect(markup).toContain("Action Queue");
    expect(markup).toContain("0 pada kelompok ini");
    expect(markup).not.toContain("INQ-20260914-GROUP001");
  });

  it("keeps the queue hidden when the Clerk identity has no active profile", async () => {
    clerkMocks.auth.mockResolvedValue({ userId: "clerk_test_admin_page_unknown" });

    const markup = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain("Akses admin belum tersedia");
    expect(markup).not.toContain("Action Queue");
    expect(markup).not.toContain("Development-only preview");
  });
});
