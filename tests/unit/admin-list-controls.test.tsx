import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminListControls } from "@/app/admin/admin-list-controls";

describe("Admin list controls", () => {
  it("submits GET filters from page one and exposes an internal reset", () => {
    render(<AdminListControls area="orders" query={{ page: 3, q: "ORD-1", status: "PAID", type: "RETAIL" }} />);
    expect(screen.getByRole("search")).toHaveAttribute("method", "get");
    expect(screen.getByRole("search")).toHaveAttribute("action", "/admin/orders");
    expect(screen.getByLabelText("Cari nomor order")).toHaveValue("ORD-1");
    expect(screen.getByLabelText("Status")).toHaveValue("PAID");
    expect(screen.getByLabelText("Jenis order")).toHaveValue("RETAIL");
    expect(document.querySelector('input[name="page"]')).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset filter" })).toHaveAttribute("href", "/admin/orders");
  });
});
