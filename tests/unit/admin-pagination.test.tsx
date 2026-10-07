import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminPagination } from "@/components/niuva/admin-shell";

describe("Admin pagination", () => {
  it("preserves search and status for both directions", () => {
    render(<AdminPagination basePath="/admin/orders" page={3} hasNext query={{ q: "ORD-42", status: "PAID" }} />);
    expect(screen.getByRole("link", { name: "Sebelumnya" })).toHaveAttribute("href", "/admin/orders?q=ORD-42&status=PAID&page=2");
    expect(screen.getByRole("link", { name: "Berikutnya" })).toHaveAttribute("href", "/admin/orders?q=ORD-42&status=PAID&page=4");
  });
  it("keeps existing callers compatible", () => {
    render(<AdminPagination basePath="/admin/inquiries" page={1} hasNext />);
    expect(screen.queryByRole("link", { name: "Sebelumnya" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Berikutnya" })).toHaveAttribute("href", "/admin/inquiries?page=2");
  });
  it("keeps the root origin when paging through a variant stock history", () => {
    render(<AdminPagination basePath="/admin/products/product/stock/variant" page={1} hasNext query={{ returnTo: "/admin/products?publication=draft&page=2" }} />);
    const url = new URL(screen.getByRole("link", { name: "Berikutnya" }).getAttribute("href")!, "https://niuva.test");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("returnTo")).toBe("/admin/products?publication=draft&page=2");
  });
});
