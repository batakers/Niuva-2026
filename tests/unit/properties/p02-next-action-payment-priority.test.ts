// Feature: system-pages-and-error-states, Property 2: Payment link priority is unchanged
// Validates: Requirements 12.8
import { describe, expect, it } from "vitest";

import { resolveNextActionControl } from "@/app/orders/[token]/next-action";
import type { OrderStatusPreview } from "@/features/frontend-preview/order-status";

import { createRng, DEFAULT_SEED, MIN_GENERATED, seededCorpus, type Rng } from "../helpers/corpus";

type Action = OrderStatusPreview["nextAction"];
type Payment = NonNullable<OrderStatusPreview["payment"]>;

const KINDS: readonly Action["kind"][] = ["none", "quote", "payment-unavailable", "shipping-payment-unavailable", "support"];
const PURPOSES: readonly Payment["purpose"][] = ["ORDER_TOTAL", "CUSTOM_SHIPPING"];
const PREVIEW_FLAGS: readonly (boolean | undefined)[] = [true, false, undefined];

const QUOTE_HREFS: readonly (string | undefined)[] = [
  undefined,
  "",
  "/quote/abc",
  "/quote/preview-quote?preview=examples",
  "//evil.test/quote",
  "https://evil.test/quote",
  "javascript:alert(1)",
  "/quote/with space",
  "/quote/a\\b",
];

const REDIRECT_URLS: readonly string[] = [
  "https://app.sandbox.midtrans.com/snap/v4/redirection/abc",
  "https://pay.example.test/x?y=1#z",
  "/relative/payment",
  "javascript:alert(1)",
  "/quote/preview-quote?preview=examples",
  " spaced ",
  "x",
];

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;

function randomRedirectUrl(rng: Rng): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=%";
  const length = 1 + Math.floor(rng() * 60);
  return Array.from({ length }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");
}

function makeAction(kind: Action["kind"], quoteHref: string | undefined, withLabel: boolean): Action {
  return {
    description: "Deskripsi",
    kind,
    ...(withLabel ? { label: "Label aksi" } : {}),
    ...(quoteHref === undefined ? {} : { quoteHref }),
    title: "Judul aksi",
    tone: "info",
  };
}

function expectedLabel(purpose: Payment["purpose"]): string {
  return purpose === "CUSTOM_SHIPPING" ? "Buka pembayaran pengiriman" : "Buka pembayaran";
}

function assertPaymentPriority(
  kind: Action["kind"],
  quoteHref: string | undefined,
  withLabel: boolean,
  purpose: Payment["purpose"],
  redirectUrl: string,
  isPreview: boolean | undefined,
): void {
  const control = resolveNextActionControl({
    action: makeAction(kind, quoteHref, withLabel),
    isPreview,
    payment: { expiresAt: "1 Januari 2027", purpose, redirectUrl },
  });

  expect(control).toEqual({ href: redirectUrl, kind: "payment-link", label: expectedLabel(purpose) });
}

describe("Property 2: payment link priority is unchanged", () => {
  it("returns the exact redirectUrl and legacy label for every kind × purpose × isPreview × quoteHref combination", () => {
    for (const isPreview of PREVIEW_FLAGS) {
      for (const kind of KINDS) {
        for (const quoteHref of QUOTE_HREFS) {
          for (const purpose of PURPOSES) {
            for (const redirectUrl of REDIRECT_URLS) {
              for (const withLabel of [true, false]) {
                assertPaymentPriority(kind, quoteHref, withLabel, purpose, redirectUrl, isPreview);
              }
            }
          }
        }
      }
    }
  });

  it("holds for at least 100 seeded random inputs", () => {
    const rng = createRng(DEFAULT_SEED);
    const urls = seededCorpus([], randomRedirectUrl, DEFAULT_SEED);
    expect(urls.length).toBeGreaterThanOrEqual(MIN_GENERATED);

    for (const redirectUrl of urls) {
      const kind = pick(rng, KINDS);
      const quoteHref = pick(rng, QUOTE_HREFS);
      const purpose = pick(rng, PURPOSES);
      const isPreview = pick(rng, PREVIEW_FLAGS);
      const withLabel = rng() < 0.5;

      try {
        assertPaymentPriority(kind, quoteHref, withLabel, purpose, redirectUrl, isPreview);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `[corpus seed=${DEFAULT_SEED}] ${JSON.stringify({ isPreview, kind, purpose, quoteHref, redirectUrl })}: ${reason}`,
          { cause: error },
        );
      }
    }
  });

  it("does not take the payment branch when redirectUrl is absent or empty", () => {
    for (const payment of [
      undefined,
      { expiresAt: "1 Januari 2027", purpose: "ORDER_TOTAL" as const },
      { expiresAt: "1 Januari 2027", purpose: "CUSTOM_SHIPPING" as const, redirectUrl: "" },
    ]) {
      const control = resolveNextActionControl({
        action: makeAction("none", undefined, false),
        isPreview: false,
        payment,
      });
      expect(control.kind).not.toBe("payment-link");
    }
  });
});
