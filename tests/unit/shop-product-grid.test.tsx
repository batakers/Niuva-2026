import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGrid } from "@/app/shop/product-grid";
import { exampleShopProducts } from "@/features/frontend-preview/fixtures";

describe("shop product grid", () => {
  it("shows serialized prices and distinct availability states", () => {
    render(<ProductGrid products={exampleShopProducts} />);

    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getAllByText("Tersedia")).toHaveLength(3);
    expect(screen.getByText("Stok habis")).toBeInTheDocument();
    expect(screen.getByText(/185\.000/)).toBeInTheDocument();
    expect(screen.queryByText("EX-DOCK-BLUE")).not.toBeInTheDocument();
  });

  it("filters by category and recovers from no results", () => {
    render(<ProductGrid products={exampleShopProducts} />);

    fireEvent.click(screen.getByRole("button", { name: "Workspace" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.change(screen.getByRole("searchbox", { name: "Cari produk" }), { target: { value: "tidak ada" } });
    expect(screen.getByRole("heading", { name: "Tidak ada produk yang cocok." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus filter" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("links each preview card to its product detail", () => {
    render(<ProductGrid products={exampleShopProducts} previewEnabled />);

    expect(screen.getByRole("link", { name: /Dock modular meja/ })).toHaveAttribute(
      "href",
      "/shop/contoh-dock-modular-meja?preview=examples",
    );
  });
});
