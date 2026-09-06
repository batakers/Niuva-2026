import { beforeEach, describe, expect, it } from "vitest";
import {
  addCartItem,
  CART_SCHEMA_VERSION,
  CART_STORAGE_KEY,
  EMPTY_CART,
  parseCart,
  readCart,
  removeCartItem,
  updateCartItem,
  writeCart,
} from "@/features/cart/cart-state";

describe("cart state", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts empty when no local cart exists", () => {
    expect(parseCart(null)).toEqual({ snapshot: EMPTY_CART, recovered: false, storageAvailable: true });
  });

  it("rejects malformed, version-mismatched, duplicate, and enriched browser data", () => {
    const invalid = [
      "{broken",
      JSON.stringify({ version: 2, items: [] }),
      JSON.stringify({ version: 1, items: [{ variantId: "variant-a", quantity: 1 }, { variantId: "variant-a", quantity: 2 }] }),
      JSON.stringify({ version: 1, items: [{ variantId: "variant-a", quantity: 1, priceRp: "185000" }] }),
    ];

    for (const raw of invalid) {
      const result = parseCart(raw);
      expect(result.snapshot).toEqual(EMPTY_CART);
      expect(result.recovered).toBe(true);
    }
  });

  it("adds matching variants once and caps quantity without persisting product facts", () => {
    const first = addCartItem(EMPTY_CART, { variantId: "variant-a", quantity: 2 });
    const next = addCartItem(first, { variantId: "variant-a", quantity: 4 }, 5);

    expect(next).toEqual({ version: CART_SCHEMA_VERSION, items: [{ variantId: "variant-a", quantity: 5 }] });
    expect(writeCart(window.localStorage, next)).toBe(true);
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBe('{"version":1,"items":[{"variantId":"variant-a","quantity":5}]}');
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).not.toMatch(/price|stock|sku|name/i);
  });

  it("updates and removes a stored line deterministically", () => {
    const initial = addCartItem(EMPTY_CART, { variantId: "variant-a", quantity: 1 });
    const updated = updateCartItem(initial, "variant-a", 3);
    expect(updated.items).toEqual([{ variantId: "variant-a", quantity: 3 }]);
    expect(updateCartItem(updated, "variant-a", 0)).toBe(updated);
    expect(removeCartItem(updated, "variant-a")).toEqual(EMPTY_CART);
  });

  it("clears a corrupt storage record during recovery", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "not-json");
    const result = readCart(window.localStorage);

    expect(result.recovered).toBe(true);
    expect(result.snapshot).toEqual(EMPTY_CART);
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });
});
