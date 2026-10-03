import type { OrderStatusPreview } from "@/features/frontend-preview/order-status";

/** Synthetic quote destination, only ever used when the caller is in preview mode. */
export const PREVIEW_QUOTE_HREF = "/quote/preview-quote?preview=examples" as const;

export type NextActionControl =
  | Readonly<{ kind: "payment-link"; href: string; label: string }>
  | Readonly<{ kind: "quote-link"; href: string; label: string }>
  | Readonly<{ kind: "disabled"; label: string }>
  | Readonly<{ kind: "quote-unavailable" }>
  | Readonly<{ kind: "none" }>;

const MAX_LIVE_QUOTE_HREF_LENGTH = 2048;
const ORIGIN_PROBE = "http://niuva.invalid";

function hasWhitespaceOrControl(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029 || /\s/u.test(char)) {
      return true;
    }
  }
  return false;
}

/**
 * Accepts only same-origin relative paths that can never point at preview
 * fixtures. Anything else must fall back to the "quote unavailable" notice.
 */
export function isSafeLiveQuoteHref(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_LIVE_QUOTE_HREF_LENGTH) {
    return false;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return false;
  }
  if (hasWhitespaceOrControl(value) || value.toLowerCase().includes("preview")) {
    return false;
  }
  try {
    return new URL(value, ORIGIN_PROBE).origin === ORIGIN_PROBE;
  } catch {
    return false;
  }
}

/**
 * Pure resolution of the single control shown in the order status "next
 * action" card. Only `isPreview === true` is treated as preview.
 */
export function resolveNextActionControl({
  action,
  payment,
  isPreview,
}: Readonly<{
  action: OrderStatusPreview["nextAction"];
  payment: OrderStatusPreview["payment"];
  isPreview: boolean | undefined;
}>): NextActionControl {
  if (payment?.redirectUrl) {
    return {
      href: payment.redirectUrl,
      kind: "payment-link",
      label: payment.purpose === "CUSTOM_SHIPPING" ? "Buka pembayaran pengiriman" : "Buka pembayaran",
    };
  }

  const label = action.label ?? action.title;

  switch (action.kind) {
    case "quote":
      if (isPreview === true) {
        return { href: PREVIEW_QUOTE_HREF, kind: "quote-link", label };
      }
      return isSafeLiveQuoteHref(action.quoteHref)
        ? { href: action.quoteHref, kind: "quote-link", label }
        : { kind: "quote-unavailable" };
    case "payment-unavailable":
    case "shipping-payment-unavailable":
      return { kind: "disabled", label };
    case "none":
    case "support":
      return { kind: "none" };
  }
}
