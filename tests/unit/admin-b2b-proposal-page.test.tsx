import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ gate: vi.fn(), read: vi.fn(), quotes: vi.fn() }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/app/admin/admin-page-access", () => ({ loadAdminPageAccess: mocks.gate }));
vi.mock("@/app/admin/admin-access-view", () => ({ AdminAccessView: () => <p>Accès refusé</p> }));
vi.mock("@/modules/admin/operations", () => ({ AdminOperationsService: class { getInquiry = mocks.read; } }));
vi.mock("@/modules/inquiry/b2b-quote", () => ({ B2BQuoteService: class { listForAdmin = mocks.quotes; } }));
vi.mock("@/app/admin/actions", () => ({ sendB2BQuoteAction: vi.fn() }));
vi.mock("@/app/admin/admin-action-form", () => ({ AdminActionForm: ({ children, submitLabel }: { children: ReactNode; submitLabel: string }) => <form>{children}<button>{submitLabel}</button></form> }));
vi.mock("@/components/niuva/admin-shell", () => ({ AdminShell: ({ children }: { children: ReactNode }) => <>{children}</>, AdminDataUnavailableView: () => <p>Unavailable</p> }));
import ProposalPage from "@/app/admin/inquiries/[id]/proposal/page";

const id = "bf1d8f5f-15ef-472b-8a70-0b89d1116d76";
const access = { authUserId: "owner", profile: { id, role: "OWNER", isActive: true, authUserId: "owner" } };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.gate.mockResolvedValue({ kind: "granted", access });
  mocks.read.mockResolvedValue({ id, customerId: id, referenceNumber: "INQ-TEST", status: "QUALIFIED", projectGoal: "Prototype", description: "Project brief" });
  mocks.quotes.mockResolvedValue([]);
});
describe("B2B proposal workspace", () => {
  it("gates before reading records", async () => {
    mocks.gate.mockResolvedValue({ kind: "denied", state: "UNAUTHENTICATED" });
    render(await ProposalPage({ params: Promise.resolve({ id }) }));
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.quotes).not.toHaveBeenCalled();
  });
  it("returns to the detail while keeping the original filtered list", async () => {
    render(await ProposalPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ returnTo: "/admin/inquiries?status=QUALIFIED&page=3" }) }));
    const href = screen.getByRole("link", { name: "Kembali ke detail inquiry" }).getAttribute("href");
    expect(new URL(href!, "https://niuva.test").searchParams.get("returnTo")).toBe("/admin/inquiries?status=QUALIFIED&page=3");
    expect(screen.getByRole("button", { name: "Kirim versi proposal" })).toBeInTheDocument();
  });
  it.each([{ status: "WON", customerId: id }, { status: "QUALIFIED", customerId: null }])("holds publishing for terminal or unowned inquiry", async (state) => {
    mocks.read.mockResolvedValue({ id, referenceNumber: "INQ-TEST", ...state });
    render(await ProposalPage({ params: Promise.resolve({ id }) }));
    expect(screen.queryByRole("button", { name: "Kirim versi proposal" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
