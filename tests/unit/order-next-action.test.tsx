// Feature: system-pages-and-error-states, task 10.4
// Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 15.3
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  PREVIEW_QUOTE_HREF,
  resolveNextActionControl,
  type NextActionControl,
} from "@/app/orders/[token]/next-action";
import { OrderStatus } from "@/app/orders/[token]/order-status";
import type { OrderStatusPreview } from "@/features/frontend-preview/order-status";

type Action = OrderStatusPreview["nextAction"];
type Payment = OrderStatusPreview["payment"];
type Kind = Action["kind"];

afterEach(cleanup);

const KINDS: readonly Kind[] = ["none", "quote", "payment-unavailable", "shipping-payment-unavailable", "support"];
const MODES: readonly (boolean | undefined)[] = [true, false, undefined];
const PAYMENT_URL = "https://pay.example.test/checkout/abc123";

const PAYMENTS: readonly Readonly<{ name: string; payment: Payment; label?: string }>[] = [
  { name: "no payment", payment: undefined },
  { name: "payment without redirectUrl", payment: { expiresAt: "1 Okt 2026", purpose: "ORDER_TOTAL" } },
  {
    label: "Buka pembayaran",
    name: "order payment",
    payment: { expiresAt: "1 Okt 2026", purpose: "ORDER_TOTAL", redirectUrl: PAYMENT_URL },
  },
  {
    label: "Buka pembayaran pengiriman",
    name: "shipping payment",
    payment: { expiresAt: "1 Okt 2026", purpose: "CUSTOM_SHIPPING", redirectUrl: PAYMENT_URL },
  },
];

/** Hand-written oracle: `safe` is stated per value, not computed by the implementation. */
const QUOTE_HREFS: readonly Readonly<{ value: string | undefined; safe: boolean }>[] = [
  { safe: false, value: undefined },
  { safe: false, value: "" },
  { safe: true, value: "/quote/abc123" },
  { safe: true, value: "/account/make/3f2b9c1e-0000-4000-8000-000000000000" },
  { safe: false, value: "/quote/preview-quote" },
  { safe: false, value: "/quote/abc?preview=examples" },
  { safe: false, value: "https://niuva.example.test/quote/abc" },
  { safe: false, value: "//evil.test/quote/abc" },
  { safe: false, value: "javascript:alert(1)" },
  { safe: false, value: "/quote/a b" },
];

function buildAction(kind: Kind, quoteHref: string | undefined, label?: string): Action {
  return {
    description: "Deskripsi langkah berikutnya.",
    kind,
    title: "Langkah berikutnya",
    tone: "info",
    ...(label === undefined ? {} : { label }),
    ...(quoteHref === undefined ? {} : { quoteHref }),
  };
}

function expectedControl(
  kind: Kind,
  payment: (typeof PAYMENTS)[number],
  isPreview: boolean | undefined,
  href: (typeof QUOTE_HREFS)[number],
  label: string,
): NextActionControl {
  if (payment.payment?.redirectUrl) {
    return { href: PAYMENT_URL, kind: "payment-link", label: payment.label ?? "" };
  }
  switch (kind) {
    case "quote":
      if (isPreview === true) return { href: PREVIEW_QUOTE_HREF, kind: "quote-link", label };
      return href.safe && href.value !== undefined
        ? { href: href.value, kind: "quote-link", label }
        : { kind: "quote-unavailable" };
    case "payment-unavailable":
    case "shipping-payment-unavailable":
      return { kind: "disabled", label };
    case "none":
    case "support":
      return { kind: "none" };
  }
}

describe("resolveNextActionControl", () => {
  it("matches the expected control for every kind × payment × isPreview × quoteHref combination", () => {
    let combinations = 0;
    for (const kind of KINDS) {
      for (const payment of PAYMENTS) {
        for (const isPreview of MODES) {
          for (const href of QUOTE_HREFS) {
            for (const explicitLabel of [undefined, "Label kustom"]) {
              const action = buildAction(kind, href.value, explicitLabel);
              const context = `${kind} | ${payment.name} | isPreview=${String(isPreview)} | ${JSON.stringify(href.value)} | label=${String(explicitLabel)}`;
              expect(
                resolveNextActionControl({ action, isPreview, payment: payment.payment }),
                context,
              ).toEqual(expectedControl(kind, payment, isPreview, href, explicitLabel ?? action.title));
              combinations += 1;
            }
          }
        }
      }
    }
    expect(combinations).toBe(KINDS.length * PAYMENTS.length * MODES.length * QUOTE_HREFS.length * 2);
  });

  it("treats an omitted isPreview exactly like false", () => {
    for (const href of QUOTE_HREFS) {
      const action = buildAction("quote", href.value);
      expect(resolveNextActionControl({ action, isPreview: undefined, payment: undefined })).toEqual(
        resolveNextActionControl({ action, isPreview: false, payment: undefined }),
      );
    }
  });

  it("never links to the synthetic preview quote outside preview mode", () => {
    for (const isPreview of [false, undefined]) {
      for (const href of QUOTE_HREFS) {
        const control = resolveNextActionControl({
          action: buildAction("quote", href.value),
          isPreview,
          payment: undefined,
        });
        expect("href" in control ? control.href : "").not.toContain("preview");
      }
    }
  });
});

function buildOrder(action: Action, payment?: Payment): OrderStatusPreview {
  return {
    createdAt: "1 Okt 2026",
    currentDescription: "Menunggu keputusan quote.",
    currentLabel: "Quote menunggu",
    items: [{ label: "Part uji", quantity: 1, total: "Rp10.000" }],
    nextAction: action,
    orderNumber: "NIV-TEST-0001",
    orderType: "CUSTOM_PRINT",
    paidAt: null,
    shipment: null,
    steps: [{ id: "quote", label: "Quote", state: "current" }],
    total: "Rp10.000",
    ...(payment === undefined ? {} : { payment }),
  };
}

function allAttributeValues(root: Element): string[] {
  return Array.from(root.querySelectorAll("*")).flatMap((element) =>
    Array.from(element.attributes, (attribute) => attribute.value),
  );
}

const FOCUSABLE = "a[href], button:not([disabled]), input, select, textarea, [tabindex]";

describe("OrderStatus next action DOM", () => {
  it("preview: renders the synthetic quote link", () => {
    render(<OrderStatus isPreview order={buildOrder(buildAction("quote", undefined, "Tinjau quote"))} scenario="custom-quote-pending" />);

    expect(screen.getByRole("link", { name: "Tinjau quote" })).toHaveAttribute("href", PREVIEW_QUOTE_HREF);
    expect(screen.getByText(/Preview lokal dengan data sintetis/)).toBeInTheDocument();
  });

  it("live: renders a safe quoteHref unchanged and leaks no preview path in any attribute", () => {
    const { container } = render(
      <OrderStatus
        isPreview={false}
        order={buildOrder(buildAction("quote", "/quote/abc123", "Tinjau quote"))}
        scenario="live"
      />,
    );

    expect(screen.getByRole("link", { name: "Tinjau quote" })).toHaveAttribute("href", "/quote/abc123");
    for (const value of allAttributeValues(container)) {
      expect(value).not.toContain("/quote/preview-quote");
      expect(value).not.toContain("preview=examples");
    }
    expect(screen.getByText(/Projection server terotorisasi token/)).toBeInTheDocument();
  });

  it("live: omitting isPreview behaves as live even when quoteHref is missing", () => {
    const { container } = render(
      <OrderStatus order={buildOrder(buildAction("quote", undefined))} scenario="live" />,
    );

    expect(screen.getByText("Tautan quote belum tersedia")).toBeInTheDocument();
    expect(screen.getByText(/Projection server terotorisasi token/)).toBeInTheDocument();
    for (const value of allAttributeValues(container)) {
      expect(value).not.toContain("/quote/preview-quote");
      expect(value).not.toContain("preview=examples");
    }
  });

  it.each([
    { href: undefined, name: "missing" },
    { href: "/quote/preview-quote?preview=examples", name: "the preview fixture" },
    { href: "https://evil.test/quote/abc", name: "absolute" },
  ])("quote-unavailable ($name quoteHref) renders a notice with no focusable control", ({ href }) => {
    const { container } = render(
      <OrderStatus isPreview={false} order={buildOrder(buildAction("quote", href))} scenario="live" />,
    );

    expect(screen.getByText("Tautan quote belum tersedia")).toBeInTheDocument();
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    { isPreview: true, label: "Buka pembayaran", purpose: "ORDER_TOTAL" as const },
    { isPreview: false, label: "Buka pembayaran", purpose: "ORDER_TOTAL" as const },
    { isPreview: undefined, label: "Buka pembayaran pengiriman", purpose: "CUSTOM_SHIPPING" as const },
  ])("payment link is unchanged ($purpose, isPreview=$isPreview)", ({ isPreview, label, purpose }) => {
    render(
      <OrderStatus
        isPreview={isPreview}
        order={buildOrder(buildAction("quote", "/quote/abc123"), {
          expiresAt: "2 Okt 2026",
          purpose,
          redirectUrl: PAYMENT_URL,
        })}
        scenario="live"
      />,
    );

    const link = screen.getByRole("link", { name: label });
    expect(link).toHaveAttribute("href", PAYMENT_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(screen.queryByRole("link", { name: "Tinjau quote" })).not.toBeInTheDocument();
    expect(screen.queryByText("Tautan quote belum tersedia")).not.toBeInTheDocument();
  });

  it("renders a disabled button for payment-unavailable and no control for support", () => {
    const { unmount } = render(
      <OrderStatus order={buildOrder(buildAction("payment-unavailable", undefined, "Pembayaran belum tersedia"))} scenario="live" />,
    );
    expect(screen.getByRole("button", { name: "Pembayaran belum tersedia" })).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    unmount();

    const { container } = render(<OrderStatus order={buildOrder(buildAction("support", undefined))} scenario="live" />);
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0);
  });
});
