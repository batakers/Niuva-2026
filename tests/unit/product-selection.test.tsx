import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductSelection } from "@/app/shop/[slug]/product-selection";
import { CART_STORAGE_KEY, PREVIEW_CART_STORAGE_KEY } from "@/features/cart/cart-state";
import { exampleShopProducts } from "@/features/frontend-preview/fixtures";

describe("product selection preview", () => {
  beforeEach(() => window.localStorage.clear());

  it("requires an available variant before preparing a cart intent", () => {
    render(<ProductSelection product={exampleShopProducts[0]} />);

    const prepare = screen.getByRole("button", { name: "Tambah ke keranjang" });
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
    fireEvent.click(screen.getByRole("button", { name: "Tambah ke keranjang" }));
    expect(screen.getByText("Masuk ke keranjang.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(PREVIEW_CART_STORAGE_KEY)).toBe('{"version":1,"items":[{"variantId":"example-dock-blue","quantity":1}]}');
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    fetchSpy.mockRestore();
  });

  it("puts a live catalog variant in the real cart", () => {
    render(<ProductSelection previewEnabled={false} product={exampleShopProducts[0]} />);

    fireEvent.click(screen.getByRole("radio", { name: /Biru/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah ke keranjang" }));
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBe('{"version":1,"items":[{"variantId":"example-dock-blue","quantity":1}]}');
    expect(window.localStorage.getItem(PREVIEW_CART_STORAGE_KEY)).toBeNull();
  });

  it("keeps every option and action disabled when all variants are out of stock", () => {
    render(<ProductSelection product={exampleShopProducts[1]} />);

    expect(screen.getByText("Semua varian sedang habis.")).toBeVisible();
    for (const option of within(screen.getByRole("radiogroup")).getAllByRole("radio")) {
      expect(option).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByRole("button", { name: "Tambah ke keranjang" })).toBeDisabled();
  });

  // The catalog importer names the only variant of a product without options "Default".
  const singleVariant = (stockOnHand: number) => ({
    ...exampleShopProducts[0],
    variants: [{ ...exampleShopProducts[0].variants[0], name: "Default", stockOnHand }],
  });

  it("selects the only variant from the start and never shows its placeholder name", () => {
    render(<ProductSelection product={singleVariant(4)} />);

    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByText(/Default/)).toBeNull();
    expect(screen.getByText("Maksimal 4 pada data contoh.")).toBeVisible();
    const prepare = screen.getByRole("button", { name: "Tambah ke keranjang" });
    expect(prepare).toBeEnabled();

    fireEvent.click(prepare);
    expect(screen.getByText("Masuk ke keranjang.")).toBeVisible();
    expect(screen.getByText("1 barang. Stok belum ditahan sampai pesanan dibuat.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Lihat keranjang" })).toHaveAttribute("href", "/cart?preview=examples");
    expect(window.localStorage.getItem(PREVIEW_CART_STORAGE_KEY)).toBe('{"version":1,"items":[{"variantId":"example-dock-blue","quantity":1}]}');
  });

  it("says the stock is out instead of asking for a variant when the only one is sold out", () => {
    render(<ProductSelection product={singleVariant(0)} />);

    expect(screen.getByText("Stok sedang habis.", { selector: "p.font-semibold" })).toBeVisible();
    expect(screen.queryByText("Semua varian sedang habis.")).toBeNull();
    expect(screen.queryByText("Pilih varian dulu")).toBeNull();
    expect(screen.getByRole("button", { name: "Tambah ke keranjang" })).toBeDisabled();
  });
});
