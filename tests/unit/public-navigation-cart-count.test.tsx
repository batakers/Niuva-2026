import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicNavigation } from "@/components/niuva/public-navigation";
import { addCartItem, CART_STORAGE_KEY, EMPTY_CART, writeCart } from "@/features/cart/cart-state";

vi.mock("next/navigation", () => ({ usePathname: () => "/shop" }));

describe("PublicNavigation cart count", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("renders no count in server HTML", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(addCartItem(EMPTY_CART, { variantId: "a", quantity: 2 })));
    expect(renderToString(<PublicNavigation action={null} />)).not.toContain("data-cart-count");
  });

  it("shows no count for an empty or corrupt cart and leaves corrupt data untouched", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{broken");
    render(<PublicNavigation action={null} />);
    expect(screen.getByRole("link", { name: "Keranjang" })).toBeTruthy();
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBe("{broken");
  });

  it("exposes the unit count to screen readers and updates on cart writes", () => {
    let cart = addCartItem(EMPTY_CART, { variantId: "a", quantity: 2 });
    cart = addCartItem(cart, { variantId: "b", quantity: 1 });
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    render(<PublicNavigation action={null} />);
    expect(screen.getByRole("link", { name: /Keranjang, 3 item di keranjang/ })).toBeTruthy();

    act(() => {
      writeCart(window.localStorage, addCartItem(cart, { variantId: "c", quantity: 2 }));
    });
    expect(screen.getByRole("link", { name: /Keranjang, 5 item di keranjang/ })).toBeTruthy();
  });
});
