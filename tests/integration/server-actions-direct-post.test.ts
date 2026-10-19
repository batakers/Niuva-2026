/**
 * Task 5.23 (Req 12.5): a Server Action is a POST to the route that uses it,
 * so a Proxy matcher that skips the route also skips the action. These tests
 * prove the service-layer boundary holds when the proxy is out of the picture.
 *
 * Honest limits: Next encrypts/obfuscates action ids, so a real HTTP POST with a
 * valid id cannot be forged here. The real action functions are therefore
 * invoked directly (what the framework does after decoding the id), with the
 * real auth boundaries with their local test DB lookups and only the session
 * transport mocked. The e2e spec covers the
 * HTTP side (bogus Next-Action id on admin routes).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  customerToken: undefined as string | undefined,
  errors: [] as unknown[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth/admin-engine", () => ({
  getAdminAuth: () => ({ api: { getSession: async () => { const value = await mocks.auth(); return value?.userId ? { user: { id: value.userId, twoFactorEnabled: true }, session: { mfaVerified: true } } : null; } } }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => mocks.customerToken ? { value: mocks.customerToken } : undefined }) }));

vi.mock("@/lib/env/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env/server")>();
  return {
    ...actual,
    getServerCapabilities: () => ({
      biteship: false,
      adminAuth: true,
      customUploads: false,
      database: true,
      midtrans: false,
      objectStorage: false,
      resend: false,
    }),
  };
});
vi.mock("@/lib/observability/report", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/observability/report")>();
  const errors = await import("@/modules/shared/errors");
  return {
    ...actual,
    toAppErrorLogged: (error: unknown) => {
      mocks.errors.push(error);
      return errors.toAppError(error);
    },
  };
});

import * as adminActions from "@/app/admin/actions";
import { requestRefundAction } from "@/app/account/orders/[id]/refund/actions";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/customer-auth/core";
import { randomUUID } from "node:crypto";
import { getPrismaClient } from "@/lib/db/prisma";
import { config as proxyConfig } from "@/proxy";
import { isAppError } from "@/modules/shared/errors";

const prisma = getPrismaClient();

async function clean(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "audit_logs", "idempotency_records", "stock_movements", "b2b_quotes",
      "b2b_inquiry_files", "b2b_inquiries", "product_media", "product_variants",
      "products", "categories", "pricing_rule_versions", "admin_profiles", "admin_auth_users"
    RESTART IDENTITY CASCADE
  `;
}

async function snapshot(): Promise<unknown> {
  return {
    audit: await prisma.auditLog.count(),
    inquiries: await prisma.b2BInquiry.findMany({ orderBy: { id: "asc" } }),
    pricing: await prisma.pricingRuleVersion.count(),
    products: await prisma.product.findMany({ orderBy: { id: "asc" } }),
    variants: await prisma.productVariant.findMany({ orderBy: { id: "asc" } }),
    refundCases: await prisma.refundCase.count(),
    refundApprovals: await prisma.refundApproval.count(),
    orders: await prisma.order.count(),
    payments: await prisma.paymentAttempt.count(),
    movements: await prisma.stockMovement.count(),
  };
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function errorCodes(): string[] {
  return mocks.errors.map((error) => (isAppError(error) ? error.code : "NON_APP_ERROR"));
}

let productId = "";
let variantId = "";

beforeEach(async () => {
  await clean();
  mocks.auth.mockReset();
  mocks.customerToken = undefined;
  mocks.errors = [];
  const product = await prisma.product.create({
    data: { description: "Produk uji aksi langsung.", name: "Produk uji", slug: "direct-post-product" },
  });
  productId = product.id;
  const variant = await prisma.productVariant.create({
    data: { productId, sku: "DIRECT-POST-1", name: "Biru", priceRp: "10000", stockOnHand: 5, weightGrams: "10" },
  });
  variantId = variant.id;
  await prisma.b2BInquiry.create({
    data: {
      confidentialityAck: true,
      currentStage: "CAD",
      description: "Fixture aksi langsung.",
      email: "direct-post@example.test",
      name: "Direct Post",
      phone: "+628000000002",
      projectGoal: "Verify rejection",
      publicTokenHash: "direct-post-token-hash",
      referenceNumber: "INQ-20260914-DIRECT01",
      referenceLink: "https://example.test/direct-post",
      targetQuantity: "1 prototype",
    },
  });
});

afterAll(clean);

type ActionFn = (previous: unknown, data: FormData) => Promise<{ status: string }>;

function attempts(): ReadonlyArray<readonly [string, () => Promise<{ status: string }>]> {
  const run = (fn: unknown, fields: Record<string, string>) => () =>
    (fn as ActionFn)({ status: "idle" }, form(fields));
  return [
    ["adjustStockAction", run(adminActions.adjustStockAction, {
      productId, variantId, expectedStockOnHand: "5", reason: "Penyesuaian stok hasil hitung fisik", stockOnHand: "99",
    })],
    ["updateProductAction", run(adminActions.updateProductAction, {
      productId, description: "Deskripsi diubah tanpa izin.", name: "Diretas", slug: "diretas",
    })],

    ["activatePricingRuleAction", run(adminActions.activatePricingRuleAction, {
      confirmation: "I_UNDERSTAND_NON_PRODUCTION", quantitySemantics: "PER_UNIT",
    })],

    ["replaceProductMediaAction", run(adminActions.replaceProductMediaAction, { productId, mediaJson: "[]" })],
  ];
}

describe("direct Server Action call without proxy protection", () => {
  it.each(["missing", "unknown", "expired", "revoked"])("Customer refund rejects a %s session through its real auth boundary", async scenario => {
    const token = createOpaqueToken();
    mocks.customerToken = scenario === "missing" ? undefined : token;
    mocks.auth.mockResolvedValue({ userId: "admin-session-is-not-a-customer" });
    let customerId: string | undefined;
    try {
      if (scenario === "expired" || scenario === "revoked") {
        const email = `refund-direct-${randomUUID()}@example.test`;
        const customer = await prisma.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date(), sessions: { create: {
          tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + (scenario === "expired" ? -60000 : 60000)), revokedAt: scenario === "revoked" ? new Date() : null,
        } } } });
        customerId = customer.id;
      }
      const before = await snapshot();
      const result = await requestRefundAction(randomUUID(), { status: "idle" }, form({ submissionKey: randomUUID(), category: "OTHER", reason: "Synthetic direct action refund request." }));
      expect(result.status).toBe("error"); expect(errorCodes()).toContain("UNAUTHORIZED");
      expect(mocks.auth).not.toHaveBeenCalled(); expect(await snapshot()).toEqual(before);
    } finally {
      if (customerId) { await prisma.customerSession.deleteMany({ where: { customerId } }); await prisma.customer.delete({ where: { id: customerId } }); }
    }
  });

  it("rejects with UNAUTHORIZED and writes nothing when there is no Clerk session", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    const before = await snapshot();
    for (const [name, call] of attempts()) {
      mocks.errors = [];
      const result = await call();
      expect(result.status, name).toBe("error");
      expect(errorCodes(), name).toContain("UNAUTHORIZED");
    }
    expect(mocks.auth).toHaveBeenCalledTimes(attempts().length);
    expect(await snapshot()).toEqual(before);
    expect(await prisma.adminProfile.count()).toBe(0);
  });

  it("rejects with FORBIDDEN when the session has no AdminProfile", async () => {
    mocks.auth.mockResolvedValue({ userId: "clerk_direct_post_stranger" });
    const before = await snapshot();
    for (const [name, call] of attempts()) {
      mocks.errors = [];
      const result = await call();
      expect(result.status, name).toBe("error");
      expect(errorCodes(), name).toContain("FORBIDDEN");
    }
    expect(await snapshot()).toEqual(before);
  });

  it("rejects with FORBIDDEN for a deactivated AdminProfile", async () => {
    await prisma.adminProfile.create({
      data: { authUser: { create: { id: "clerk_direct_post_inactive", email: "clerk_direct_post_inactive@example.test", name: "Fixture Admin" } }, clerkUserId: "clerk_direct_post_inactive", isActive: false, role: "OWNER" },
    });
    mocks.auth.mockResolvedValue({ userId: "clerk_direct_post_inactive" });
    const before = await snapshot();
    for (const [name, call] of attempts()) {
      mocks.errors = [];
      const result = await call();
      expect(result.status, name).toBe("error");
      expect(errorCodes(), name).toContain("FORBIDDEN");
    }
    expect(await snapshot()).toEqual(before);
  });

  it("control: the same call succeeds for an active Owner, so the rejections are not vacuous", async () => {
    await prisma.adminProfile.create({
      data: { authUser: { create: { id: "clerk_direct_post_owner", email: "clerk_direct_post_owner@example.test", name: "Fixture Admin" } }, clerkUserId: "clerk_direct_post_owner", isActive: true, role: "OWNER" },
    });
    mocks.auth.mockResolvedValue({ userId: "clerk_direct_post_owner" });
    const result = await (adminActions.adjustStockAction as unknown as ActionFn)(
      { status: "idle" },
      form({ productId, variantId, expectedStockOnHand: "5", reason: "Penyesuaian stok hasil hitung fisik", stockOnHand: "99" }),
    );
    expect(result.status).toBe("success");
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockOnHand).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Matcher coverage, computed from the real config and the real route tree.
// ---------------------------------------------------------------------------

const APP_DIR = path.join(process.cwd(), "src", "app");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function routeOf(file: string): string {
  const segments = path
    .relative(APP_DIR, path.dirname(file))
    .split(path.sep)
    .filter((s) => s !== "" && !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return `/${segments.join("/")}`;
}

function matcherCovers(pathname: string): boolean {
  // Only the string entries are the Clerk surface; header-only object entries (7.21) carry no auth.
  return proxyConfig.matcher.filter((entry): entry is string => typeof entry === "string").some((pattern) => {
    if (!pattern.endsWith("/:path*")) throw new Error(`Unsupported matcher shape: ${pattern}`);
    const prefix = pattern.slice(0, -"/:path*".length);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

describe("proxy matcher versus routes that use Server Actions", () => {
  it("computes the routes importing an action module and reports any outside the matcher", () => {
    const importers = walk(APP_DIR).filter((file) => {
      if (!/\.(?:ts|tsx)$/.test(file)) return false;
      if (/[\\/]actions\.tsx?$/.test(file)) return false;
      return /from\s+["'](?:@\/app\/admin\/actions|\.{1,2}\/(?:\.\.\/)*actions)["']/.test(readFileSync(file, "utf8"));
    });
    expect(importers.length).toBeGreaterThan(0);
    const routes = [...new Set(importers.map(routeOf))].sort();
    const outside = routes.filter((route) => !matcherCovers(route));
    // Account proxy entries write CSP only. This exact route relies on the
    // real Customer guard tested above and the positive authenticated E2E.
    const customerRoutes = ["/account/orders/[id]/refund"];
    expect(outside).toEqual(customerRoutes);
    expect(routes.filter(route => !route.startsWith("/admin"))).toEqual(customerRoutes);
  });

  it("models the worst case: a route outside the matcher gives no proxy protection", () => {
    expect(matcherCovers("/admin/orders/x")).toBe(true);
    expect(matcherCovers("/account")).toBe(false);
    expect(matcherCovers("/administrator")).toBe(false);
  });
});
