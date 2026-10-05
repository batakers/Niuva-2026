"use client";

import { useSyncExternalStore } from "react";
import { CART_CHANGE_EVENT, CART_STORAGE_KEY, countCartUnits, parseCart } from "./cart-state";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CART_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CART_CHANGE_EVENT, onChange);
  };
}

// Read-only: unlike readCart, never removes a corrupt entry. Returns a primitive so snapshots stay stable.
function getSnapshot() {
  try {
    const result = parseCart(window.localStorage.getItem(CART_STORAGE_KEY));
    return countCartUnits(result.snapshot);
  } catch {
    return 0;
  }
}

/** Cart unit count from client storage. Null on the server and during hydration, so static HTML is unchanged. */
export function useCartCount(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
