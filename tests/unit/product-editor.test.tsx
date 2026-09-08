import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminProductEditor } from "@/features/admin/product-editor";
import {
  createInitialProductEditorValues,
  getProductEditorFixture,
  validateProductEditor,
} from "@/features/admin/product-editor-data";

describe("admin product editor preview", () => {
  it("uses catalog-compatible local validation for slug, Decimal strings, stock, and its adjustment reason", () => {
    const fixture = getProductEditorFixture("STK-EX-6024");

    if (fixture === null) throw new Error("Expected product-editor fixture.");

    const invalid = {
      ...createInitialProductEditorValues(fixture),
      priceRp: "95000.5",
      slug: "Dudukan Display",
      stockOnHand: "-1",
      weightGrams: "abc",
    };

    expect(validateProductEditor(invalid, fixture.values.stockOnHand)).toMatchObject({
      priceRp: expect.any(String),
      slug: expect.any(String),
      stockOnHand: expect.any(String),
      weightGrams: expect.any(String),
    });

    const stockWithoutReason = {
      ...createInitialProductEditorValues(fixture),
      stockOnHand: "3",
    };

    expect(validateProductEditor(stockWithoutReason, fixture.values.stockOnHand)).toMatchObject({
      stockReason: "Pilih alasan saat jumlah stok berubah.",
    });
  });

  it("marks local changes, blocks a stock edit without a reason, then saves only browser fixture state", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<AdminProductEditor initialScenario="ready" initialSelectedSku="STK-EX-6024" />);

    const stock = await screen.findByLabelText(/^Stok fisik/);
    fireEvent.change(stock, { target: { value: "3" } });

    expect(screen.getByText("Perubahan belum disimpan")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan preview" }));
    expect(screen.getByText("Pilih alasan saat jumlah stok berubah.")).toBeVisible();

    fireEvent.change(screen.getByLabelText(/^Alasan penyesuaian stok/), {
      target: { value: "physical-count" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan preview" }));

    expect(screen.getByText("Perubahan preview tersimpan secara lokal")).toBeVisible();
    expect(screen.queryByText("Perubahan belum disimpan")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("exposes a conflict recovery without claiming that a server record was overwritten", async () => {
    render(<AdminProductEditor initialScenario="conflict" initialSelectedSku="STK-EX-6024" />);

    expect(await screen.findByText("Perubahan preview berbenturan")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang fixture" }));

    expect(screen.getByRole("heading", { name: "Identitas produk" })).toBeVisible();
    expect(screen.getByLabelText(/^Nama produk/)).toHaveValue("Dudukan display");
  });
});
