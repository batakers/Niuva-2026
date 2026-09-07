"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock3, FileLock2, ShieldCheck } from "lucide-react";

import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { MoneySummary } from "@/components/niuva/money-summary";
import { StatusNotice, type StatusNoticeTone } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import type { QuotePreview, QuotePreviewState } from "@/features/frontend-preview/quote";

type Decision = "accept" | "decline" | null;
type SettledQuoteState = Exclude<QuotePreviewState, "loading">;

const stateCopy: Record<SettledQuoteState, Readonly<{
  description: string;
  title: string;
  tone: StatusNoticeTone;
}>> = {
  accepted: {
    description: "Keputusan diterima hanya pada simulasi lokal. Belum ada order, pembayaran, atau pesan yang dibuat.",
    title: "Quote ditandai diterima dalam preview.",
    tone: "success",
  },
  declined: {
    description: "Keputusan ditolak hanya pada simulasi lokal. Quote dan request nyata tidak berubah.",
    title: "Quote ditandai ditolak dalam preview.",
    tone: "info",
  },
  expired: {
    description: "Masa berlaku tujuh hari sudah berakhir. Quote ini tidak dapat diterima dan memerlukan versi baru dari operator.",
    title: "Quote sudah kedaluwarsa.",
    tone: "warning",
  },
  superseded: {
    description: "Versi ini telah digantikan. Gunakan tautan quote terbaru agar scope dan harga yang ditinjau tetap konsisten.",
    title: "Versi quote yang lebih baru tersedia.",
    tone: "warning",
  },
  valid: {
    description: "Tinjau scope, asumsi, dan total sebelum membuat keputusan. Seluruh data di halaman ini adalah fixture development.",
    title: "Quote contoh siap ditinjau.",
    tone: "info",
  },
};

export function QuoteReview({
  initialState,
  quote,
}: Readonly<{
  initialState: SettledQuoteState;
  quote: QuotePreview;
}>) {
  const hydrated = useHydrated();
  const [decision, setDecision] = useState<Decision>(null);
  const [state, setState] = useState<SettledQuoteState>(initialState);
  const decisionRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const currentCopy = stateCopy[state];

  useEffect(() => {
    if (decision !== null) decisionRef.current?.focus();
  }, [decision]);

  useEffect(() => {
    if (state !== initialState) stateRef.current?.focus();
  }, [initialState, state]);

  function confirmDecision() {
    if (decision === null || state !== "valid") return;
    setState(decision === "accept" ? "accepted" : "declined");
    setDecision(null);
  }

  return (
    <main className="overflow-x-hidden" data-quote-state={state} id="main-content">
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-public gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-sm font-medium text-brand-700">Quote custom print</p>
            <h1 className={`${type.display.className} mt-4 max-w-4xl text-balance`}>
              Tinjau yang dikunci sebelum menyetujui.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Scope, asumsi operator, dan total ditampilkan sebagai satu snapshot yang tidak dihitung ulang oleh browser.
            </p>
          </div>

          <dl className="grid gap-4 rounded-xl bg-brand-950 p-6 text-neutral-50 sm:grid-cols-2 lg:col-span-5">
            <div>
              <dt className="text-xs text-neutral-300">Nomor quote</dt>
              <dd className="mt-1 font-mono text-sm font-medium">{quote.quoteNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-300">Versi</dt>
              <dd className="mt-1 font-mono text-sm font-medium">{quote.version}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-neutral-300">Berlaku sampai</dt>
              <dd className="mt-1 text-sm font-medium">{quote.expiresAt}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-public gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-10 lg:col-span-7">
            <div className="rounded-xl border border-info-border bg-info-background p-4 text-sm text-info">
              Preview lokal untuk review desain. Bukan quote customer dan tidak memberi akses ke data produksi.
            </div>

            <section aria-labelledby="quote-scope-title">
              <div className="flex items-center gap-3">
                <FileLock2 aria-hidden="true" className="size-5 text-brand-700" />
                <h2 className={`${type.heading.className}`} id="quote-scope-title">Scope yang ditawarkan</h2>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Request {quote.requestReference}. Perubahan setelah quote dikirim harus menjadi versi baru.
              </p>
              <dl className="mt-6 grid gap-x-8 gap-y-6 border-y border-border py-6 sm:grid-cols-2">
                {quote.scope.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="mt-1 text-base font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="quote-assumptions-title">
              <div className="flex items-center gap-3">
                <ShieldCheck aria-hidden="true" className="size-5 text-brand-700" />
                <h2 className={`${type.heading.className}`} id="quote-assumptions-title">Asumsi yang diverifikasi</h2>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {quote.assumptions.map((item) => (
                  <article className="rounded-xl border border-border bg-card p-5" key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-base font-semibold">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="flex gap-3 border-l-2 border-brand-300 pl-4 text-sm leading-6 text-muted-foreground">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-700" />
              <p>Quote dikunci saat dikirim. Masa berlaku tujuh hari dihitung dari waktu kirim, bukan dari umur draft.</p>
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-5 lg:sticky lg:top-8 lg:self-start" aria-label="Rincian dan keputusan quote">
            <MoneySummary
              currency={quote.currency}
              description="Nilai sudah diformat dari snapshot quote contoh. Browser tidak menghitung subtotal atau total."
              lines={quote.lines}
              note="Fixture development Pricing v1. Ongkir custom dihitung setelah pengukuran paket final."
              sourceStatus="ready"
              title="Rincian quote"
              total={quote.total}
              variant="quote"
            />

            <div className="rounded-xl border border-border bg-card p-5 shadow-card" ref={stateRef} tabIndex={-1}>
              <StatusNotice
                description={currentCopy.description}
                title={currentCopy.title}
                tone={currentCopy.tone}
              />

              {state === "valid" ? (
                <div className="mt-5">
                  <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-700" />
                    <p>Dikirim {quote.sentAt}. Keputusan nyata selalu diverifikasi ulang oleh server.</p>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setDecision("accept")} type="button">
                      Terima quote
                    </Button>
                    <Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setDecision("decline")} type="button" variant="outline">
                      Tolak quote
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {decision !== null ? (
              <div
                aria-labelledby="quote-confirmation-title"
                className="rounded-xl border border-warning-border bg-warning-background p-5 text-warning focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                ref={decisionRef}
                role="alertdialog"
                tabIndex={-1}
              >
                <h2 className="text-base font-semibold" id="quote-confirmation-title">
                  {decision === "accept" ? "Konfirmasi penerimaan quote" : "Konfirmasi penolakan quote"}
                </h2>
                <p className="mt-2 text-sm leading-6">
                  {decision === "accept"
                    ? "Pada alur nyata, server akan memeriksa token, expiry, versi terbaru, dan snapshot harga sebelum membuat order payable."
                    : "Pada alur nyata, quote yang ditolak tidak dapat diterima kembali. Operator perlu membuat versi baru bila scope berubah."}
                </p>
                <p className="mt-2 text-xs">Preview ini tidak mengirim keputusan atau mengubah request.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button className="min-h-11 cursor-pointer" onClick={confirmDecision} type="button" variant={decision === "accept" ? "default" : "destructive"}>
                    {decision === "accept" ? "Konfirmasi terima" : "Konfirmasi tolak"}
                  </Button>
                  <Button className="min-h-11 cursor-pointer" onClick={() => setDecision(null)} type="button" variant="outline">
                    Kembali
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
