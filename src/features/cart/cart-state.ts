export const CART_STORAGE_KEY = "niuva.cart.v1";
export const CART_SCHEMA_VERSION = 1 as const;
export const MAX_CART_QUANTITY = 99;

export type CartItem = Readonly<{
  variantId: string;
  quantity: number;
}>;

export type CartSnapshot = Readonly<{
  version: typeof CART_SCHEMA_VERSION;
  items: readonly CartItem[];
}>;

export type CartReadResult = Readonly<{
  snapshot: CartSnapshot;
  recovered: boolean;
  storageAvailable: boolean;
}>;

export const EMPTY_CART: CartSnapshot = Object.freeze({
  version: CART_SCHEMA_VERSION,
  items: Object.freeze([]),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every(key => keys.includes(key));
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value) || !hasExactKeys(value, ["variantId", "quantity"])) return false;

  return typeof value.variantId === "string"
    && value.variantId.length > 0
    && value.variantId.length <= 160
    && value.variantId.trim() === value.variantId
    && typeof value.quantity === "number"
    && Number.isInteger(value.quantity)
    && value.quantity >= 1
    && value.quantity <= MAX_CART_QUANTITY;
}

export function parseCart(raw: string | null): CartReadResult {
  if (raw === null) {
    return { snapshot: EMPTY_CART, recovered: false, storageAvailable: true };
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !hasExactKeys(value, ["version", "items"])) throw new Error("Invalid cart envelope");
    if (value.version !== CART_SCHEMA_VERSION || !Array.isArray(value.items)) throw new Error("Invalid cart version");
    if (!value.items.every(isCartItem)) throw new Error("Invalid cart item");

    const ids = value.items.map(item => item.variantId);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate cart item");

    return {
      snapshot: { version: CART_SCHEMA_VERSION, items: value.items },
      recovered: false,
      storageAvailable: true,
    };
  } catch {
    return { snapshot: EMPTY_CART, recovered: true, storageAvailable: true };
  }
}

export function readCart(storage: Pick<Storage, "getItem" | "removeItem">): CartReadResult {
  try {
    const result = parseCart(storage.getItem(CART_STORAGE_KEY));
    if (result.recovered) storage.removeItem(CART_STORAGE_KEY);
    return result;
  } catch {
    return { snapshot: EMPTY_CART, recovered: false, storageAvailable: false };
  }
}

export function writeCart(storage: Pick<Storage, "setItem">, snapshot: CartSnapshot) {
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function addCartItem(
  snapshot: CartSnapshot,
  item: CartItem,
  maximum = MAX_CART_QUANTITY,
): CartSnapshot {
  const safeMaximum = Math.min(Math.max(Math.trunc(maximum), 1), MAX_CART_QUANTITY);
  const current = snapshot.items.find(entry => entry.variantId === item.variantId);
  const quantity = Math.min((current?.quantity ?? 0) + item.quantity, safeMaximum);
  const next = current
    ? snapshot.items.map(entry => entry.variantId === item.variantId ? { ...entry, quantity } : entry)
    : [...snapshot.items, { variantId: item.variantId, quantity }];

  return { version: CART_SCHEMA_VERSION, items: next };
}

export function updateCartItem(snapshot: CartSnapshot, variantId: string, quantity: number): CartSnapshot {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) return snapshot;
  if (!snapshot.items.some(item => item.variantId === variantId)) return snapshot;

  return {
    version: CART_SCHEMA_VERSION,
    items: snapshot.items.map(item => item.variantId === variantId ? { ...item, quantity } : item),
  };
}

export function removeCartItem(snapshot: CartSnapshot, variantId: string): CartSnapshot {
  return {
    version: CART_SCHEMA_VERSION,
    items: snapshot.items.filter(item => item.variantId !== variantId),
  };
}
