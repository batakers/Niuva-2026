import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import {
  getLiveQuoteReview,
  getQuotePreview,
} from "@/features/frontend-preview/quote";
import { getRouteAccessTokenEntityId } from "@/modules/shared/access-token";
import { isAppError } from "@/modules/shared/errors";
import { QuoteReview } from "./quote-review";

export const metadata: Metadata = {
  title: "Review quote · Niuva",
  description: "Review scope, asumsi, masa berlaku, dan rincian quote custom print Niuva.",
  robots: { follow: false, index: false },
};

export default async function QuotePage({ params, searchParams }: PageProps<"/quote/[token]">) {
  await connection();
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const preview = await getQuotePreview({
    preview: query.preview,
    state: query.state,
    token,
  });

  if (preview === null) {
    const quoteId = getRouteAccessTokenEntityId(token);

    if (quoteId === null) {
      notFound();
    }

    const liveResult = await loadLiveQuoteReview(quoteId, token);
    if (!liveResult.ok) {
      if (
        isAppError(liveResult.error) &&
        ["CONFLICT", "NOT_FOUND", "QUOTE_NOT_READY", "UNAUTHORIZED"].includes(liveResult.error.code)
      ) {
        notFound();
      }

      throw liveResult.error;
    }

    return (
      <PublicShell functionalStatus="server-backed" scope="quote-review">
        <QuoteReview
          initialState={liveResult.value.state}
          isPreview={false}
          quote={liveResult.value.quote}
          token={token}
        />
      </PublicShell>
    );
  }

  if (preview.state === "loading") {
    return (
      <PublicShell scope="quote-review">
        <main className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16" id="main-content">
          <div aria-busy="true" aria-live="polite" className="max-w-3xl">
            <p className="text-sm font-medium text-brand-700">Memuat quote contoh</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Rincian quote sedang disiapkan.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Belum ada keputusan yang dapat dibuat sampai scope dan snapshot harga tersedia.
            </p>
            <div className="mt-10 grid gap-5 lg:grid-cols-12">
              <div className="h-64 animate-pulse rounded-xl bg-muted motion-reduce:animate-none lg:col-span-7" />
              <div className="h-64 animate-pulse rounded-xl bg-muted motion-reduce:animate-none lg:col-span-5" />
            </div>
          </div>
        </main>
      </PublicShell>
    );
  }

  return (
    <PublicShell scope="quote-review">
      <QuoteReview initialState={preview.state} isPreview quote={preview.quote} />
    </PublicShell>
  );
}

type LiveQuoteReviewResult =
  | Readonly<{ ok: true; value: Awaited<ReturnType<typeof getLiveQuoteReview>> }>
  | Readonly<{ error: unknown; ok: false }>;

async function loadLiveQuoteReview(quoteId: string, token: string): Promise<LiveQuoteReviewResult> {
  try {
    return { ok: true, value: await getLiveQuoteReview({ quoteId, token }) };
  } catch (error) {
    return { error, ok: false };
  }
}
