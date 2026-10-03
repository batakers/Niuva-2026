// Feature: system-pages-and-error-states, Property 1: NextAction isolation on live projections
// Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.9
import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { OrderStatus } from "@/app/orders/[token]/order-status";
import {
  isSafeLiveQuoteHref,
  PREVIEW_QUOTE_HREF,
  resolveNextActionControl,
  type NextActionControl,
} from "@/app/orders/[token]/next-action";
import type { OrderStatusPreview } from "@/features/frontend-preview/order-status";

import { DEFAULT_SEED, createRng, forEachCase, seededCorpus, type Rng } from "../helpers/corpus";

type Action = OrderStatusPreview["nextAction"];
type Payment = OrderStatusPreview["payment"];
type Kind = Action["kind"];

const KINDS: readonly Kind[] = ["none", "quote", "payment-unavailable", "shipping-payment-unavailable", "support"];
const LIVE_MODES: readonly (boolean | undefined)[] = [false, undefined];
const PAYMENT_REDIRECT = "https://pay.example.test/checkout/abc123";

const PAYMENTS: readonly Readonly<{ name: string; payment: Payment }>[] = [
  { name: "no payment", payment: undefined },
  { name: "payment with redirectUrl", payment: { expiresAt: "1 Okt 2026", purpose: "ORDER_TOTAL", redirectUrl: PAYMENT_REDIRECT } },
  { name: "shipping payment with redirectUrl", payment: { expiresAt: "1 Okt 2026", purpose: "CUSTOM_SHIPPING", redirectUrl: PAYMENT_REDIRECT } },
  { name: "payment without redirectUrl", payment: { expiresAt: "1 Okt 2026", purpose: "ORDER_TOTAL" } },
];

/** `undefined` means the `quoteHref` field is missing entirely. */
const FIXED_QUOTE_HREFS: readonly (string | undefined)[] = [
  undefined,
  "",
  "/quote/preview-quote",
  "/quote/PREVIEW-quote",
  "/Quote/Preview-Quote?x=1",
  "/quote/preview-quote?preview=examples",
  "/quote/abc?preview=examples",
  "/quote/abc?PREVIEW=Examples",
  "/quote/abc?PrEvIeW=ExAmPlEs",
  "/quote/abc#Preview",
  "https://niuva.example.test/quote/abc",
  "http://evil.test/quote/abc",
  "//evil.test/quote/abc",
  "//",
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "/quote/a b",
  "/quote/a\tb",
  "/quote/a\nb",
  "/quote/a\\b",
  "\\quote\\abc",
  "quote/abc",
  " /quote/abc",
  "/quote/abc ",
  "/quote/abc",
  "/quote/abc?x=1&y=2",
  "/account/make/3f2b9c1e-0000-4000-8000-000000000000",
  "/".padEnd(2049, "a"),
];

/** Fixed hrefs that MUST be accepted / rejected, so the iff check cannot be vacuous. */
const MUST_BE_SAFE = ["/quote/abc", "/quote/abc?x=1&y=2", "/account/make/3f2b9c1e-0000-4000-8000-000000000000"];
const MUST_BE_UNSAFE = [
  "", "/quote/preview-quote", "/quote/abc?PREVIEW=Examples", "https://niuva.example.test/quote/abc",
  "//evil.test/quote/abc", "javascript:alert(1)", "/quote/a b", "/quote/a\\b", "/".padEnd(2049, "a"),
];

const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
const WORD = "abcdefghijklmnopqrstuvwxyz0123456789-_";
const word = (rng: Rng, min: number, max: number): string =>
  Array.from({ length: min + Math.floor(rng() * (max - min + 1)) }, () => WORD[Math.floor(rng() * WORD.length)]).join("");

/** Seeded mix of valid, preview-ish, absolute, protocol-relative, scheme, and whitespace/backslash hrefs. */
function generatedQuoteHref(rng: Rng): string {
  switch (Math.floor(rng() * 8)) {
    case 0:
      return `/quote/${word(rng, 1, 24)}`;
    case 1:
      return `/${word(rng, 1, 8)}/${word(rng, 1, 12)}?${word(rng, 1, 5)}=${word(rng, 0, 8)}`;
    case 2:
      return `/quote/${pick(rng, ["preview", "PREVIEW", "Preview", "pReViEw"])}-${word(rng, 0, 8)}`;
    case 3:
      return `/quote/${word(rng, 1, 8)}?${pick(rng, ["preview", "PREVIEW", "Preview"])}=${pick(rng, ["examples", "EXAMPLES", "x"])}`;
    case 4:
      return `${pick(rng, ["https:", "http:", "ftp:", "data:", "javascript:", "//", "///"])}${word(rng, 1, 16)}/${word(rng, 1, 8)}`;
    case 5:
      return `/${word(rng, 1, 8)}${pick(rng, [" ", "\t", "\n", "\\", "\u00a0", "\u2028", "\u0000"])}${word(rng, 1, 8)}`;
    case 6:
      return `${word(rng, 1, 10)}/${word(rng, 1, 10)}`;
    default:
      return "";
  }
}

const QUOTE_HREFS: readonly (string | undefined)[] = [
  ...FIXED_QUOTE_HREFS,
  ...seededCorpus([], generatedQuoteHref, DEFAULT_SEED),
];

function buildAction(kind: Kind, quoteHref: string | undefined): Action {
  return {
    description: "Deskripsi langkah berikutnya.",
    kind,
    title: "Langkah berikutnya",
    tone: "info",
    ...(quoteHref === undefined ? {} : { quoteHref }),
  };
}

function hrefOf(control: NextActionControl): string | undefined {
  return "href" in control ? control.href : undefined;
}

describe("Property 1: NextAction isolation on live projections", () => {
  it("uses a corpus with at least 100 generated quoteHref values and all fixed classes", () => {
    expect(QUOTE_HREFS.length).toBeGreaterThanOrEqual(100 + FIXED_QUOTE_HREFS.length);
    for (const value of MUST_BE_SAFE) expect(isSafeLiveQuoteHref(value)).toBe(true);
    for (const value of MUST_BE_UNSAFE) expect(isSafeLiveQuoteHref(value)).toBe(false);
    expect(isSafeLiveQuoteHref(undefined)).toBe(false);
  });

  it("never yields a control href containing 'preview' when isPreview is false/undefined", () => {
    for (const isPreview of LIVE_MODES) {
      for (const kind of KINDS) {
        for (const { name, payment } of PAYMENTS) {
          forEachCase(
            QUOTE_HREFS.map((value) => value ?? "\u0000undefined"),
            (encoded) => {
              const quoteHref = encoded === "\u0000undefined" ? undefined : encoded;
              const control = resolveNextActionControl({ action: buildAction(kind, quoteHref), isPreview, payment });
              const href = hrefOf(control);
              if (href !== undefined) {
                expect(href.toLowerCase(), `${String(isPreview)}/${kind}/${name}`).not.toContain("preview");
              }
            },
          );
        }
      }
    }
  });

  it("quote-link carries the exact quoteHref iff isSafeLiveQuoteHref; otherwise quote-unavailable", () => {
    const payment = undefined;
    for (const isPreview of LIVE_MODES) {
      for (const quoteHref of QUOTE_HREFS) {
        const control = resolveNextActionControl({ action: buildAction("quote", quoteHref), isPreview, payment });
        const safe = isSafeLiveQuoteHref(quoteHref);
        const context = `isPreview=${String(isPreview)} quoteHref=${JSON.stringify(quoteHref)}`;

        if (safe) {
          expect(control.kind, context).toBe("quote-link");
          expect(hrefOf(control), context).toBe(quoteHref);
        } else {
          expect(control, context).toEqual({ kind: "quote-unavailable" });
          expect(hrefOf(control), context).toBeUndefined();
        }
      }
    }
  });

  it("never yields a quote-link for non-quote kinds, whatever quoteHref is supplied", () => {
    for (const isPreview of LIVE_MODES) {
      for (const kind of KINDS.filter((k) => k !== "quote")) {
        for (const quoteHref of QUOTE_HREFS) {
          const control = resolveNextActionControl({ action: buildAction(kind, quoteHref), isPreview, payment: undefined });
          expect(control.kind, `${String(isPreview)}/${kind}`).not.toBe("quote-link");
          expect(control.kind, `${String(isPreview)}/${kind}`).not.toBe("quote-unavailable");
          expect(hrefOf(control)).toBeUndefined();
        }
      }
    }
  });

  it("keeps the synthetic preview quote link for isPreview === true regardless of quoteHref", () => {
    const rng = createRng(DEFAULT_SEED);
    expect(PREVIEW_QUOTE_HREF).toBe("/quote/preview-quote?preview=examples");
    for (const quoteHref of [...QUOTE_HREFS, generatedQuoteHref(rng)]) {
      const control = resolveNextActionControl({ action: buildAction("quote", quoteHref), isPreview: true, payment: undefined });
      expect(control.kind).toBe("quote-link");
      expect(hrefOf(control)).toBe("/quote/preview-quote?preview=examples");
    }
  });

  it("renders no preview anchor and no active quote control in the live DOM", () => {
    const order = (quoteHref: string | undefined): OrderStatusPreview => ({
      createdAt: "1 Okt 2026",
      currentDescription: "Menunggu keputusan quote.",
      currentLabel: "Quote menunggu",
      items: [{ label: "Part uji", quantity: 1, total: "Rp10.000" }],
      nextAction: buildAction("quote", quoteHref),
      orderNumber: "NIV-TEST-0001",
      orderType: "CUSTOM_PRINT",
      paidAt: null,
      shipment: null,
      steps: [{ id: "quote", label: "Quote", state: "current" }],
      total: "Rp10.000",
    });

    for (const isPreview of LIVE_MODES) {
      forEachCase(
        [...FIXED_QUOTE_HREFS, ...QUOTE_HREFS.slice(FIXED_QUOTE_HREFS.length, FIXED_QUOTE_HREFS.length + 20)].map(
          (value) => value ?? "\u0000undefined",
        ),
        (encoded) => {
          const quoteHref = encoded === "\u0000undefined" ? undefined : encoded;
          const { container, unmount } = render(
            createElement(OrderStatus, { isPreview, order: order(quoteHref), scenario: "live" }),
          );

          const hrefs = Array.from(container.querySelectorAll("a[href]"), (anchor) => anchor.getAttribute("href") ?? "");
          for (const href of hrefs) expect(href.toLowerCase()).not.toContain("preview");

          if (isSafeLiveQuoteHref(quoteHref)) {
            expect(hrefs).toContain(quoteHref);
          } else {
            expect(container.textContent).toContain("Tautan quote belum tersedia");
            expect(container.querySelector("a[href]")).toBeNull();
            expect(container.querySelector("button:not([disabled])")).toBeNull();
          }
          unmount();
        },
      );
    }
  });
});
