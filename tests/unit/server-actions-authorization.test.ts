// @vitest-environment node
/**
 * Task 5.22 (Req 12.5): every Server Action under src/app must reject a call
 * made without admin authorization, at the service layer. A Server Action is a
 * POST to the route that uses it, so the proxy matcher is not a sufficient guard.
 *
 * The manifest below is an explicit allowlist (action -> required permission).
 * The scan test fails when a `actions.ts` / "use server" file or an exported
 * action appears that is not listed here.
 *
 * Placement: this file lives in tests/unit, so it runs under the unit config
 * (`pnpm test`). vitest.backend.config.mts excludes tests/unit/**. The node
 * environment is forced with the docblock above because the scan uses node:fs.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/admin";
import type { AdminPermission } from "@/modules/admin/permissions";
import { appError, isAppError } from "@/modules/shared/errors";

const state = vi.hoisted(() => ({
  adminCalls: 0,
  authorize: null as null | (() => unknown),
  dbCalls: [] as string[],
  denyAll: false,
  errors: [] as unknown[],
  permissions: [] as string[],
}));

vi.mock("@/lib/auth/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/admin")>();
  return {
    ...actual,
    requireAdmin: async () => {
      state.adminCalls += 1;
      if (state.authorize === null) throw new Error("scenario not configured");
      return state.authorize();
    },
  };
});

vi.mock("@/modules/admin/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/admin/permissions")>();
  const errors = await import("@/modules/shared/errors");
  return {
    ...actual,
    requireAdminPermission: (access: AdminAccess, permission: AdminPermission) => {
      state.permissions.push(permission);
      if (state.denyAll) {
        throw errors.appError("FORBIDDEN", { details: { permission } });
      }
      return actual.requireAdminPermission(access, permission);
    },
  };
});

// Any call on the Prisma client (model query, $transaction, ...) is recorded.
// Property reads alone are allowed because repositories resolve the client in
// their constructors.
vi.mock("@/lib/db/prisma", () => {
  const make = (route: string): unknown =>
    new Proxy(function target() {}, {
      apply() {
        state.dbCalls.push(route);
        return Promise.resolve(undefined);
      },
      get(_target, property) {
        if (property === "then" || typeof property === "symbol") return undefined;
        return make(`${route}.${property}`);
      },
    });
  return { getPrismaClient: () => make("prisma") };
});

vi.mock("@/lib/observability/report", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/observability/report")>();
  const errors = await import("@/modules/shared/errors");
  return {
    ...actual,
    toAppErrorLogged: (error: unknown) => {
      state.errors.push(error);
      return errors.toAppError(error);
    },
  };
});

vi.mock("@/modules/providers/runtime", () => ({
  createCustomShippingProviderForRuntime: () => ({}),
  createPaymentProviderForRuntime: () => ({}),
  createShippingProviderForRuntime: () => ({}),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined, updateTag: () => undefined, unstable_cache: (read: unknown) => read }));

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const UUID_2 = "223e4567-e89b-42d3-a456-426614174001";

type Fields = Readonly<Record<string, string>>;

type ManifestEntry = Readonly<{
  /** Permission(s) the service must demand; each must be requested. */
  permission: AdminPermission;
  /** Valid-looking form input so validation cannot mask a missing auth check. */
  fields: Fields;
  /** Set only for a real gap; the rejection assertion then runs as `it.fails`. */
  knownGap?: string;
}>;

const ORDER = { orderId: UUID };
const REQUEST = { requestId: UUID };
const PRODUCT = { productId: UUID };
const PROJECT = { projectId: UUID };

const ADMIN_ACTIONS_FILE = "src/app/admin/actions.ts";
const ADMIN_INVITATION_ACTIONS_FILE = "src/app/admin/admins/new/actions.ts";
const ADMIN_ACCESS_ACTIONS_FILE = "src/app/admin/admins/actions.ts";

const BILLING_FIELDS = { issuerName: "Synthetic issuer", issuerAddress: "Synthetic address fixture", issuerEmail: "fixture@example.test", bankName: "Fixture bank", accountName: "Synthetic fixture", accountNumber: "00000000", transferInstructions: "Synthetic transfer instructions." };
const PAYMENT_FIELDS = { paymentId: UUID, billingCaseId: UUID, expectedVersion: "1", amountRp: "1000", receivedDate: "2020-01-01", reference: "TEST-FIXTURE", confirmed: "confirmed", reason: "Synthetic correction", idempotencyKey: UUID_2 };
const EXPENSE_FIELDS = { expenseId: UUID, expectedVersion: "1", amountRp: "1000", expenseDate: "2020-01-01", category: "OTHER", description: "Synthetic expense", reason: "Synthetic correction", idempotencyKey: UUID_2 };
const RATES = { plaFirst: "1000", plaMiddle: "900", plaLast: "800", absFirst: "1200", absMiddle: "1100", absLast: "1000", machineHour: "5000", plaOwn: "500", absOwn: "700", plaCommunal: "500", absCommunal: "700" };
const MANIFEST: Readonly<Record<string, Readonly<Record<string, ManifestEntry>>>> = {
  "src/app/admin/finance/actions.ts": {
    createInvoiceDraftAction: { permission: "FINANCE_WRITE", fields: { sourceKind: "ORDER_TOTAL", sourceId: UUID, idempotencyKey: UUID_2 } },
    issueInvoiceAction: { permission: "FINANCE_WRITE", fields: { invoiceId: UUID, expectedVersion: "1", settingsVersion: "1", idempotencyKey: UUID_2 } },
    replaceInvoiceAction: { permission: "FINANCE_CORRECT", fields: { ...{ invoiceId: UUID, expectedVersion: "1", settingsVersion: "1", idempotencyKey: UUID_2 }, reason: "Synthetic correction", expectedSourceVersion: "a".repeat(64) } },
    voidInvoiceAction: { permission: "FINANCE_CORRECT", fields: { invoiceId: UUID, expectedVersion: "1", reason: "Synthetic cancellation" } },
    reverseManualPaymentAction: { permission: "FINANCE_CORRECT", fields: PAYMENT_FIELDS },
    correctManualPaymentAction: { permission: "FINANCE_CORRECT", fields: PAYMENT_FIELDS },
  },
  "src/app/admin/finance/expenses/actions.ts": {
    recordExpenseAction: { permission: "FINANCE_WRITE", fields: EXPENSE_FIELDS },
    correctExpenseAction: { permission: "FINANCE_CORRECT", fields: EXPENSE_FIELDS },
    voidExpenseAction: { permission: "FINANCE_CORRECT", fields: EXPENSE_FIELDS },
  },
  "src/app/admin/finance/settings/actions.ts": { saveBillingSettingsAction: { permission: "BILLING_SETTINGS_MANAGE", fields: { ...BILLING_FIELDS, expectedVersion: "0" } } },
  "src/app/admin/inquiries/[id]/billing/actions.ts": {
    setB2BTermsAction: { permission: "B2B_BILLING_TERMS_MANAGE", fields: { inquiryId: UUID, acceptedQuoteId: UUID_2, expectedVersion: "0", mode: "FULL" } },
    recordB2BTransferAction: { permission: "FINANCE_WRITE", fields: { ...PAYMENT_FIELDS, inquiryId: UUID } },
  },
  "src/app/admin/content/site-information/actions.ts": { publishSiteInformationAction: { permission: "SITE_CONTENT_WRITE", fields: { payload: JSON.stringify({ expectedVersion: 0, values: { shortDescription: "Synthetic company description.", email: "fixture@example.test", phone: "+628000000000", address: "Synthetic business address.", socialLinks: [] } }) } } },
  "src/app/admin/settings/custom-print-rates/actions.ts": { tariffAction: { permission: "PRICING_RULE_ACTIVATE", fields: { phase: "preview", payload: JSON.stringify({ rates: RATES, expectedActiveId: null }) } } },
  [ADMIN_ACCESS_ACTIONS_FILE]: {
    deactivateAdminAction: { permission: "ADMIN_PROFILE_MANAGE", fields: { adminId: UUID_2 } },
  },
  [ADMIN_INVITATION_ACTIONS_FILE]: {
    inviteAdminAction: { permission: "ADMIN_PROFILE_MANAGE", fields: { displayName: "Synthetic invited Admin", email: "fixture@example.test" } },
  },
  [ADMIN_ACTIONS_FILE]: {
    transitionOrderAction: {
      permission: "ORDER_FULFILL",
      fields: { ...ORDER, nextStatus: "PROCESSING" },
    },
    reissueOrderTokenAction: { permission: "ORDER_FULFILL", fields: ORDER },
    createCustomShippingPaymentAction: {
      permission: "SHIPPING_MANAGE",
      fields: {
        ...ORDER,
        finalHeightCm: "10",
        finalLengthCm: "10",
        finalWeightGrams: "100",
        finalWidthCm: "10",
      },
    },
    recordShipmentMetadataAction: {
      permission: "SHIPPING_MANAGE",
      fields: { ...ORDER, courierCode: "jne", trackingNumber: "TRACK12345" },
    },
    saveCustomShippingAddressAction: {
      permission: "SHIPPING_MANAGE",
      fields: {
        ...ORDER,
        addressLine: "Jl. Contoh No. 1",
        city: "Bandung",
        phone: "081234567890",
        postalCode: "40111",
        province: "Jawa Barat",
        recipientName: "Budi Santoso",
      },
    },
    // Owner type picks the permission: CUSTOM_PRINT_REVIEW here; the B2B_INQUIRY
    // branch (INQUIRY_MANAGE) is asserted in its own test below.
    downloadPrivateFileAction: {
      permission: "CUSTOM_PRINT_REVIEW",
      fields: { fileId: UUID, ownerId: UUID_2, ownerType: "CUSTOM_PRINT_REQUEST" },
    },
    recordCustomPrintReviewAction: {
      permission: "CUSTOM_PRINT_REVIEW",
      fields: {
        ...REQUEST,
        materialCode: "PLA",
        printDurationSeconds: "3600",
        quantity: "1",
        verifiedWeightG: "25.5",
      },
    },
    publishCustomPrintEstimateAction: {
      permission: "QUOTE_MANAGE",
      fields: {
        ...REQUEST,
        filamentSource: "NIUVA_STOCK",
        noAdditionalCosts: "yes",
        pricingRuleVersionId: UUID_2,
      },
    },
    saveEstimatedCustomPackageAction: {
      permission: "CUSTOM_PRINT_REVIEW",
      fields: {
        ...REQUEST,
        declaredValueRp: "100000",
        heightCm: "10",
        lengthCm: "10",
        weightGrams: "200",
        widthCm: "10",
      },
    },
    reissueCustomPrintRequestTokenAction: {
      permission: "CUSTOM_PRINT_REVIEW",
      fields: { ...REQUEST, identityVerified: "yes" },
    },
    createQuoteDraftAction: {
      permission: "QUOTE_MANAGE",
      fields: {
        ...REQUEST,
        filamentSource: "NIUVA_STOCK",
        materialCode: "PLA",
        pricingRuleVersionId: UUID_2,
      },
    },
    activatePricingRuleAction: {
      permission: "PRICING_RULE_ACTIVATE",
      fields: { confirmation: "I_UNDERSTAND_NON_PRODUCTION", quantitySemantics: "PER_UNIT" },
    },
    sendQuoteAction: {
      permission: "QUOTE_MANAGE",
      fields: { ...REQUEST, quoteId: UUID_2 },
    },
    reissueQuoteTokenAction: {
      permission: "QUOTE_MANAGE",
      fields: { ...REQUEST, quoteId: UUID_2 },
    },
    updateProductAction: {
      permission: "CATALOG_WRITE",
      fields: {
        ...PRODUCT,
        description: "Deskripsi produk yang cukup panjang.",
        name: "Produk Uji",
        slug: "produk-uji",
      },
    },
    updateVariantAction: {
      permission: "CATALOG_WRITE",
      fields: {
        ...PRODUCT,
        variantId: UUID_2,
        name: "Varian Uji",
        priceRp: "100000",
        sku: "SKU-001",
        weightGrams: "100",
      },
    },
    adjustStockAction: {
      permission: "INVENTORY_ADJUST",
      fields: {
        ...PRODUCT,
        variantId: UUID_2,
        expectedStockOnHand: "5",
        reason: "Penyesuaian stok hasil hitung fisik",
        stockOnHand: "7",
      },
    },
    replaceProductMediaAction: { permission: "CATALOG_WRITE", fields: { ...PRODUCT, mediaJson: "[]" } },
    updatePortfolioAction: {
      permission: "PORTFOLIO_WRITE",
      fields: {
        ...PROJECT,
        challenge: "Tantangan proyek yang cukup panjang.",
        process: "Proses pengerjaan yang cukup panjang.",
        result: "Hasil proyek yang cukup panjang.",
        serviceLabel: "3D Print",
        slug: "proyek-uji",
        summary: "Ringkasan proyek yang cukup panjang.",
        title: "Proyek Uji",
      },
    },
    replacePortfolioMediaAction: { permission: "PORTFOLIO_WRITE", fields: { ...PROJECT, mediaJson: "[]" } },
    transitionInquiryAction: {
      permission: "INQUIRY_MANAGE",
      fields: { inquiryId: UUID, currentStatus: "NEW", nextStatus: "CONTACTED" },
    },
    sendB2BQuoteAction: {
      permission: "INQUIRY_MANAGE",
      fields: {
        inquiryId: UUID,
        assumptions: "Asumsi harga berlaku.",
        lineItemsText: "Jasa cetak | 1000000",
        scope: "Lingkup pekerjaan cetak 3D.",
        validUntil: "2099-01-01",
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "src", "app");

function walk(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
}

const USE_SERVER = /^\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)*["']use server["']/;
const INLINE_USE_SERVER = /["']use server["']/;

function toPosix(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function scanActionFiles(): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  for (const file of walk(APP_DIR)) {
    if (!/\.(?:ts|tsx|js|jsx|mts)$/.test(file)) continue;
    const source = readFileSync(file, "utf8");
    const isActionsFile = /(^|[\\/])actions\.(?:ts|tsx)$/.test(file);
    const isUseServer = INLINE_USE_SERVER.test(source);
    if (!isActionsFile && !isUseServer) continue;
    const rel = toPosix(file);
    if (isUseServer && !isActionsFile && !USE_SERVER.test(source)) {
      // Inline directive inside a function body: cannot be enumerated by name.
      found[rel] = ["<inline-use-server>"];
      continue;
    }
    const names = new Set<string>();
    for (const match of source.matchAll(
      /^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm,
    )) {
      names.add(match[1] as string);
    }
    for (const match of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of (match[1] as string).split(",")) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) names.add(name);
      }
    }
    if (/^export\s+default\b/m.test(source)) names.add("default");
    found[rel] = [...names].sort();
  }
  return found;
}

const loaders: Readonly<Record<string, () => Promise<Record<string, unknown>>>> = {
  "src/app/admin/finance/actions.ts": () => import("@/app/admin/finance/actions"),
  "src/app/admin/finance/expenses/actions.ts": () => import("@/app/admin/finance/expenses/actions"),
  "src/app/admin/finance/settings/actions.ts": () => import("@/app/admin/finance/settings/actions"),
  "src/app/admin/inquiries/[id]/billing/actions.ts": () => import("@/app/admin/inquiries/[id]/billing/actions"),
  "src/app/admin/content/site-information/actions.ts": () => import("@/app/admin/content/site-information/actions"),
  "src/app/admin/settings/custom-print-rates/actions.ts": () => import("@/app/admin/settings/custom-print-rates/actions"),
  [ADMIN_ACTIONS_FILE]: () => import("@/app/admin/actions"),
  [ADMIN_ACCESS_ACTIONS_FILE]: () => import("@/app/admin/admins/actions"),
  [ADMIN_INVITATION_ACTIONS_FILE]: () => import("@/app/admin/admins/new/actions"),
};

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

type ActionResult = Readonly<{ message?: string; status: string }>;
type ActionFn = (previous: unknown, formData: FormData) => Promise<ActionResult>;

function formData(fields: Fields): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function access(role: "ADMIN" | "OWNER", isActive: boolean): AdminAccess {
  return {
    authUserId: "user_test",
    profile: {
      authUserId: "user_test",
      email: "admin@example.test",
      id: UUID,
      isActive,
      role,
    },
  } as unknown as AdminAccess;
}

function errorCodes(): string[] {
  return state.errors.map((error) => (isAppError(error) ? error.code : "NON_APP_ERROR"));
}

function expectRejectedBeforeDomainWork(result: ActionResult): void {
  expect(result.status).toBe("error");
  expect(state.adminCalls, "auth boundary must be reached (validation must not run first)").toBeGreaterThan(0);
  expect(state.dbCalls, "database must not be touched").toEqual([]);
}

beforeEach(() => {
  state.adminCalls = 0;
  state.authorize = null;
  state.dbCalls = [];
  state.denyAll = false;
  state.errors = [];
  state.permissions = [];
});

describe("Server Action authorization manifest (scan)", () => {
  it("lists every actions.ts / \"use server\" file and export under src/app", () => {
    const scanned = scanActionFiles();
    const expected = Object.fromEntries(
      Object.entries(MANIFEST).map(([file, actions]) => [file, Object.keys(actions).sort()]),
    );
    expect(scanned).toEqual(expected);
  });

  it("has a loader for every manifest file and exports exactly the manifest actions at runtime", async () => {
    expect(Object.keys(loaders).sort()).toEqual(Object.keys(MANIFEST).sort());
    for (const [file, actions] of Object.entries(MANIFEST)) {
      const mod = await loaders[file]!();
      expect(Object.keys(mod).sort()).toEqual(Object.keys(actions).sort());
      for (const name of Object.keys(actions)) expect(typeof mod[name]).toBe("function");
    }
  });
});

for (const [file, actions] of Object.entries(MANIFEST)) {
  describe(`${file} rejects unauthorized calls`, () => {
    for (const [name, entry] of Object.entries(actions)) {
      const run = async (): Promise<ActionResult> => {
        const action = (await loaders[file]!())[name] as ActionFn;
        return action({ status: "idle" }, formData(entry.fields));
      };
      const guarded = entry.knownGap === undefined ? it : it.fails;

      describe(`${name} (${entry.permission})`, () => {
        guarded("rejects when there is no admin session", async () => {
          state.authorize = () => {
            throw appError("UNAUTHORIZED");
          };
          const result = await run();
          expectRejectedBeforeDomainWork(result);
          expect(errorCodes()).toContain("UNAUTHORIZED");
        });

        guarded("rejects an inactive admin profile", async () => {
          state.authorize = () => access("OWNER", false);
          const result = await run();
          expectRejectedBeforeDomainWork(result);
          expect(errorCodes()).toContain("FORBIDDEN");
          expect(state.permissions).toContain(entry.permission);
        });

        guarded("rejects an active admin without the required permission", async () => {
          state.authorize = () => access("OWNER", true);
          state.denyAll = true;
          const result = await run();
          expectRejectedBeforeDomainWork(result);
          expect(errorCodes()).toContain("FORBIDDEN");
          expect(state.permissions).toContain(entry.permission);
        });
      });
    }
  });
}

describe("permission-specific checks", () => {
  it("activatePricingRuleAction rejects an active ADMIN role (Owner-only permission) with the real matrix", async () => {
    state.authorize = () => access("ADMIN", true);
    const action = (await loaders[ADMIN_ACTIONS_FILE]!()).activatePricingRuleAction as ActionFn;
    const result = await action(
      { status: "idle" },
      formData(MANIFEST[ADMIN_ACTIONS_FILE]!.activatePricingRuleAction!.fields),
    );
    expectRejectedBeforeDomainWork(result);
    expect(errorCodes()).toContain("FORBIDDEN");
  });

  it("downloadPrivateFileAction requires INQUIRY_MANAGE for B2B inquiry files", async () => {
    state.authorize = () => access("OWNER", true);
    state.denyAll = true;
    const action = (await loaders[ADMIN_ACTIONS_FILE]!()).downloadPrivateFileAction as ActionFn;
    const result = await action(
      { status: "idle" },
      formData({ fileId: UUID, ownerId: UUID_2, ownerType: "B2B_INQUIRY" }),
    );
    expectRejectedBeforeDomainWork(result);
    expect(state.permissions).toContain("INQUIRY_MANAGE");
  });

  it("transitionOrderAction demands ORDER_FULFILL before any order lookup", async () => {
    state.authorize = () => access("OWNER", true);
    state.denyAll = true;
    const action = (await loaders[ADMIN_ACTIONS_FILE]!()).transitionOrderAction as ActionFn;
    await action({ status: "idle" }, formData({ orderId: UUID, nextStatus: "CANCELLED" }));
    expect(state.permissions).toEqual(["ORDER_FULFILL"]);
    expect(state.dbCalls).toEqual([]);
  });
});
