import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/admin/actions", () => ({ createQuoteDraftAction: vi.fn(), recordCustomPrintReviewAction: vi.fn(), publishCustomPrintEstimateAction: vi.fn(), saveEstimatedCustomPackageAction: vi.fn(), reissueQuoteTokenAction: vi.fn(), sendQuoteAction: vi.fn() }));
vi.mock("@/app/admin/admin-action-form", () => ({ AdminActionForm: ({ children, submitLabel }: { children: ReactNode; submitLabel: string }) => <form>{children}<button>{submitLabel}</button></form> }));
vi.mock("@/modules/custom-print/estimate", () => ({ isEstimateCurrent: (snapshot: { current: boolean }) => snapshot.current }));
import { CustomPrintReviewWorkspace, parseReviewStep } from "@/app/admin/custom-print/[id]/review/review-workspace";
import type { CustomPrintPageData } from "@/app/admin/custom-print/[id]/custom-print-page-data";
const id = "aa8a2ac6-ec41-4a73-9151-34a239616e5f";
function fixture(patch: Record<string, unknown> = {}): CustomPrintPageData {
  return { request: { id, referenceNumber: "CP-TEST", status: "SUBMITTED", modelReady: true, intakeMode: "MODEL_READY", materialRequested: "PLA", quantity: 1, quotes: [], review: null, ...patch }, pricing: { items: [] }, activeRule: null, latestEstimate: null, linkedOrders: [] } as unknown as CustomPrintPageData;
}
describe("Custom Print workspace", () => {
  it("defaults unknown or array steps to review", () => {
    expect(parseReviewStep("quote")).toBe("quote");
    expect(parseReviewStep("estimate")).toBe("estimate");
    expect(parseReviewStep("unknown")).toBe("review");
    expect(parseReviewStep(["quote"])).toBe("review");
  });
  it("shows the review editor only for a verified model", () => {
    render(<CustomPrintReviewWorkspace data={fixture({ modelReady: false })} step="review" returnTo="/admin/queue?group=custom-print" />);
    expect(screen.getByText("Menunggu model 3D/CAD terverifikasi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simpan review slicer" })).not.toBeInTheDocument();
    expect(new URL(screen.getByRole("link", { name: "2. Estimasi" }).getAttribute("href")!, "https://niuva.test").searchParams.get("returnTo")).toBe("/admin/queue?group=custom-print");
  });
  it("holds quote drafting when pricing is unavailable", () => {
    const data = { ...fixture({ status: "QUOTE_READY" }), pricing: null };
    render(<CustomPrintReviewWorkspace data={data} step="quote" returnTo="/admin/custom-print" />);
    expect(screen.getByText("Pricing rules belum dapat dimuat")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buat draft quote" })).not.toBeInTheDocument();
  });
  it("keeps a stale draft visible and holds publication", () => {
    const data = fixture({ status: "QUOTE_READY", review: { updatedAt: new Date(), materialCode: "PLA" }, quotes: [{ id, quoteNumber: "Q-1", version: 1, status: "DRAFT", finalTotalRp: "100000", createdAt: new Date(), expiresAt: null }] });
    render(<CustomPrintReviewWorkspace data={data} step="quote" returnTo="/admin/custom-print" />);
    expect(screen.getByText("Q-1 · v1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Terbitkan quote" })).not.toBeInTheDocument();
  });
});
