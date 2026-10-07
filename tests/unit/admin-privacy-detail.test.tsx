import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ gate: vi.fn(), read: vi.fn(), available: true }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, unstable_rethrow: () => undefined }));
vi.mock("@/app/admin/admin-page-access", () => ({ loadAdminPageAccess: mocks.gate }));
vi.mock("@/app/admin/admin-access-view", () => ({ AdminAccessView: () => <p>Denied</p> }));
vi.mock("@/modules/customer-privacy/service", () => ({ CustomerPrivacyService: class { getOwnerDetail = mocks.read; } }));
vi.mock("@/modules/customer-privacy/core", () => ({ isCustomerPrivacyAvailable: () => mocks.available, privacyKindLabels: { CORRECTION: "Koreksi data" }, privacyStatusLabels: { OPEN: "Diterima", IN_REVIEW: "Sedang ditangani", RESOLVED: "Selesai" } }));
vi.mock("@/modules/customer-privacy/handler", () => ({ PRIVACY_ERROR_MESSAGES: {} }));
vi.mock("@/components/niuva/admin-shell", () => ({ AdminShell: ({ children }: { children: ReactNode }) => <>{children}</>, AdminDataUnavailableView: () => <p>Unavailable</p> }));
vi.mock("@/components/niuva/privacy-form", () => ({ PrivacyForm: ({ hidden }: { hidden: Record<string, string> }) => <form aria-label="Penanganan">{Object.entries(hidden).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}</form> }));
import PrivacyDetail from "@/app/admin/privacy/[id]/page";
const id = "7614b2eb-6e0c-4a27-9162-e94fb377ebd4";
const record = { id, referenceNumber: "PRV-FIXTURE", kind: "CORRECTION", status: "OPEN", createdAt: new Date("2026-01-01"), dueAt: new Date("2026-01-04"), customerId: null, contactEmail: "fixture@example.test", details: "Synthetic request", correction: null, response: null, outcome: null, resolvedAt: null, contentPurgedAt: null, holdCategory: null, holdReason: null, holdReviewAt: null };
beforeEach(() => { vi.clearAllMocks(); mocks.available = true; mocks.gate.mockResolvedValue({ kind: "granted", access: { authUserId: "owner", profile: { id, role: "OWNER", isActive: true } } }); mocks.read.mockResolvedValue(record); });
describe("Owner privacy detail", () => {
  it("uses the Owner gate before any record read", async () => {
    mocks.gate.mockResolvedValue({ kind: "denied", state: "FORBIDDEN" });
    render(await PrivacyDetail({ params: Promise.resolve({ id }) }));
    expect(mocks.gate).toHaveBeenCalledWith({ permission: "PRIVACY_REQUEST_MANAGE" });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("holds reads when unavailable and rejects malformed UUID", async () => {
    mocks.available = false; render(await PrivacyDetail({ params: Promise.resolve({ id }) }));
    expect(mocks.read).not.toHaveBeenCalled();
    await expect(PrivacyDetail({ params: Promise.resolve({ id: "bad" }) })).rejects.toThrow("NOT_FOUND");
  });
  it("keeps filtered context, closed-account markers and the original overdue deadline", async () => {
    render(await PrivacyDetail({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ returnTo: "/admin/privacy?status=OPEN&page=2" }) }));
    expect(screen.getByRole("link", { name: "Kembali ke Privasi Customer" })).toHaveAttribute("href", "/admin/privacy?status=OPEN&page=2");
    expect(screen.getByText(/Tenggat terlewati/)).toBeInTheDocument();
    expect(screen.getByText("Ditutup atau retensi akun selesai")).toBeInTheDocument();
    expect(document.querySelector('input[name="responseView"]')).toHaveAttribute("value", "detail");
  });
  it("shows only the surviving receipt when content has been purged", async () => {
    mocks.read.mockResolvedValue({ ...record, details: null, correction: null, contactEmail: null, contentPurgedAt: new Date() });
    render(await PrivacyDetail({ params: Promise.resolve({ id }) }));
    expect(screen.getByText(/Isi telah dibersihkan/)).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Penanganan" })).not.toBeInTheDocument();
  });
  it("uses not-found for an absent record", async () => {
    mocks.read.mockResolvedValue(null);
    await expect(PrivacyDetail({ params: Promise.resolve({ id }) })).rejects.toThrow("NOT_FOUND");
  });
});
