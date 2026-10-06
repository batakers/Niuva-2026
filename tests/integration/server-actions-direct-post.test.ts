/**
 * Task 5.23 (Req 12.5): a Server Action is a POST to the route that uses it,
 * so a Proxy matcher that skips the route also skips the action. These tests
 * prove the service-layer boundary holds when the proxy is out of the picture.
 *
 * Honest limits: Next encrypts/obfuscates action ids, so a real HTTP POST with a
 * valid id cannot be forged here. The real action functions are therefore
 * invoked directly (what the framework does after decoding the id), with the
 * real auth boundary (requireAdmin -> AdminProfile lookup in the local test DB)
 * and only the Clerk session mocked as absent/unknown. The e2e spec covers the
 * HTTP side (bogus Next-Action id on admin routes).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  errors: [] as unknown[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth/admin-engine", () => ({
  getAdminAuth: () => ({ api: { getSession: async () => { const value = await mocks.auth(); return value?.userId ? { user: { id: value.userId, twoFactorEnabled: true }, session: { mfaVerified: true } } : null; } } }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

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
let inquiryId = "";

beforeEach(async () => {
  await clean();
  mocks.auth.mockReset();
  mocks.errors = [];
  const product = await prisma.product.create({
    data: { description: "Produk uji aksi langsung.", name: "Produk uji", slug: "direct-post-product" },
  });
  productId = product.id;
  const variant = await prisma.productVariant.create({
    data: { productId, sku: "DIRECT-POST-1", name: "Biru", priceRp: "10000", stockOnHand: 5, weightGrams: "10" },
  });
  variantId = variant.id;
  const inquiry = await prisma.b2BInquiry.create({
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
  inquiryId = inquiry.id;
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
    ["transitionInquiryAction", run(adminActions.transitionInquiryAction, {
      inquiryId, currentStatus: "NEW", nextStatus: "CONTACTED",
    })],
    ["activatePricingRuleAction", run(adminActions.activatePricingRuleAction, {
      confirmation: "I_UNDERSTAND_NON_PRODUCTION", quantitySemantics: "PER_UNIT",
    })],
    ["sendB2BQuoteAction", run(adminActions.sendB2BQuoteAction, {
      inquiryId, assumptions: "Asumsi harga berlaku.", lineItemsText: "Jasa cetak | 1000000",
      scope: "Lingkup pekerjaan cetak 3D.", validUntil: "2099-01-01",
    })],
    ["replaceProductMediaAction", run(adminActions.replaceProductMediaAction, { productId, mediaJson: "[]" })],
  ];
}

describe("direct Server Action call without proxy protection", () => {
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
    const result = await (adminActions.transitionInquiryAction as unknown as ActionFn)(
      { status: "idle" },
      form({ inquiryId, currentStatus: "NEW", nextStatus: "CONTACTED" }),
    );
    expect(result.status).toBe("success");
    expect((await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiryId } })).status).toBe("CONTACTED");
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
    // Current state: every action is used under /admin/*, which the matcher
    // covers. If this list ever becomes non-empty, the action on that route has
    // no proxy protection and relies solely on the service-layer checks above.
    expect(outside).toEqual([]);
    expect(routes.every((route) => route.startsWith("/admin"))).toBe(true);
  });

  it("models the worst case: a route outside the matcher gives no proxy protection", () => {
    expect(matcherCovers("/admin/orders/x")).toBe(true);
    expect(matcherCovers("/account")).toBe(false);
    expect(matcherCovers("/administrator")).toBe(false);
  });
});
