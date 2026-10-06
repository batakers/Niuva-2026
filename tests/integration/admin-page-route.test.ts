import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("server-only", () => ({}));

const environmentMocks = vi.hoisted(() => ({
  getServerCapabilities: vi.fn(),
}));

const nextServerMocks = vi.hoisted(() => ({
  connection: vi.fn(),
}));

vi.mock("@/lib/auth/admin-engine", () => ({
  getAdminAuth: () => ({ api: { getSession: async () => { const value = await authMocks.auth(); return value?.userId ? { user: { id: value.userId, twoFactorEnabled: true }, session: { mfaVerified: true } } : null; } } }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", async importOriginal => ({ ...await importOriginal<typeof import("next/navigation")>(), useRouter: () => ({ replace: () => undefined, refresh: () => undefined }) }));



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
import AdminStockHistoryPage from "@/app/admin/products/[id]/stock/[variantId]/page";
import { systemCopy } from "@/components/niuva/system-state-copy";
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
      "admin_profiles", "admin_auth_users"
    RESTART IDENTITY CASCADE
  `;
}

beforeEach(async () => {
  await cleanIntegrationDatabase();
  authMocks.auth.mockReset();
  authMocks.auth.mockResolvedValue({ userId: ownerClerkUserId });
  environmentMocks.getServerCapabilities.mockReset();
  environmentMocks.getServerCapabilities.mockReturnValue({
    biteship: false,
    adminAuth: true,
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
  it("renders the protected stock history with physical, reserved and available balances", async () => {
    await prisma.adminProfile.create({
      data: { authUser: { create: { id: ownerClerkUserId, email: ownerClerkUserId + "@example.test", name: "Fixture Owner" } }, clerkUserId: ownerClerkUserId, isActive: true, role: "OWNER", displayName: "Owner" },
    });
    const product = await prisma.product.create({
      data: { description: "Stok route", name: "Produk stok", slug: "admin-stock-route" },
    });
    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: "ADMIN-STOCK-ROUTE", name: "Biru", priceRp: "10000", stockOnHand: 4, weightGrams: "10" },
    });
    await prisma.stockMovement.create({ data: {
      variantId: variant.id, kind: "OPENING_BALANCE", delta: 4, balanceBefore: 0, balanceAfter: 4,
    } });
    const markup = renderToStaticMarkup(await AdminStockHistoryPage({
      params: Promise.resolve({ id: product.id, variantId: variant.id }),
      searchParams: Promise.resolve({}),
    }));
    expect(markup).toContain("Riwayat stok varian");
    expect(markup).toContain("Stok fisik");
    expect(markup).toContain("Reservasi aktif");
    expect(markup).toContain("Tersedia");
    expect(markup).toContain("Saldo awal");
    expect(markup).toContain("ADMIN-STOCK-ROUTE");
    expect(markup).not.toContain(systemCopy.adminAccess.FORBIDDEN.title);
  });

  it("resolves the Better Auth test identity through AdminProfile and renders database-backed work", async () => {
    await prisma.adminProfile.create({
      data: {
        authUser: { create: { id: ownerClerkUserId, email: ownerClerkUserId + "@example.test", name: "Fixture Owner" } },
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

    expect(authMocks.auth).toHaveBeenCalledOnce();
    expect(nextServerMocks.connection).toHaveBeenCalledOnce();
    expect(markup).toContain("Overview");
    expect(markup).toContain(inquiry.referenceNumber);
    expect(markup).toContain("Tren tayangan halaman");
    expect(markup).toContain("Aktivitas bisnis");
    expect(markup).toContain("Owner");
    expect(markup).not.toContain("admin-page@example.test");
    expect(markup).not.toContain("+628000000000");
    expect(markup).not.toContain("https://example.test/admin-page-fixture");
    expect(markup).not.toContain("Development-only preview");
  });

  it("applies the queue group on the server before rendering rows", async () => {
    await prisma.adminProfile.create({ data: { authUser: { create: { id: ownerClerkUserId, email: ownerClerkUserId + "@example.test", name: "Fixture Owner" } }, clerkUserId: ownerClerkUserId, isActive: true, role: "OWNER" } });
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
      referenceLink: "https://example.test/queue-group-fixture",
      targetQuantity: "1 prototype",
    } });

    const markup = renderToStaticMarkup(await AdminQueuePage({ searchParams: Promise.resolve({ group: "orders" }) }));
    expect(markup).toContain("Action Queue");
    expect(markup).toContain("0 pada kelompok ini");
    expect(markup).not.toContain("INQ-20260914-GROUP001");
  });

  it("keeps the queue hidden when the Clerk identity has no active profile", async () => {
    authMocks.auth.mockResolvedValue({ userId: "clerk_test_admin_page_unknown" });

    const markup = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain(systemCopy.adminAccess.FORBIDDEN.title);
    expect(markup).not.toContain("Action Queue");
    expect(markup).not.toContain("Development-only preview");
  });

  it("calls notFound() for a valid id without a record instead of the unavailable state", async () => {
    await prisma.adminProfile.create({
      data: { authUser: { create: { id: ownerClerkUserId, email: ownerClerkUserId + "@example.test", name: "Fixture Owner" } }, clerkUserId: ownerClerkUserId, isActive: true, role: "OWNER", displayName: "Owner" },
    });

    await expect(
      AdminStockHistoryPage({
        params: Promise.resolve({
          id: "3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b",
          variantId: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
        }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404") });
  });
});
