import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
const id = "7614b2eb-6e0c-4a27-9162-e94fb377ebd4";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/app/admin/admin-page-access", () => ({ loadAdminPageAccess: async () => ({ kind: "granted", access: { authUserId: "fixture", profile: { id: "7614b2eb-6e0c-4a27-9162-e94fb377ebd4", role: "OWNER", isActive: true } } }) }));
vi.mock("@/modules/admin/operations", () => ({ AdminOperationsService: class { getProduct = mocks.read; getPortfolio = mocks.read; } }));
vi.mock("@/app/admin/actions", () => ({ adjustStockAction: vi.fn(), replaceProductMediaAction: vi.fn(), updateProductAction: vi.fn(), updateVariantAction: vi.fn(), replacePortfolioMediaAction: vi.fn(), updatePortfolioAction: vi.fn() }));
vi.mock("@/app/admin/admin-action-form", () => ({ AdminActionForm: ({ children }: { children: ReactNode }) => <form>{children}</form> }));
vi.mock("@/components/niuva/admin-shell", () => ({ AdminShell: ({ children }: { children: ReactNode }) => <>{children}</>, AdminDataUnavailableView: () => <p>Unavailable</p> }));
import ProductPage from "@/app/admin/products/[id]/page";
import PortfolioPage from "@/app/admin/portfolio/[id]/page";
import { StockAdjustmentPanel } from "@/app/admin/products/[id]/stock-adjustment-panel";

describe("Admin management return context", () => {
  it("returns from product editor to the filtered product list", async () => {
    mocks.read.mockResolvedValue({ id, name: "Synthetic product", slug: "synthetic", description: "Fixture", isPublished: false, category: null, media: [], variants: [] });
    render(await ProductPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ returnTo: "/admin/products?publication=draft&page=3" }) }));
    expect(screen.getByRole("link", { name: "Kembali ke Products & Stock" })).toHaveAttribute("href", "/admin/products?publication=draft&page=3");
  });
  it("carries the same root origin to variant history", () => {
    render(<StockAdjustmentPanel productId={id} variantId={id} stockOnHand={2} returnTo="/admin/products?publication=draft&page=3" />);
    const link = screen.getByRole("link", { name: "Lihat riwayat stok varian" });
    expect(new URL(link.getAttribute("href")!, "https://niuva.test").searchParams.get("returnTo")).toBe("/admin/products?publication=draft&page=3");
  });
  it("returns from portfolio editor to its search context", async () => {
    mocks.read.mockResolvedValue({ id, title: "Synthetic portfolio", slug: "synthetic", summary: "Fixture", challenge: "Fixture", process: "Fixture", result: "Fixture", serviceLabel: "Fixture", isPublished: false, isFeatured: false, media: [], publishedAt: null });
    render(await PortfolioPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ returnTo: "/admin/portfolio?q=synthetic&page=2" }) }));
    expect(screen.getByRole("link", { name: "Kembali ke Portfolio" })).toHaveAttribute("href", "/admin/portfolio?q=synthetic&page=2");
  });
});
