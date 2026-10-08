import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/admin";
import type { FailureEvent, FailureKind } from "@/lib/observability/logger";
import { AppError } from "@/modules/shared/errors";

// Admin pages of group C (Overview and stock history) record source failures.
// record the failure cause BEFORE the "belum dapat dimuat" view is rendered.
// Overview and stock history pass the FailureKind to AdminDataUnavailableView; the
// The retired Queue performs an authorized redirect without loading operational data.
// The privacy pages have no catch / unavailable view and are intentionally untouched.
// **Validates: Requirements 8.4, 8.5, 27.4**

const SECRET_DETAIL = "SECRET-DB-DETAIL postgres://admin:hunter2@db.internal:5432/niuva";

const mocks = vi.hoisted(() => {
  class NotFoundSentinel extends Error {}
  class RedirectSentinel extends Error {}

  return {
    NotFoundSentinel,
    RedirectSentinel,
    analyticsLoad: vi.fn(),
    activityList: vi.fn(),
    connection: vi.fn(),
    dashboardLoad: vi.fn(),
    getStockHistory: vi.fn(),
    loadAdminPageAccess: vi.fn(),
    notFound: vi.fn(),
    redirect: vi.fn(),
    queueList: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
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
vi.mock("@/app/admin/action-queue-view", () => ({
  AdminActionQueueErrorView: () => <div data-testid="queue-error-view" />,
  AdminActionQueueView: () => <div data-testid="queue-view" />,
}));
vi.mock("@/app/admin/overview-view", () => ({
  AdminOverviewView: ({ data }: Readonly<{ data: { attention: { status: string }; traffic: { status: string } } }>) => (
    <div data-attention={data.attention.status} data-analytics={data.traffic.status === "unavailable" ? "missing" : "present"} data-testid="overview-view" />
  ),
}));

vi.mock("@/modules/admin/action-queue-service", () => ({
  ActionQueueService: vi.fn(function MockActionQueueService() {
    return { list: mocks.queueList };
  }),
}));
vi.mock("@/modules/admin/dashboard-service", () => ({
  DashboardService: vi.fn(function MockDashboardService() {
    return { load: mocks.dashboardLoad };
  }),
}));
vi.mock("@/modules/admin/reports/service", () => ({
  AdminReportsService: vi.fn(function Reports() { return { load: mocks.analyticsLoad }; }),
}));
vi.mock("@/modules/analytics/service", () => ({
  AnalyticsService: vi.fn(function MockAnalyticsService() {
    return { load: mocks.analyticsLoad };
  }),
}));
vi.mock("@/modules/admin/activity-timeline", () => ({
  AdminActivityTimelineService: vi.fn(function MockAdminActivityTimelineService() {
    return { list: mocks.activityList };
  }),
}));
vi.mock("@/modules/admin/operations", () => ({
  AdminOperationsService: vi.fn(function MockAdminOperationsService() {
    return { getStockHistory: mocks.getStockHistory };
  }),
  parseAdminPage: (value: string | undefined) => (value === "2" ? 2 : 1),
}));

import { resetAdminPageFailureLogger, setAdminPageFailureLogger } from "@/app/admin/admin-page-failure";
import AdminPage from "@/app/admin/page";
import AdminQueuePage from "@/app/admin/queue/page";
import AdminStockHistoryPage from "@/app/admin/products/[id]/stock/[variantId]/page";

const VALID_ID = "a6f443d8-3e8a-49b5-81d0-94d56e06c208";
const VARIANT_ID = "0b1d2c3e-4f50-4a61-8b72-93c4d5e6f708";

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

type GroupCPage = Readonly<{
  name: string;
  boundary: string;
  page: (props: never) => Promise<ReactNode>;
  props: unknown;
  /** The read that, when it rejects, takes the whole page to its unavailable view. */
  read: () => ReturnType<typeof vi.fn>;
  successValue: unknown;
  unavailableTestId: string;
  /** Whether the unavailable view receives the FailureKind. */
  passesKind: boolean;
  expectedContext: Record<string, string>;
}>;

const listProps = { searchParams: Promise.resolve({}) };
const queueResult = { filteredTotal: 0, generatedAt: new Date("2026-01-01T00:00:00Z"), group: "all", items: [], totalOpen: 0 };

const pages: readonly GroupCPage[] = [
  {
    name: "products/[id]/stock/[variantId]",
    boundary: "page:/admin/products/[id]/stock/[variantId]",
    page: AdminStockHistoryPage,
    props: { params: Promise.resolve({ id: VALID_ID, variantId: VARIANT_ID }), searchParams: Promise.resolve({}) },
    read: () => mocks.getStockHistory,
    successValue: null,
    unavailableTestId: "unavailable-view",
    passesKind: true,
    expectedContext: { id: VALID_ID, op: "detail", page: "1", variantId: VARIANT_ID },
  },
];

async function run(testCase: GroupCPage) {
  try {
    const element = await testCase.page(testCase.props as never);
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
  mocks.queueList.mockResolvedValue(queueResult);
  mocks.dashboardLoad.mockResolvedValue({});
  mocks.analyticsLoad.mockResolvedValue({ generatedAt: "2026-10-08T00:00:00Z", finance: { status: "unavailable", message: "Finance unavailable" }, operations: { status: "ok", data: { paidOrders: 0 } }, traffic: { status: "ok", data: {} } });
  mocks.activityList.mockResolvedValue({ items: [], page: 1, hasNext: false });
  mocks.getStockHistory.mockResolvedValue(null);
});

afterEach(() => {
  resetAdminPageFailureLogger();
});

describe.each(pages)("admin group C page $name", (testCase) => {
  it.each(failureSamples)(
    "logs once before the unavailable view for %s",
    async (_label, makeError, expectedKind) => {
      testCase.read().mockRejectedValue(makeError());

      const result = await run(testCase);

      expect(result.outcome).toBe("rendered");
      expect(result.loggedBeforeView).toBe(1);
      expect(recorded).toHaveLength(1);
      expect(recorded[0]).toMatchObject({ boundary: testCase.boundary, kind: expectedKind });
      expect(recorded[0]?.safeContext).toEqual(testCase.expectedContext);
      expect(recorded[0]?.correlationId).toMatch(/^[0-9a-f-]{36}$/);
      const view = screen.getByTestId(testCase.unavailableTestId);
      if (testCase.passesKind) expect(view).toHaveAttribute("data-kind", expectedKind);
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

    await run(testCase);

    expect(screen.queryByTestId(testCase.unavailableTestId)).not.toBeInTheDocument();
    expect(recorded).toHaveLength(0);
  });

  it("does not read or log anything when the access gate denies", async () => {
    mocks.loadAdminPageAccess.mockResolvedValue({ kind: "denied", state: "FORBIDDEN" });
    testCase.read().mockRejectedValue(databaseError());

    await run(testCase);

    expect(screen.getByTestId("access-view")).toBeInTheDocument();
    expect(testCase.read()).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });
});

describe("independent Overview source failures", () => {
  it.each(failureSamples)("logs an attention source failure safely for %s", async (_label, makeError, kind) => {
    mocks.queueList.mockRejectedValue(makeError());
    render(await AdminPage(listProps));
    expect(screen.getByTestId("overview-view")).toHaveAttribute("data-attention", "unavailable");
    expect(recorded).toHaveLength(1); expect(recorded[0]).toMatchObject({ boundary: "page:/admin", kind, safeContext: { op: "attention" } });
    expect(JSON.stringify(recorded)).not.toContain("SECRET-DB-DETAIL");
  });
  it("does not swallow control-flow signals from attention", async () => {
    mocks.queueList.mockRejectedValue(new mocks.RedirectSentinel("NEXT_REDIRECT"));
    await expect(AdminPage(listProps)).rejects.toBeInstanceOf(mocks.RedirectSentinel); expect(recorded).toHaveLength(0);
  });
  it("renders a traffic failure while retaining attention", async () => {
    mocks.analyticsLoad.mockResolvedValue({ generatedAt: "2026-10-08T00:00:00Z", finance: { status: "unavailable" }, operations: { status: "ok", data: { paidOrders: 0 } }, traffic: { status: "unavailable" } });
    render(await AdminPage(listProps)); expect(screen.getByTestId("overview-view")).toHaveAttribute("data-analytics", "missing");
    expect(screen.getByTestId("overview-view")).toHaveAttribute("data-attention", "ok");
  });
  it("keeps auth ahead of every data read", async () => {
    mocks.loadAdminPageAccess.mockResolvedValue({ kind: "denied", state: "FORBIDDEN" });
    render(await AdminPage(listProps)); expect(mocks.queueList).not.toHaveBeenCalled(); expect(mocks.analyticsLoad).not.toHaveBeenCalled(); expect(mocks.activityList).not.toHaveBeenCalled();
  });
});

describe("admin stock history page gates", () => {
  const stockPage = pages[0] as GroupCPage;

  it("treats AppError NOT_FOUND as not-found without logging", async () => {
    mocks.getStockHistory.mockRejectedValue(new AppError("NOT_FOUND"));
    const result = await run(stockPage);
    expect(result.outcome).toBe("not-found");
    expect(recorded).toHaveLength(0);
  });

  it("returns not-found for a non-UUID id without reading", async () => {
    const result = await run({ ...stockPage, props: { params: Promise.resolve({ id: "x", variantId: VARIANT_ID }), searchParams: Promise.resolve({}) } });
    expect(result.outcome).toBe("not-found");
    expect(mocks.getStockHistory).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });
});

describe("retired Queue compatibility", () => {
  it("redirects to the domain even when the former Queue data source is unavailable", async () => {
    mocks.queueList.mockRejectedValue(databaseError());
    mocks.redirect.mockImplementation((destination: string) => { throw new mocks.RedirectSentinel(destination); });
    await expect(AdminQueuePage({ searchParams: Promise.resolve({ group: "orders" }) })).rejects.toThrow("/admin/orders?view=needs-action");
    expect(mocks.queueList).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });
});
