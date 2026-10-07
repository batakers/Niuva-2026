// Feature: system-pages-and-error-states, Property 10
// Property 10: Access, then UUID, then data (admin detail pages).
// Validates: Requirements 7.7, 8.7, 8.9
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccessState, AdminPageAccessResult } from "@/app/admin/admin-page-access";
import type { AdminAccess } from "@/lib/auth/admin";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import AdminOrderDetailPage from "@/app/admin/orders/[id]/page";
import AdminInquiryDetailPage from "@/app/admin/inquiries/[id]/page";
import AdminCustomPrintDetailPage from "@/app/admin/custom-print/[id]/page";
import AdminCustomPrintReviewPage from "@/app/admin/custom-print/[id]/review/page";
import AdminB2BProposalPage from "@/app/admin/inquiries/[id]/proposal/page";
import AdminPortfolioDetailPage from "@/app/admin/portfolio/[id]/page";
import AdminProductDetailPage from "@/app/admin/products/[id]/page";
import AdminStockHistoryPage from "@/app/admin/products/[id]/stock/[variantId]/page";

import { createRng, DEFAULT_SEED, nonUuidCorpus } from "../helpers/corpus";

const h = vi.hoisted(() => {
  const NOT_FOUND = new Error("NEXT_NOT_FOUND_SENTINEL");
  const reads = {
    getOrder: vi.fn(async (): Promise<null> => null),
    getInquiry: vi.fn(async (): Promise<null> => null),
    getCustomPrintRequest: vi.fn(async (): Promise<null> => null),
    getPortfolio: vi.fn(async (): Promise<null> => null),
    getProduct: vi.fn(async (): Promise<null> => null),
    getStockHistory: vi.fn(async (): Promise<null> => null),
    listPricingRules: vi.fn(async (): Promise<null> => null),
    getActivePricingRule: vi.fn(async (): Promise<null> => null),
    latestForAdmin: vi.fn(async (): Promise<null> => null),
    listForAdmin: vi.fn(async (): Promise<never[]> => []),
  };
  return {
    NOT_FOUND,
    reads,
    gate: vi.fn(),
    notFound: vi.fn(() => {
      throw NOT_FOUND;
    }),
    connection: vi.fn(async () => undefined),
    loader: vi.fn(),
    services: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  notFound: h.notFound,
  unstable_rethrow: (error: unknown) => {
    throw error;
  },
}));
vi.mock("next/server", () => ({ connection: h.connection }));
vi.mock("next/link", () => ({ default: () => null }));

vi.mock("@/app/admin/admin-page-access", () => ({
  ADMIN_ACCESS_STATES: ["UNAUTHENTICATED", "FORBIDDEN", "AUTH_UNAVAILABLE"],
  loadAdminPageAccess: h.gate,
}));
vi.mock("@/app/admin/admin-access-view", () => ({ AdminAccessView: () => null }));
vi.mock("@/app/admin/admin-record-loader", () => ({
  loadAdminRecord: h.loader.mockImplementation(async (read: () => Promise<unknown>) => {
    const record = await read();
    return record === null ? { status: "not-found" } : { status: "found", record };
  }),
}));
vi.mock("@/modules/admin/operations", () => ({
  parseAdminPage: () => 1,
  AdminOperationsService: class {
    constructor() {
      h.services();
    }
    getOrder = h.reads.getOrder;
    getInquiry = h.reads.getInquiry;
    getCustomPrintRequest = h.reads.getCustomPrintRequest;
    getPortfolio = h.reads.getPortfolio;
    getProduct = h.reads.getProduct;
    getStockHistory = h.reads.getStockHistory;
    listPricingRules = h.reads.listPricingRules;
    getActivePricingRule = h.reads.getActivePricingRule;
  },
}));

// Heavy collaborators that the gate-order property does not exercise.
vi.mock("@/modules/custom-print/estimate", () => ({
  CustomPrintEstimateService: class {
    latestForAdmin = h.reads.latestForAdmin;
  },
  isEstimateCurrent: () => false,
}));
vi.mock("@/modules/custom-print/customer-preview", () => ({ readCustomerPreviewSnapshot: () => null }));
vi.mock("@/modules/inquiry/b2b-quote", () => ({
  B2BQuoteService: class {
    listForAdmin = h.reads.listForAdmin;
  },
}));
vi.mock("@/modules/inquiry/transitions", () => ({ INQUIRY_TRANSITIONS: {} }));
vi.mock("@/modules/order/transitions", () => ({
  CUSTOM_ORDER_TRANSITIONS: {},
  RETAIL_ORDER_TRANSITIONS: {},
  requiresVerifiedPaymentSettlement: () => false,
}));
vi.mock("@/modules/portfolio/public-content", () => ({ isApprovedCardOnlyPortfolioProject: () => false }));
vi.mock("@/app/admin/admin-action-form", () => ({ AdminActionForm: () => null }));
vi.mock("@/components/niuva/admin-shell", () => ({
  AdminDataUnavailableView: () => null,
  AdminPagination: () => null,
  AdminShell: () => null,
}));
vi.mock("@/components/niuva/status-notice", () => ({ StatusNotice: () => null }));
vi.mock("@/app/admin/inquiries/[id]/b2b-quote-panel", () => ({ B2BQuoteAdminPanel: () => null }));
vi.mock("@/app/admin/products/[id]/stock-adjustment-panel", () => ({ StockAdjustmentPanel: () => null }));
vi.mock("@/app/admin/actions", () => {
  const action = () => undefined;
  return {
    createQuoteDraftAction: action,
    downloadPrivateFileAction: action,
    recordCustomPrintReviewAction: action,
    publishCustomPrintEstimateAction: action,
    saveEstimatedCustomPackageAction: action,
    reissueCustomPrintRequestTokenAction: action,
    reissueQuoteTokenAction: action,
    sendQuoteAction: action,
    sendB2BQuoteAction: action,
    createCustomShippingPaymentAction: action,
    recordShipmentMetadataAction: action,
    reissueOrderTokenAction: action,
    saveCustomShippingAddressAction: action,
    transitionOrderAction: action,
    transitionInquiryAction: action,
    replacePortfolioMediaAction: action,
    updatePortfolioAction: action,
    replaceProductMediaAction: action,
    updateProductAction: action,
    updateVariantAction: action,
  };
});

const DENIED_STATES: readonly AdminAccessState[] = ["UNAUTHENTICATED", "FORBIDDEN", "AUTH_UNAVAILABLE"];
const ACCESS = { profile: { role: "OWNER" } } as unknown as AdminAccess;
const GRANTED: AdminPageAccessResult = { kind: "granted", access: ACCESS };
const VALID_UUID = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";

type ReadName = keyof typeof h.reads;
type PageProps = Readonly<{ params: Promise<Record<string, string>>; searchParams: Promise<{ page?: string }> }>;
type PageUnderTest = Readonly<{
  name: string;
  page: (props: never) => Promise<unknown>;
  /** Route param names, in order; every one must be a UUID. */
  params: readonly string[];
  /** The service read the page performs after the UUID gate. */
  read: ReadName;
}>;

const PAGES: readonly PageUnderTest[] = [
  { name: "orders/[id]", page: AdminOrderDetailPage, params: ["id"], read: "getOrder" },
  { name: "inquiries/[id]", page: AdminInquiryDetailPage, params: ["id"], read: "getInquiry" },
  { name: "custom-print/[id]", page: AdminCustomPrintDetailPage, params: ["id"], read: "getCustomPrintRequest" },
  { name: "custom-print/[id]/review", page: AdminCustomPrintReviewPage, params: ["id"], read: "getCustomPrintRequest" },
  { name: "inquiries/[id]/proposal", page: AdminB2BProposalPage, params: ["id"], read: "getInquiry" },
  { name: "portfolio/[id]", page: AdminPortfolioDetailPage, params: ["id"], read: "getPortfolio" },
  { name: "products/[id]", page: AdminProductDetailPage, params: ["id"], read: "getProduct" },
  { name: "products/[id]/stock/[variantId]", page: AdminStockHistoryPage, params: ["id", "variantId"], read: "getStockHistory" },
];

function render(entry: PageUnderTest, params: Record<string, string>): Promise<unknown> {
  const props: PageProps = { params: Promise.resolve(params), searchParams: Promise.resolve({}) };
  return (entry.page as (props: PageProps) => Promise<unknown>)(props);
}

function uuidParams(entry: PageUnderTest, override: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(entry.params.map((name) => [name, override[name] ?? VALID_UUID]));
}

function totalReads(): number {
  return Object.values(h.reads).reduce((sum, read) => sum + read.mock.calls.length, 0);
}

function expectNoDataAccess(): void {
  expect(h.loader).not.toHaveBeenCalled();
  expect(h.services).not.toHaveBeenCalled();
  expect(totalReads()).toBe(0);
}

function generatedUuids(seed: number, count: number): string[] {
  const rng = createRng(seed);
  const hex = (length: number) => Array.from({ length }, () => "0123456789abcdef"[Math.floor(rng() * 16)]).join("");
  return Array.from({ length: count }, () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`);
}

beforeEach(() => {
  h.gate.mockReset();
  h.notFound.mockClear();
  h.connection.mockClear();
  h.loader.mockClear();
  h.services.mockClear();
  for (const read of Object.values(h.reads)) read.mockClear();
});

describe("Property 10: access, then UUID, then data", () => {
  it("covers admin details and the two Core Operations workspaces", () => {
    expect(PAGES).toHaveLength(8);
  });

  describe.each(PAGES)("$name", (entry) => {
    it.each(DENIED_STATES)("denied %s renders AdminAccessView and never validates ids or reads data", async (state) => {
      h.gate.mockResolvedValue({ kind: "denied", state } satisfies AdminPageAccessResult);

      // Both valid and invalid ids: the access gate must win in either case.
      for (const id of [VALID_UUID, "not-a-uuid"]) {
        const output = (await render(entry, uuidParams(entry, { id, variantId: id }))) as {
          type: unknown;
          props: { state: AdminAccessState };
        };
        expect(output.type).toBe(AdminAccessView);
        expect(output.props).toEqual({ state });
      }

      expect(h.notFound).not.toHaveBeenCalled();
      expectNoDataAccess();
    });

    it("calls notFound() and no loader/service for every seeded non-UUID id when access is granted", async () => {
      h.gate.mockResolvedValue(GRANTED);
      const corpus = nonUuidCorpus();
      expect(corpus.length).toBeGreaterThanOrEqual(100);

      for (const param of entry.params) {
        for (const [index, value] of corpus.entries()) {
          h.notFound.mockClear();
          h.loader.mockClear();
          h.services.mockClear();
          for (const read of Object.values(h.reads)) read.mockClear();

          // Only `param` is invalid; the other route params stay valid UUIDs.
          const label = `[corpus seed=${DEFAULT_SEED}] ${param} case #${index} ${JSON.stringify(value)}`;
          await expect(render(entry, uuidParams(entry, { [param]: value })), label).rejects.toBe(h.NOT_FOUND);
          expect(h.notFound, label).toHaveBeenCalledTimes(1);
          expectNoDataAccess();
        }
      }
    });

    it("reads the record exactly once for a valid UUID", async () => {
      h.gate.mockResolvedValue(GRANTED);
      for (const uuid of [VALID_UUID, ...generatedUuids(20261002, 10)]) {
        h.notFound.mockClear();
        h.loader.mockClear();
        h.services.mockClear();
        for (const read of Object.values(h.reads)) read.mockClear();

        // The mocked service resolves null, so the record is "not-found" after exactly one read.
        await expect(render(entry, uuidParams(entry, { id: uuid, variantId: uuid }))).rejects.toBe(h.NOT_FOUND);
        expect(h.loader, uuid).toHaveBeenCalledTimes(1);
        expect(h.reads[entry.read], uuid).toHaveBeenCalledTimes(1);
        expect(h.notFound, uuid).toHaveBeenCalledTimes(1);
      }
    });
  });
});
