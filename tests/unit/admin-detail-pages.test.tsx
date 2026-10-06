import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_ACCESS_STATES } from "@/app/admin/admin-page-access";
import type { AdminAccess } from "@/lib/auth/admin";
import { AppError } from "@/modules/shared/errors";

const NOT_FOUND_MESSAGE = "NEXT_NOT_FOUND_SENTINEL";
const SECRET_DETAIL = "SECRET-DB-DETAIL postgres://admin:hunter2@db.internal:5432/niuva";

const mocks = vi.hoisted(() => {
  class NotFoundSentinel extends Error {}

  return {
    NotFoundSentinel,
    connection: vi.fn(),
    estimateLatest: vi.fn(),
    listQuotes: vi.fn(),
    loadAdminPageAccess: vi.fn(),
    notFound: vi.fn(),
    service: {
      getActivePricingRule: vi.fn(),
      getCustomPrintRequest: vi.fn(),
      getInquiry: vi.fn(),
      getOrder: vi.fn(),
      getPortfolio: vi.fn(),
      getProduct: vi.fn(),
      getStockHistory: vi.fn(),
      listPricingRules: vi.fn(),
    },
  };
});

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  // Only the not-found control-flow signal is re-thrown, as Next.js does.
  unstable_rethrow: (error: unknown) => {
    if (error instanceof mocks.NotFoundSentinel) throw error;
  },
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));

vi.mock("@/app/admin/admin-page-access", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/admin/admin-page-access")>();
  return { ...original, loadAdminPageAccess: mocks.loadAdminPageAccess };
});

vi.mock("@/app/admin/admin-access-view", () => ({
  AdminAccessView: ({ state }: Readonly<{ state: string }>) => <div data-state={state} data-testid="access-view" />,
}));

vi.mock("@/components/niuva/admin-shell", () => ({
  AdminDataUnavailableView: ({ title }: Readonly<{ title?: string }>) => <div data-testid="unavailable-view">{title}</div>,
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
vi.mock("@/app/admin/products/[id]/stock-adjustment-panel", () => ({ StockAdjustmentPanel: () => null }));
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
  replacePortfolioMediaAction: vi.fn(),
  replaceProductMediaAction: vi.fn(),
  saveCustomShippingAddressAction: vi.fn(),
  saveEstimatedCustomPackageAction: vi.fn(),
  sendQuoteAction: vi.fn(),
  transitionInquiryAction: vi.fn(),
  transitionOrderAction: vi.fn(),
  updatePortfolioAction: vi.fn(),
  updateProductAction: vi.fn(),
  updateVariantAction: vi.fn(),
}));

import AdminCustomPrintDetailPage from "@/app/admin/custom-print/[id]/page";
import AdminInquiryDetailPage from "@/app/admin/inquiries/[id]/page";
import AdminOrderDetailPage from "@/app/admin/orders/[id]/page";
import AdminPortfolioDetailPage from "@/app/admin/portfolio/[id]/page";
import AdminProductDetailPage from "@/app/admin/products/[id]/page";
import AdminStockHistoryPage from "@/app/admin/products/[id]/stock/[variantId]/page";

const VALID_ID = "a6f443d8-3e8a-49b5-81d0-94d56e06c208";
const VALID_VARIANT_ID = "0b7a1f3e-5c2d-4e6f-8a9b-1c2d3e4f5a6b";

const adminAccess = {
  authUserId: "user_admin",
  profile: { authUserId: "user_admin", id: VALID_ID, isActive: true, role: "ADMIN" },
} as unknown as AdminAccess;

type PageCase = Readonly<{
  name: string;
  page: (props: never) => Promise<ReactNode>;
  read: () => ReturnType<typeof vi.fn>;
  props: (ids: Readonly<{ id: string; variantId?: string }>) => unknown;
  validIds: Readonly<{ id: string; variantId?: string }>;
  invalidIds: ReadonlyArray<Readonly<{ id: string; variantId?: string }>>;
}>;

const simpleProps = ({ id }: Readonly<{ id: string }>) => ({ params: Promise.resolve({ id }) });

const INVALID_IDS = ["not-a-uuid", "123", "", "../admin", `${VALID_ID}0`, VALID_ID.toUpperCase().replace(/[0-9A-F]$/, "G")];
const simpleInvalid = INVALID_IDS.map((id) => ({ id }));

const cases: readonly PageCase[] = [
  { name: "orders/[id]", page: AdminOrderDetailPage, read: () => mocks.service.getOrder, props: simpleProps, validIds: { id: VALID_ID }, invalidIds: simpleInvalid },
  { name: "inquiries/[id]", page: AdminInquiryDetailPage, read: () => mocks.service.getInquiry, props: simpleProps, validIds: { id: VALID_ID }, invalidIds: simpleInvalid },
  { name: "custom-print/[id]", page: AdminCustomPrintDetailPage, read: () => mocks.service.getCustomPrintRequest, props: simpleProps, validIds: { id: VALID_ID }, invalidIds: simpleInvalid },
  { name: "portfolio/[id]", page: AdminPortfolioDetailPage, read: () => mocks.service.getPortfolio, props: simpleProps, validIds: { id: VALID_ID }, invalidIds: simpleInvalid },
  { name: "products/[id]", page: AdminProductDetailPage, read: () => mocks.service.getProduct, props: simpleProps, validIds: { id: VALID_ID }, invalidIds: simpleInvalid },
  {
    name: "products/[id]/stock/[variantId]",
    page: AdminStockHistoryPage,
    read: () => mocks.service.getStockHistory,
    props: ({ id, variantId }) => ({ params: Promise.resolve({ id, variantId }), searchParams: Promise.resolve({}) }),
    validIds: { id: VALID_ID, variantId: VALID_VARIANT_ID },
    invalidIds: [
      ...INVALID_IDS.map((id) => ({ id, variantId: VALID_VARIANT_ID })),
      ...INVALID_IDS.map((variantId) => ({ id: VALID_ID, variantId })),
    ],
  },
];

function everyReadMock(): ReadonlyArray<ReturnType<typeof vi.fn>> {
  return [...Object.values(mocks.service), mocks.estimateLatest, mocks.listQuotes];
}

async function run(testCase: PageCase, ids: Readonly<{ id: string; variantId?: string }>) {
  try {
    const element = await testCase.page(testCase.props(ids) as never);
    render(<>{element}</>);
    return { outcome: "rendered" as const };
  } catch (error) {
    if (error instanceof mocks.NotFoundSentinel) return { outcome: "not-found" as const };
    throw error;
  }
}

beforeEach(() => {
  mocks.connection.mockResolvedValue(undefined);
  mocks.loadAdminPageAccess.mockResolvedValue({ kind: "granted", access: adminAccess });
  mocks.notFound.mockImplementation(() => {
    throw new mocks.NotFoundSentinel(NOT_FOUND_MESSAGE);
  });
  for (const read of everyReadMock()) read.mockResolvedValue(null);
  mocks.service.listPricingRules.mockResolvedValue([]);
  mocks.service.getActivePricingRule.mockResolvedValue(null);
  mocks.listQuotes.mockResolvedValue([]);
});

describe("order payment hold presentation", () => {
  const order = {
    address: null, cancelledAt: null, completedAt: null,
    createdAt: new Date("2026-10-06T00:00:00.000Z"), customerEmail: "fixture@example.test",
    customerName: "Fixture", customerPhone: "+628000000000", grandTotalRp: "10000",
    id: VALID_ID, items: [], itemsSubtotalRp: "10000", orderNumber: "ORD-HELD-TEST",
    orderType: "RETAIL", paidAt: new Date("2026-10-06T00:00:00.000Z"),
    paymentAttempts: [], paymentIssues: [], reservations: [], shipments: [], shipmentRates: [],
    shippingTotalRp: "0", status: "PAID", updatedAt: new Date("2026-10-06T00:00:00.000Z"),
  };

  it("explains the payment hold and removes fulfillment controls", async () => {
    mocks.service.getOrder.mockResolvedValue({ ...order, paymentIssues: [{
      kind: "FULL_REFUND", occurredAt: order.updatedAt,
      paymentAttemptId: "attempt-1", providerOrderId: "PAY-REFUNDED-TEST", purpose: "ORDER_TOTAL",
    }] });
    render(await AdminOrderDetailPage({ params: Promise.resolve({ id: VALID_ID }) }));
    expect(screen.getByRole("heading", { name: "Pembayaran perlu diperiksa" })).toBeInTheDocument();
    expect(screen.getByText("PAY-REFUNDED-TEST")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ubah ke / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siapkan pembayaran shipping" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terbitkan tautan baru" })).toBeInTheDocument();
  });

  it("keeps fulfillment controls for an order without payment issues", async () => {
    mocks.service.getOrder.mockResolvedValue(order);
    render(await AdminOrderDetailPage({ params: Promise.resolve({ id: VALID_ID }) }));
    expect(screen.queryByRole("heading", { name: "Pembayaran perlu diperiksa" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Ubah ke / }).length).toBeGreaterThan(0);
  });
});

describe.each(cases)("admin detail page $name", (testCase) => {
  it("calls notFound() and not the unavailable view when the service returns null", async () => {
    testCase.read().mockResolvedValue(null);

    const result = await run(testCase, testCase.validIds);

    expect(result.outcome).toBe("not-found");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
    expect(testCase.read()).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("unavailable-view")).not.toBeInTheDocument();
  });

  it("calls notFound() when the service throws AppError NOT_FOUND", async () => {
    testCase.read().mockRejectedValue(new AppError("NOT_FOUND"));

    const result = await run(testCase, testCase.validIds);

    expect(result.outcome).toBe("not-found");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("unavailable-view")).not.toBeInTheDocument();
  });

  it.each([
    ["a plain Error", () => new Error(SECRET_DETAIL)],
    ["an AppError INTERNAL_ERROR", () => new AppError("INTERNAL_ERROR", { message: SECRET_DETAIL })],
    ["a non-Error value", () => SECRET_DETAIL],
  ])("renders the unavailable view without notFound() or record data when the service throws %s", async (_label, makeError) => {
    testCase.read().mockRejectedValue(makeError());

    const result = await run(testCase, testCase.validIds);

    expect(result.outcome).toBe("rendered");
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(screen.getByTestId("unavailable-view")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
    expect(screen.queryByTestId("access-view")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(SECRET_DETAIL);
  });

  it("calls notFound() with no data read for every non-UUID id", async () => {
    for (const ids of testCase.invalidIds) {
      vi.clearAllMocks();
      mocks.notFound.mockImplementation(() => {
        throw new mocks.NotFoundSentinel(NOT_FOUND_MESSAGE);
      });
      mocks.connection.mockResolvedValue(undefined);
      mocks.loadAdminPageAccess.mockResolvedValue({ kind: "granted", access: adminAccess });

      const result = await run(testCase, ids);

      expect(result.outcome, JSON.stringify(ids)).toBe("not-found");
      expect(mocks.notFound, JSON.stringify(ids)).toHaveBeenCalledTimes(1);
      for (const read of everyReadMock()) expect(read, JSON.stringify(ids)).not.toHaveBeenCalled();
      expect(screen.queryByTestId("unavailable-view")).not.toBeInTheDocument();
    }
  });

  it.each(ADMIN_ACCESS_STATES)("renders AdminAccessView for %s without reading data, notFound() or the unavailable view", async (state) => {
    mocks.loadAdminPageAccess.mockResolvedValue({ kind: "denied", state });

    // A non-UUID id proves the access gate runs before UUID validation.
    const result = await run(testCase, testCase.invalidIds[0]);

    expect(result.outcome).toBe("rendered");
    expect(screen.getByTestId("access-view")).toHaveAttribute("data-state", state);
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(screen.queryByTestId("unavailable-view")).not.toBeInTheDocument();
    for (const read of everyReadMock()) expect(read).not.toHaveBeenCalled();
  });

  it("does not read data after a denied access with a valid id", async () => {
    mocks.loadAdminPageAccess.mockResolvedValue({ kind: "denied", state: "FORBIDDEN" });

    const result = await run(testCase, testCase.validIds);

    expect(result.outcome).toBe("rendered");
    expect(screen.getByTestId("access-view")).toHaveAttribute("data-state", "FORBIDDEN");
    expect(mocks.notFound).not.toHaveBeenCalled();
    for (const read of everyReadMock()) expect(read).not.toHaveBeenCalled();
  });
});
