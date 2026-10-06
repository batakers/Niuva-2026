import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/admin";
import type { FailureEvent, FailureKind } from "@/lib/observability/logger";
import { AppError } from "@/modules/shared/errors";

// Task 3.7 (G3): admin pages of group A (orders, inquiries, custom-print) record
// the failure cause BEFORE the "belum dapat dimuat" view is rendered, and pass the
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
    estimateLatest: vi.fn(),
    loadAdminPageAccess: vi.fn(),
    notFound: vi.fn(),
    service: {
      getActivePricingRule: vi.fn(),
      getCustomPrintRequest: vi.fn(),
      getInquiry: vi.fn(),
      getOrder: vi.fn(),
      listCustomPrintRequests: vi.fn(),
      listInquiries: vi.fn(),
      listOrders: vi.fn(),
      listPricingRules: vi.fn(),
    },
    listQuotes: vi.fn(),
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
vi.mock("@/modules/custom-print/estimate", () => ({
  CustomPrintEstimateService: vi.fn(function MockCustomPrintEstimateService() {
    return { latestForAdmin: mocks.estimateLatest };
  }),
  isEstimateCurrent: () => false,
}));
vi.mock("@/modules/custom-print/customer-preview", () => ({ readCustomerPreviewSnapshot: () => null }));
vi.mock("@/modules/inquiry/b2b-quote", () => ({
  B2BQuoteService: vi.fn(function MockB2BQuoteService() {
    return { listForAdmin: mocks.listQuotes };
  }),
}));
vi.mock("@/app/admin/inquiries/[id]/b2b-quote-panel", () => ({ B2BQuoteAdminPanel: () => null }));
vi.mock("@/app/admin/admin-action-form", () => ({ AdminActionForm: () => null }));
vi.mock("@/app/admin/actions", () => ({
  createCustomShippingPaymentAction: vi.fn(),
  createQuoteDraftAction: vi.fn(),
  downloadPrivateFileAction: vi.fn(),
  publishCustomPrintEstimateAction: vi.fn(),
  recordCustomPrintReviewAction: vi.fn(),
  recordShipmentMetadataAction: vi.fn(),
  reissueCustomPrintRequestTokenAction: vi.fn(),
  reissueOrderTokenAction: vi.fn(),
  reissueQuoteTokenAction: vi.fn(),
  saveCustomShippingAddressAction: vi.fn(),
  saveEstimatedCustomPackageAction: vi.fn(),
  sendQuoteAction: vi.fn(),
  transitionInquiryAction: vi.fn(),
  transitionOrderAction: vi.fn(),
}));

import {
  loadAdminRecordLogged,
  recordAdminPageFailure,
  resetAdminPageFailureLogger,
  setAdminPageFailureLogger,
} from "@/app/admin/admin-page-failure";
import AdminCustomPrintPage from "@/app/admin/custom-print/page";
import AdminCustomPrintDetailPage from "@/app/admin/custom-print/[id]/page";
import AdminInquiriesPage from "@/app/admin/inquiries/page";
import AdminInquiryDetailPage from "@/app/admin/inquiries/[id]/page";
import AdminOrdersPage from "@/app/admin/orders/page";
import AdminOrderDetailPage from "@/app/admin/orders/[id]/page";

const VALID_ID = "a6f443d8-3e8a-49b5-81d0-94d56e06c208";

const adminAccess = {
  authUserId: "user_admin",
  profile: { authUserId: "user_admin", id: VALID_ID, isActive: true, role: "ADMIN" },
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

type GroupAPage = Readonly<{
  name: string;
  boundary: string;
  page: (props: never) => Promise<ReactNode>;
  props: unknown;
  read: () => ReturnType<typeof vi.fn>;
  /** Value a successful read resolves to; `null` for detail pages (not-found). */
  successValue: unknown;
  detail: boolean;
}>;

const listProps = { searchParams: Promise.resolve({}) };
const detailProps = { params: Promise.resolve({ id: VALID_ID }) };
const emptyList = { generatedAt: new Date("2026-01-01T00:00:00Z"), hasNext: false, items: [], page: 1, role: "ADMIN" };

const pages: readonly GroupAPage[] = [
  { name: "orders", boundary: "page:/admin/orders", page: AdminOrdersPage, props: listProps, read: () => mocks.service.listOrders, successValue: emptyList, detail: false },
  { name: "inquiries", boundary: "page:/admin/inquiries", page: AdminInquiriesPage, props: listProps, read: () => mocks.service.listInquiries, successValue: emptyList, detail: false },
  { name: "custom-print", boundary: "page:/admin/custom-print", page: AdminCustomPrintPage, props: listProps, read: () => mocks.service.listCustomPrintRequests, successValue: emptyList, detail: false },
  { name: "orders/[id]", boundary: "page:/admin/orders/[id]", page: AdminOrderDetailPage, props: detailProps, read: () => mocks.service.getOrder, successValue: null, detail: true },
  { name: "inquiries/[id]", boundary: "page:/admin/inquiries/[id]", page: AdminInquiryDetailPage, props: detailProps, read: () => mocks.service.getInquiry, successValue: null, detail: true },
  { name: "custom-print/[id]", boundary: "page:/admin/custom-print/[id]", page: AdminCustomPrintDetailPage, props: detailProps, read: () => mocks.service.getCustomPrintRequest, successValue: null, detail: true },
];

async function run(testCase: GroupAPage) {
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
  mocks.service.listPricingRules.mockResolvedValue([]);
  mocks.estimateLatest.mockResolvedValue(null);
  mocks.listQuotes.mockResolvedValue([]);
});

afterEach(() => {
  resetAdminPageFailureLogger();
});

describe.each(pages)("admin group A page $name", (testCase) => {
  it.each(failureSamples)(
    "logs once before the unavailable view and passes the kind for %s",
    async (_label, makeError, expectedKind) => {
      testCase.read().mockRejectedValue(makeError());

      const result = await run(testCase);

      expect(result.outcome).toBe("rendered");
      expect(result.loggedBeforeView).toBe(1);
      expect(recorded).toHaveLength(1);
      expect(recorded[0]).toMatchObject({ boundary: testCase.boundary, kind: expectedKind });
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

describe.each(pages.filter((testCase) => testCase.detail))("admin group A detail page $name", (testCase) => {
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

describe("admin custom-print detail secondary reads", () => {
  it.each([
    ["listPricingRules", "pricing-rules"],
    ["getActivePricingRule", "active-pricing-rule"],
  ] as const)("logs a failing %s read and keeps the existing fallback", async (method, op) => {
    mocks.service[method].mockRejectedValue(databaseError());
    mocks.service.getCustomPrintRequest.mockResolvedValue(null);

    const result = await run(pages[5] as GroupAPage);

    expect(result.outcome).toBe("not-found");
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ boundary: "page:/admin/custom-print/[id]", kind: "DATABASE_UNAVAILABLE" });
    expect(recorded[0]?.safeContext).toEqual({ op });
  });
});

describe("recordAdminPageFailure", () => {
  it("returns the classified kind and records one event with a fresh correlation id", () => {
    const kind = recordAdminPageFailure(databaseError(), "page:/admin/orders", { op: "list" });
    const second = recordAdminPageFailure(databaseError(), "page:/admin/orders");

    expect(kind).toBe("DATABASE_UNAVAILABLE");
    expect(second).toBe("DATABASE_UNAVAILABLE");
    expect(recorded).toHaveLength(2);
    expect(recorded[0]?.correlationId).not.toBe(recorded[1]?.correlationId);
    expect(recorded[0]).toMatchObject({ boundary: "page:/admin/orders", errorCode: "INTERNAL_ERROR", safeContext: { op: "list" } });
  });

  it("keeps the AppError code on the event", () => {
    recordAdminPageFailure(new AppError("FORBIDDEN"), "page:/admin/orders");
    expect(recorded[0]).toMatchObject({ errorCode: "FORBIDDEN", kind: "AUTHORIZATION_REJECTED" });
  });

  it("re-throws control-flow signals without logging", () => {
    expect(() => recordAdminPageFailure(new mocks.RedirectSentinel("NEXT_REDIRECT"), "page:/admin/orders")).toThrow(
      mocks.RedirectSentinel,
    );
    expect(recorded).toHaveLength(0);
  });

  it("never throws when the logger is broken, for any thrown value", () => {
    setAdminPageFailureLogger({
      record: () => {
        throw new Error("logger down");
      },
    });
    for (const value of [null, undefined, "text", 42, Symbol("x"), {}, new Error("x")]) {
      expect(recordAdminPageFailure(value, "page:/admin/orders")).toBe("CODE_DEFECT");
    }
  });
});

describe("loadAdminRecordLogged", () => {
  it("returns found and not-found results without logging", async () => {
    expect(await loadAdminRecordLogged("page:/admin/x", async () => ({ id: "a" }))).toEqual({
      status: "found",
      record: { id: "a" },
    });
    expect(await loadAdminRecordLogged("page:/admin/x", async () => null)).toEqual({ status: "not-found" });
    expect(await loadAdminRecordLogged("page:/admin/x", async () => Promise.reject(new AppError("NOT_FOUND")))).toEqual({
      status: "not-found",
    });
    expect(recorded).toHaveLength(0);
  });

  it("logs once and returns the kind for an unavailable read", async () => {
    const result = await loadAdminRecordLogged("page:/admin/x", () => Promise.reject(timeoutError()), { id: VALID_ID });
    expect(result).toEqual({ status: "unavailable", kind: "PROVIDER_TIMEOUT" });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ boundary: "page:/admin/x", kind: "PROVIDER_TIMEOUT", safeContext: { id: VALID_ID } });
  });
});
