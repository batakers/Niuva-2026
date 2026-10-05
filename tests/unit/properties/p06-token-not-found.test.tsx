// Feature: system-pages-and-error-states, Property 6
// Property 6: Every token failure ends at notFound with no distinguishing output.
// Validates: Requirements 2.1, 2.2, 2.4
import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forEachCase, tokenCorpus } from "../helpers/corpus";

const NOT_FOUND_SENTINEL = Object.freeze({ sentinel: "NEXT_NOT_FOUND" });
const ENTITY_ID = "123e4567-e89b-42d3-a456-426614174000";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  entityId: vi.fn<(token: string) => string | null>(),
  actualEntityId: { current: null as null | ((token: string) => string | null) },
  getQuotePreview: vi.fn(),
  getLiveQuoteReview: vi.fn(),
  getOrderStatusPreview: vi.fn(),
  getLiveOrderStatus: vi.fn(),
  getStatus: vi.fn(),
  getServerCapabilities: vi.fn(),
}));

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, usePathname: () => "/" }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));
vi.mock("@/lib/env/server", () => ({
  isLocalDemoMode: () => false,
  getServerCapabilities: mocks.getServerCapabilities,
}));
vi.mock("@/modules/shared/access-token", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/access-token")>();
  mocks.actualEntityId.current = actual.getRouteAccessTokenEntityId;
  return { ...actual, getRouteAccessTokenEntityId: mocks.entityId };
});
vi.mock("@/features/frontend-preview/quote", () => ({
  getQuotePreview: mocks.getQuotePreview,
  getLiveQuoteReview: mocks.getLiveQuoteReview,
}));
vi.mock("@/features/frontend-preview/order-status", () => ({
  getOrderStatusPreview: mocks.getOrderStatusPreview,
  getLiveOrderStatus: mocks.getLiveOrderStatus,
}));
vi.mock("@/modules/custom-print/access-service", () => ({
  CustomPrintAccessService: class {
    getStatus = mocks.getStatus;
  },
}));
vi.mock("@/app/quote/[token]/quote-review", () => ({ QuoteReview: () => null }));
vi.mock("@/app/orders/[token]/order-status", () => ({ OrderStatus: () => null }));
vi.mock("@/app/custom-print/requests/[token]/append-model-form", () => ({ AppendModelForm: () => null }));

import OrderStatusPage from "@/app/orders/[token]/page";
import OrderStatusNotFound from "@/app/orders/[token]/not-found";
import QuoteNotFound from "@/app/quote/[token]/not-found";
import QuotePage from "@/app/quote/[token]/page";
import CustomPrintRequestStatusPage from "@/app/custom-print/requests/[token]/page";
import RootNotFound from "@/app/not-found";
import { appError } from "@/modules/shared/errors";

type ErrorCodeName = Parameters<typeof appError>[0];
type PageProps = { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> };
type Page = (props: PageProps) => Promise<unknown>;

const tokens = tokenCorpus();

type Cause =
  | { kind: "bad-format" }
  | { kind: "null-entity-id" }
  | { kind: "app-error"; code: ErrorCodeName };

const appErrorCause = (code: ErrorCodeName): Cause => ({ kind: "app-error", code });
const BASE: readonly Cause[] = [
  { kind: "bad-format" },
  { kind: "null-entity-id" },
  appErrorCause("NOT_FOUND"),
  appErrorCause("UNAUTHORIZED"),
];
const QUOTE_CAUSES: readonly Cause[] = [...BASE, appErrorCause("CONFLICT"), appErrorCause("QUOTE_NOT_READY")];
// custom-print has no route-level format check: the service decides, so only AppError causes apply.
const CUSTOM_PRINT_CAUSES: readonly Cause[] = [appErrorCause("NOT_FOUND"), appErrorCause("UNAUTHORIZED")];

function props(token: string): PageProps {
  return { params: Promise.resolve({ token }), searchParams: Promise.resolve({}) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notFound.mockImplementation(() => {
    throw NOT_FOUND_SENTINEL;
  });
  mocks.getQuotePreview.mockResolvedValue(null);
  mocks.getOrderStatusPreview.mockResolvedValue(null);
  mocks.getServerCapabilities.mockReturnValue({ customUploads: false });
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function arrange(cause: Cause, live: ReturnType<typeof vi.fn>, token: string): void {
  if (cause.kind === "bad-format") {
    // Real parser: the corpus token must be rejected by the format check itself.
    mocks.entityId.mockImplementation((value) => mocks.actualEntityId.current?.(value) ?? null);
    expect(mocks.actualEntityId.current?.(token)).toBeNull();
  } else if (cause.kind === "null-entity-id") {
    mocks.entityId.mockReturnValue(null);
  } else {
    mocks.entityId.mockReturnValue(ENTITY_ID);
    live.mockRejectedValue(appError(cause.code));
  }
}

async function expectNotFound(page: Page, cause: Cause, live: ReturnType<typeof vi.fn>, token: string) {
  mocks.notFound.mockClear();
  live.mockClear();
  arrange(cause, live, token);

  // notFound() throws the sentinel; any other branch would resolve to JSX or throw something else.
  await expect(page(props(token))).rejects.toBe(NOT_FOUND_SENTINEL);

  expect(mocks.notFound).toHaveBeenCalledTimes(1);
  expect(mocks.notFound).toHaveBeenCalledWith();
  if (cause.kind === "app-error") {
    expect(live).toHaveBeenCalledTimes(1);
  } else {
    expect(live).not.toHaveBeenCalled();
  }
}

describe("Property 6: token failures end at notFound", () => {
  it("uses at least 100 seeded tokens", () => {
    expect(tokens.length).toBeGreaterThanOrEqual(100);
  });

  const pages: ReadonlyArray<readonly [string, Page, readonly Cause[], () => ReturnType<typeof vi.fn>]> = [
    ["quote/[token]", QuotePage as unknown as Page, QUOTE_CAUSES, () => mocks.getLiveQuoteReview],
    ["orders/[token]", OrderStatusPage as unknown as Page, BASE, () => mocks.getLiveOrderStatus],
    [
      "custom-print/requests/[token]",
      CustomPrintRequestStatusPage as unknown as Page,
      CUSTOM_PRINT_CAUSES,
      () => mocks.getStatus,
    ],
  ];

  for (const [name, page, causes, live] of pages) {
    for (const cause of causes) {
      const label = cause.kind === "app-error" ? cause.code : cause.kind;
      it(`${name}: ${label} calls notFound() and renders no other branch`, async () => {
        for (const token of tokens) {
          try {
            await expectNotFound(page, cause, live(), token);
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new Error(`[${name} / ${label}] token ${JSON.stringify(token)}: ${reason}`, { cause: error });
          }
        }
      });
    }
  }

  it("does not treat non-matching AppError codes as not-found (control)", async () => {
    mocks.entityId.mockReturnValue(ENTITY_ID);
    mocks.getLiveOrderStatus.mockRejectedValue(appError("INTERNAL_ERROR"));

    const result = await (OrderStatusPage as unknown as Page)(props(tokens[0] ?? ""));

    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("not-found components take no props and render identical markup for every token", () => {
    const components: ReadonlyArray<readonly [string, ComponentType<Record<string, unknown>>]> = [
      ["quote/[token]/not-found", QuoteNotFound as unknown as ComponentType<Record<string, unknown>>],
      ["orders/[token]/not-found", OrderStatusNotFound as unknown as ComponentType<Record<string, unknown>>],
      ["app/not-found (custom-print requests)", RootNotFound as unknown as ComponentType<Record<string, unknown>>],
    ];

    for (const [name, Component] of components) {
      expect(Component.length, `${name} must declare no parameters`).toBe(0);

      window.history.replaceState(null, "", "/");
      const baseline = render(<Component />).container.innerHTML;
      cleanup();
      expect(baseline).not.toBe("");

      forEachCase(tokens, (token) => {
        window.history.replaceState(null, "", `/orders/${encodeURIComponent(token)}?token=${encodeURIComponent(token)}`);
        const { container } = render(
          <Component params={Promise.resolve({ token })} searchParams={Promise.resolve({ token })} token={token} />,
        );
        const html = container.innerHTML;
        cleanup();

        expect(html).toBe(baseline);
        if (token.length >= 8) expect(html).not.toContain(token);
      });
    }
  }, 60_000);
});
