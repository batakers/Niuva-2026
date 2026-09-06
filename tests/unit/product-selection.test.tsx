import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductSelection } from "@/app/shop/[slug]/product-selection";
import { CART_STORAGE_KEY } from "@/features/cart/cart-state";
import { exampleShopProducts } from "@/features/frontend-preview/fixtures";

describe("product selection preview", () => {
  beforeEach(() => window.localStorage.clear());

  it("requires an available variant before preparing a cart intent", () => {
    render(<ProductSelection product={exampleShopProducts[0]} />);

    const prepare = screen.getByRole("button", { name: "Tambah ke cart" });
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

  it("stores only variant ID and quantity without a network request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ProductSelection product={exampleShopProducts[0]} />);

    fireEvent.click(screen.getByRole("radio", { name: /Biru/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah ke cart" }));
    expect(screen.getByText("Pilihan ditambahkan ke cart.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBe('{"version":1,"items":[{"variantId":"example-dock-blue","quantity":1}]}');
    fetchSpy.mockRestore();
  });

  it("keeps every option and action disabled when all variants are out of stock", () => {
    render(<ProductSelection product={exampleShopProducts[1]} />);

    expect(screen.getByText("Semua varian sedang habis.")).toBeVisible();
    for (const option of within(screen.getByRole("radiogroup")).getAllByRole("radio")) {
      expect(option).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByRole("button", { name: "Tambah ke cart" })).toBeDisabled();
  });
});
