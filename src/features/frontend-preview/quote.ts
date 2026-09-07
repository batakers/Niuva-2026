import "server-only";

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
