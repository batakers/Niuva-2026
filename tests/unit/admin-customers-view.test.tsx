import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/app/admin/admin-page-access", () => ({ loadAdminPageAccess: async () => ({ kind: "granted", access: { authUserId: "test", profile: { id: "test", role: "ADMIN", isActive: true } } }) }));
vi.mock("@/components/niuva/admin-shell", () => ({ AdminShell: ({ children }: { children: ReactNode }) => children, AdminDataUnavailableView: () => <p>Data tidak tersedia</p>, AdminPagination: () => null }));
vi.mock("@/modules/customers/service", () => ({ CustomerDirectoryService: class { list = mocks.list; detail = mocks.detail; } }));
vi.mock("@/app/admin/admin-page-failure", async () => {
  const { loadAdminRecord } = await import("@/app/admin/admin-record-loader");
  return { loadAdminRecordLogged: (_boundary: string, read: () => Promise<unknown>) => loadAdminRecord(read) };
});
import Directory from "@/app/admin/customers/page";
import Detail from "@/app/admin/customers/[id]/page";
const id = "1143aeb6-e56c-451e-bd31-45a4276f8073";
beforeEach(() => {
  mocks.list.mockResolvedValue({ items: [{ id, displayName: "Fixture", email: "fixture@example.test", orderCount: 1, customPrintCount: 0, inquiryCount: 0 }], filteredTotal: 1, hasNext: false });
});
describe("Customer directory views", () => {
  it("links the profile with validated list context", async () => {
    render(await Directory({ searchParams: Promise.resolve({ q: "Fixture", page: "2" }) }));
    expect(screen.getByRole("link", { name: "Fixture" })).toHaveAttribute("href", `/admin/customers/${id}?returnTo=%2Fadmin%2Fcustomers%3Fq%3DFixture%26page%3D2`);
    expect(screen.queryByRole("button", { name: /Tambah customer/ })).not.toBeInTheDocument();
  });
  it("separates unavailable data from an empty directory", async () => {
    mocks.list.mockRejectedValue(new Error("offline"));
    render(await Directory({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Data tidak tersedia")).toBeVisible();
    expect(screen.queryByText("Belum ada akun customer.")).not.toBeInTheDocument();
  });
  it("shows a customer history link with a bounded profile return target", async () => {
    const empty = { items: [], filteredTotal: 0, hasNext: false };
    mocks.detail.mockResolvedValue({ customer: { id, displayName: "Fixture", email: "fixture@example.test", orderCount: 1, customPrintCount: 0, inquiryCount: 0, createdAt: new Date() }, orders: { items: [{ id: "order", reference: "ORD-TEST", status: "PAID", createdAt: new Date(), href: "/admin/orders/order" }], filteredTotal: 1, hasNext: false }, customPrint: empty, inquiries: empty });
    render(await Detail({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "ORD-TEST" })).toHaveAttribute("href", `/admin/orders/order?returnTo=${encodeURIComponent(`/admin/customers/${id}?tab=orders&page=1`)}`);
  });
});
