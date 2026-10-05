import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import type { FailureEvent, FailureKind } from "@/lib/observability/logger";
import { AppError } from "@/modules/shared/errors";

// Task 3.8 (G3): admin pages of group B (portfolio, products, pricing) record the
// failure cause BEFORE the "belum dapat dimuat" view is rendered, and pass the
// FailureKind to that view. redirect()/notFound() signals are never swallowed, and
// success / not-found paths write no log.
// **Validates: Requirements 8.4, 8.5, 27.4**

const SECRET_DETAIL = "SECRET-DB-DETAIL postgres://admin:hunter2@db.internal:5432/niuva";

const mocks = vi.hoisted(() => {
  class NotFoundSentinel extends Error {}
  class RedirectSentinel extends Error {}

  return {
    NotFoundSentinel,
    RedirectSentinel,
    connection: vi.fn(),
    loadAdminPageAccess: vi.fn(),
    notFound: vi.fn(),
    service: {
      getActivePricingRule: vi.fn(),
      getPortfolio: vi.fn(),
      getProduct: vi.fn(),
      listPortfolio: vi.fn(),
      listPricingRules: vi.fn(),
      listProducts: vi.fn(),
    },
  };
});

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  // Only Next.js control-flow signals are re-thrown, as the real function does.
  unstable_rethrow: (error: unknown) => {
    if (error instanceof mocks.NotFoundSentinel || error instanceof mocks.RedirectSentinel) throw error;
  },
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/link", () => ({ default: () => null }));

vi.mock("@/app/admin/admin-page-access", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/admin/admin-page-access")>();
  return { ...original, loadAdminPageAccess: mocks.loadAdminPageAccess };
});
vi.mock("@/app/admin/admin-access-view", () => ({ AdminAccessView: () => <div data-testid="access-view" /> }));

vi.mock("@/components/niuva/admin-shell", () => ({
  AdminDataUnavailableView: ({ kind, title }: Readonly<{ kind?: string; title?: string }>) => (
    <div data-kind={kind ?? ""} data-testid="unavailable-view">{title}</div>
  ),
  AdminPagination: () => null,
  AdminShell: ({ children }: Readonly<{ children: ReactNode }>) => <div data-testid="admin-shell">{children}</div>,
}));

vi.mock("@/modules/admin/operations", () => ({
  AdminOperationsService: vi.fn(function MockAdminOperationsService() {
    return mocks.service;
  }),
  parseAdminPage: (value: string | undefined) => (value === "2" ? 2 : 1),
}));
vi.mock("@/app/admin/admin-action-form", () => ({ AdminActionForm: () => null }));
vi.mock("@/app/admin/products/[id]/stock-adjustment-panel", () => ({ StockAdjustmentPanel: () => null }));
vi.mock("@/app/admin/actions", () => ({
  activatePricingRuleAction: vi.fn(),
  replacePortfolioMediaAction: vi.fn(),
  replaceProductMediaAction: vi.fn(),
  updatePortfolioAction: vi.fn(),
  updateProductAction: vi.fn(),
  updateVariantAction: vi.fn(),
}));

import {
  recordAdminPageFailure,
  resetAdminPageFailureLogger,
  setAdminPageFailureLogger,
} from "@/app/admin/admin-page-failure";
import AdminPortfolioPage from "@/app/admin/portfolio/page";
import AdminPortfolioDetailPage from "@/app/admin/portfolio/[id]/page";
import AdminPricingPage from "@/app/admin/pricing/page";
import AdminProductsPage from "@/app/admin/products/page";
import AdminProductDetailPage from "@/app/admin/products/[id]/page";

const VALID_ID = "a6f443d8-3e8a-49b5-81d0-94d56e06c208";

const adminAccess = {
  clerkUserId: "user_admin",
  profile: { clerkUserId: "user_admin", id: VALID_ID, isActive: true, role: "ADMIN" },
} as unknown as AdminAccess;

const recorded: FailureEvent[] = [];

function databaseError(): Error {
  const error = new Error(SECRET_DETAIL);
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code: "P1001" });
  return error;
}

function timeoutError(): Error {
  const error = new Error(SECRET_DETAIL);
  error.name = "TimeoutError";
  return error;
}

const failureSamples: ReadonlyArray<readonly [string, () => unknown, FailureKind]> = [
  ["a database connectivity error", databaseError, "DATABASE_UNAVAILABLE"],
  ["a timeout error", timeoutError, "PROVIDER_TIMEOUT"],
  ["an unrecognised error", () => new TypeError(SECRET_DETAIL), "CODE_DEFECT"],
];

type GroupBPage = Readonly<{
  name: string;
  boundary: string;
  page: (props: never) => Promise<ReactNode>;
  props: unknown;
  read: () => ReturnType<typeof vi.fn>;
  /** Value a successful read resolves to; `null` for detail pages (not-found). */
  successValue: unknown;
  detail: boolean;
  safeContext: Readonly<Record<string, string>>;
}>;

const listProps = { searchParams: Promise.resolve({}) };
const detailProps = { params: Promise.resolve({ id: VALID_ID }) };
const emptyList = { generatedAt: new Date("2026-01-01T00:00:00Z"), hasNext: false, items: [], page: 1, role: "ADMIN" };

const pages: readonly GroupBPage[] = [
  { name: "portfolio", boundary: "page:/admin/portfolio", page: AdminPortfolioPage, props: listProps, read: () => mocks.service.listPortfolio, successValue: emptyList, detail: false, safeContext: { op: "list", page: "1" } },
  { name: "products", boundary: "page:/admin/products", page: AdminProductsPage, props: listProps, read: () => mocks.service.listProducts, successValue: emptyList, detail: false, safeContext: { op: "list", page: "1" } },
  { name: "pricing (list read)", boundary: "page:/admin/pricing", page: AdminPricingPage, props: listProps, read: () => mocks.service.listPricingRules, successValue: emptyList, detail: false, safeContext: { op: "list", page: "1" } },
  { name: "pricing (active-rule read)", boundary: "page:/admin/pricing", page: AdminPricingPage, props: listProps, read: () => mocks.service.getActivePricingRule, successValue: null, detail: false, safeContext: { op: "list", page: "1" } },
  { name: "portfolio/[id]", boundary: "page:/admin/portfolio/[id]", page: AdminPortfolioDetailPage, props: detailProps, read: () => mocks.service.getPortfolio, successValue: null, detail: true, safeContext: { id: VALID_ID, op: "detail" } },
  { name: "products/[id]", boundary: "page:/admin/products/[id]", page: AdminProductDetailPage, props: detailProps, read: () => mocks.service.getProduct, successValue: null, detail: true, safeContext: { id: VALID_ID, op: "detail" } },
];

async function run(testCase: GroupBPage) {
  try {
    const element = await testCase.page(testCase.props as never);
    // The log must already exist when the page hands back its element, i.e. before any view renders.
    const loggedBeforeView = recorded.length;
    render(<>{element}</>);
    return { outcome: "rendered" as const, loggedBeforeView };
  } catch (error) {
    if (error instanceof mocks.NotFoundSentinel) return { outcome: "not-found" as const, loggedBeforeView: recorded.length };
    throw error;
  }
}

beforeEach(() => {
  recorded.length = 0;
  setAdminPageFailureLogger({ record: (event) => recorded.push(event) });
  mocks.connection.mockResolvedValue(undefined);
  mocks.loadAdminPageAccess.mockResolvedValue({ kind: "granted", access: adminAccess });
  mocks.notFound.mockImplementation(() => {
    throw new mocks.NotFoundSentinel("NEXT_NOT_FOUND_SENTINEL");
  });
  for (const read of Object.values(mocks.service)) read.mockResolvedValue(null);
  mocks.service.listPortfolio.mockResolvedValue(emptyList);
  mocks.service.listProducts.mockResolvedValue(emptyList);
  mocks.service.listPricingRules.mockResolvedValue(emptyList);
});

afterEach(() => {
  resetAdminPageFailureLogger();
});

describe.each(pages)("admin group B page $name", (testCase) => {
  it.each(failureSamples)(
    "logs once before the unavailable view and passes the kind for %s",
    async (_label, makeError, expectedKind) => {
      testCase.read().mockRejectedValue(makeError());

      const result = await run(testCase);

      expect(result.outcome).toBe("rendered");
      expect(result.loggedBeforeView).toBe(1);
      expect(recorded).toHaveLength(1);
      expect(recorded[0]).toMatchObject({ boundary: testCase.boundary, kind: expectedKind, safeContext: testCase.safeContext });
      expect(recorded[0]?.correlationId).toMatch(/^[0-9a-f-]{36}$/);
      expect(screen.getByTestId("unavailable-view")).toHaveAttribute("data-kind", expectedKind);
      expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
      expect(JSON.stringify(recorded)).not.toContain("SECRET-DB-DETAIL");
      expect(document.body).not.toHaveTextContent("SECRET-DB-DETAIL");
    },
  );

  it("does not swallow a notFound()/redirect() control-flow signal and writes no log", async () => {
    testCase.read().mockRejectedValue(new mocks.NotFoundSentinel("NEXT_NOT_FOUND_SENTINEL"));
    await expect(testCase.page(testCase.props as never)).rejects.toBeInstanceOf(mocks.NotFoundSentinel);
    expect(recorded).toHaveLength(0);

    testCase.read().mockRejectedValue(new mocks.RedirectSentinel("NEXT_REDIRECT"));
    await expect(testCase.page(testCase.props as never)).rejects.toBeInstanceOf(mocks.RedirectSentinel);
    expect(recorded).toHaveLength(0);
  });

  it("writes no log on the success path", async () => {
    testCase.read().mockResolvedValue(testCase.successValue);

    const result = await run(testCase);

    expect(result.outcome).toBe(testCase.detail ? "not-found" : "rendered");
    expect(screen.queryByTestId("unavailable-view")).not.toBeInTheDocument();
    expect(recorded).toHaveLength(0);
  });
});

describe.each(pages.filter((testCase) => testCase.detail))("admin group B detail page $name", (testCase) => {
  it("treats AppError NOT_FOUND as not-found without logging", async () => {
    testCase.read().mockRejectedValue(new AppError("NOT_FOUND"));
    const result = await run(testCase);
    expect(result.outcome).toBe("not-found");
    expect(recorded).toHaveLength(0);
  });

  it("does not read or log anything before the access gate passes", async () => {
    mocks.loadAdminPageAccess.mockResolvedValue({ kind: "denied", state: "FORBIDDEN" });
    testCase.read().mockRejectedValue(databaseError());
    await run(testCase);
    expect(testCase.read()).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });
});

describe.each(pages.filter((testCase) => !testCase.detail))("admin group B list page $name", (testCase) => {
  it("does not read or log anything before the access gate passes", async () => {
    mocks.loadAdminPageAccess.mockResolvedValue({ kind: "denied", state: "UNAUTHENTICATED" });
    testCase.read().mockRejectedValue(databaseError());

    await run(testCase);

    expect(screen.getByTestId("access-view")).toBeInTheDocument();
    expect(testCase.read()).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });
});

describe("recordAdminPageFailure with group B boundaries", () => {
  it("records one event per failure with a fresh correlation id and no error message", () => {
    const kind = recordAdminPageFailure(databaseError(), "page:/admin/pricing", { op: "list", page: "2" });

    expect(kind).toBe("DATABASE_UNAVAILABLE");
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ boundary: "page:/admin/pricing", safeContext: { op: "list", page: "2" } });
    expect(JSON.stringify(recorded)).not.toContain("SECRET-DB-DETAIL");
  });
});
