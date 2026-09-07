import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminOrdersList } from "@/features/admin/orders-list";

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("admin order list preview", () => {
  it("filters synthetic orders by type, exception, and reference without loading a server record", () => {
    render(<AdminOrdersList initialScenario="populated" initialSelectedReference={null} />);

    expect(screen.getByText("5 order ditampilkan")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Custom print" }));
    expect(screen.getByText("2 order ditampilkan")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Hanya exception" }));
    expect(screen.getByText("1 order ditampilkan")).toBeVisible();
    expect(screen.getAllByText("ORD-EX-4351")[0]).toBeVisible();

    fireEvent.change(screen.getByLabelText("Cari nomor order"), { target: { value: "404" } });
    expect(screen.getByText("Filter tidak menemukan order")).toBeVisible();
  });

  it("stores only a selected fixture reference in the preview URL", () => {
    render(<AdminOrdersList initialScenario="populated" initialSelectedReference={null} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Pilih ORD-EX-4072" })[0]);

    expect(screen.getByText("Order preview dipilih: ORD-EX-4072")).toBeVisible();
    expect(window.location.search).toContain("module=orders");
    expect(window.location.search).toContain("order=ORD-EX-4072");
  });
});
