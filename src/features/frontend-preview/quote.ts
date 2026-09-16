import "server-only";

import { QuoteService } from "@/modules/quote/service";

export type QuotePreviewState =
  | "valid"
  | "expired"
  | "superseded"
  | "accepted"
  | "declined"
  | "loading";

export type QuotePreview = Readonly<{
  assumptions: readonly Readonly<{ label: string; value: string; detail: string }>[];
  currency: "IDR";
  expiresAt: string;
  lines: readonly Readonly<{ label: string; value: string; detail: string }>[];
  quoteNumber: string;
  requestReference: string;
  scope: readonly Readonly<{ label: string; value: string }>[];
  sentAt: string;
  total: string;
  version: number;
}>;

const supportedStates: readonly QuotePreviewState[] = [
  "valid",
  "expired",
  "superseded",
  "accepted",
  "declined",
  "loading",
];

function resolveState(requested: unknown): QuotePreviewState {
  return typeof requested === "string" && supportedStates.includes(requested as QuotePreviewState)
    ? requested as QuotePreviewState
    : "valid";
}

export async function getQuotePreview(input: Readonly<{
  preview: unknown;
  state: unknown;
  token: string;
}>): Promise<Readonly<{ quote: QuotePreview; state: QuotePreviewState }> | null> {
  const isExplicitDevelopmentPreview =
    process.env.NODE_ENV === "development" &&
    input.preview === "examples" &&
    input.token === "preview-quote";

  if (!isExplicitDevelopmentPreview) return null;

  const { exampleQuote } = await import("./quote-fixture");

  return {
    quote: exampleQuote,
    state: resolveState(input.state),
  };
}

const quoteDateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const quoteCurrencyFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

/** Public, token-authorized server projection for a sent quote. */
export async function getLiveQuoteReview(input: Readonly<{
  quoteId: string;
  token: string;
}>): Promise<Readonly<{ quote: QuotePreview; state: Exclude<QuotePreviewState, "loading"> }>> {
  const result = await new QuoteService().getPublicReview(input);

  return {
    quote: {
      assumptions: result.assumptions,
      currency: result.currency,
      expiresAt: quoteDateFormatter.format(result.expiresAt),
      lines: result.lines.map((line) => ({
        ...line,
        value: quoteCurrencyFormatter.format(BigInt(line.value)),
      })),
      quoteNumber: result.quoteNumber,
      requestReference: result.requestReference,
      scope: result.scope,
      sentAt: result.sentAt === null ? "Waktu kirim tidak tercatat" : quoteDateFormatter.format(result.sentAt),
      total: quoteCurrencyFormatter.format(BigInt(result.total)),
      version: result.version,
    },
    state: result.state,
  };
}
