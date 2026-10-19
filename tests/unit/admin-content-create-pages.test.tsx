import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  gate: { kind: "allowed", access: { authUserId: "fixture", profile: { id: "123", authUserId: "fixture", role: "ADMIN", isActive: true } } },
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/app/admin/admin-page-access", () => ({ loadAdminPageAccess: async () => fixtures.gate }));
vi.mock("@/components/niuva/admin-shell", () => ({ AdminShell: ({ children }: { children: React.ReactNode }) => <>{children}</>, AdminDataUnavailableView: () => <p>Dapatkan data kembali</p> }));
vi.mock("@/app/admin/content-create-actions", () => ({
  createProductDraftAction: async () => ({ status: "success" }),
  createPortfolioDraftAction: async () => ({ status: "success" }),
  createVariantAction: async () => ({ status: "success" }),
}));
vi.mock("@/modules/catalog/service", () => ({ CatalogService: class { async listCategories() { return [{ id: "category-fixture", name: "Aksesori" }]; } } }));

import NewProductPage from "@/app/admin/products/new/page";
import NewPortfolioPage from "@/app/admin/portfolio/new/page";

describe("Admin content creation pages", () => {
  it("lets an Admin create a product draft using category names instead of UUID entry", async () => {
    render(await NewProductPage());
    expect(screen.getByRole("heading", { level: 1, name: "Tambah produk" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama produk/)).toHaveAttribute("required");
    expect(screen.getByRole("combobox", { name: /Kategori/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Aksesori" })).toHaveValue("category-fixture");
    expect(screen.getByRole("button", { name: "Simpan draft produk" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /publikasikan/i })).not.toBeInTheDocument();
  });
  it("creates a portfolio draft without requesting an invented client or project outcome", async () => {
    render(await NewPortfolioPage());
    expect(screen.getByRole("heading", { level: 1, name: "Tambah project" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Layanan/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan draft project" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/hasil project/i)).not.toBeInTheDocument();
  });
});
