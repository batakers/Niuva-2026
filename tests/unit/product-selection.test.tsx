import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductSelection } from "@/app/shop/[slug]/product-selection";
import { exampleShopProducts } from "@/features/frontend-preview/fixtures";

describe("product selection preview", () => {
  it("requires an available variant before preparing a cart intent", () => {
    render(<ProductSelection product={exampleShopProducts[0]} />);

    const prepare = screen.getByRole("button", { name: "Tambah ke cart (preview)" });
    expect(prepare).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Hitam/ })).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(screen.getByRole("radio", { name: /Abu-abu/ }));
    expect(prepare).toBeEnabled();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/195\.000/);
  });

  it("updates quantity within the selected preview stock", () => {
    render(<ProductSelection product={exampleShopProducts[0]} />);
    fireEvent.click(screen.getByRole("radio", { name: /Biru/ }));
    const quantity = screen.getByRole("spinbutton", { name: "Jumlah" });

    fireEvent.click(screen.getByRole("button", { name: "Tambah jumlah" }));
    expect(quantity).toHaveValue(2);
    fireEvent.change(quantity, { target: { value: "99" } });
    expect(quantity).toHaveValue(8);
    expect(screen.getByRole("button", { name: "Tambah jumlah" })).toBeDisabled();
  });

  it("emits only a local preview result without fetch or storage", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<ProductSelection product={exampleShopProducts[0]} />);

    fireEvent.click(screen.getByRole("radio", { name: /Biru/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah ke cart (preview)" }));
    expect(screen.getByText("Pilihan siap untuk cart.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
  });

  it("keeps every option and action disabled when all variants are out of stock", () => {
    render(<ProductSelection product={exampleShopProducts[1]} />);

    expect(screen.getByText("Semua varian sedang habis.")).toBeVisible();
    for (const option of within(screen.getByRole("radiogroup")).getAllByRole("radio")) {
      expect(option).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByRole("button", { name: "Tambah ke cart (preview)" })).toBeDisabled();
  });
});
