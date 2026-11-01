import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import {
  getLiveQuoteReview,
  getQuotePreview,
} from "@/features/frontend-preview/quote";
import { getRouteAccessTokenEntityId } from "@/modules/shared/access-token";
import { isAppError } from "@/modules/shared/errors";
import { QuoteReview } from "./quote-review";

export const metadata: Metadata = {
  title: "Review quote · Niuva",
  description: "Tinjau scope, asumsi, masa berlaku, dan rincian quote Custom 3D Print Niuva.",
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

      return (
        <PublicShell functionalStatus="server-backed" scope="quote-review">
          <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
            <div className="max-w-2xl">
              <h1 className={`${type.display.className} text-balance`}>Quote belum dapat dimuat.</h1>
              <div className="mt-8">
                <StatusNotice
                  action={<NiuvaLink className="min-h-11" href={`/quote/${token}`} variant="outline">Coba lagi</NiuvaLink>}
                  description="Quote Anda tidak berubah. Muat ulang tautan ini sebentar lagi."
                  title="Quote sementara tidak dapat dibuka"
                  tone="error"
                />
              </div>
            </div>
          </main>
        </PublicShell>
      );
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
        <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
          <div aria-busy="true" aria-live="polite">
            <h1 className={`${type.display.className} max-w-[16em] text-balance`}>Rincian quote sedang disiapkan.</h1>
            <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">Keputusan baru bisa dibuat setelah scope dan harga quote tampil.</p>
            <div className="mt-8 h-24 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
              <div className="h-72 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
              <div className="h-72 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
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
