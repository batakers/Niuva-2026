"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock3, FileLock2, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { MoneySummary } from "@/components/niuva/money-summary";
import { StatusNotice, type StatusNoticeTone } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { AuLink } from "@/components/ui/AuLink";
import { Button } from "@/components/ui/button";
import type { QuotePreview, QuotePreviewState } from "@/features/frontend-preview/quote";

type Decision = "accept" | "decline" | null;
type SettledQuoteState = Exclude<QuotePreviewState, "loading">;
type DecisionRequestState = "idle" | "submitting" | "error";

const quoteOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "WAITING_FOR_APPROVAL",
  "WAITING_PAYMENT",
  "IN_PRODUCTION",
  "FINISHING_QC",
  "WAITING_SHIPPING_PAYMENT",
]);
type QuoteOrderStatus = z.infer<typeof quoteOrderStatusSchema>;
const quoteAcceptanceResponseSchema = z.object({
  orderAccessToken: z.string().min(1).optional(),
  orderNumber: z.string().min(1),
  payment: z.object({
    provider: z.string().min(1).optional(),
    redirectUrl: z.url({ protocol: /^https?$/ }).optional(),
    token: z.string().min(1).optional(),
  }).optional(),
  status: quoteOrderStatusSchema.optional(),
});
const quoteRecoveryStorageSchema = z.object({
  orderNumber: z.string().min(1),
  orderStatusToken: z.string().min(1),
  paymentRedirectUrl: z.url({ protocol: /^https?$/ }).optional(),
  quoteNumber: z.string().min(1),
  status: quoteOrderStatusSchema,
});
const QUOTE_RECOVERY_STORAGE_KEY = "niuva.quote.recovery";

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
  isPreview,
  quote,
  token,
}: Readonly<{
  initialState: SettledQuoteState;
  isPreview: boolean;
  quote: QuotePreview;
  token?: string;
}>) {
  const hydrated = useHydrated();
  const [decision, setDecision] = useState<Decision>(null);
  const [state, setState] = useState<SettledQuoteState>(initialState);
  const [requestState, setRequestState] = useState<DecisionRequestState>("idle");
  const [actionError, setActionError] = useState<string>();
  const [orderStatusToken, setOrderStatusToken] = useState<string>();
  const [orderNumber, setOrderNumber] = useState<string>();
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string>();
  const [paymentStatus, setPaymentStatus] = useState<QuoteOrderStatus>("WAITING_PAYMENT");
  const decisionRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const currentCopy = stateCopy[state];

  useEffect(() => {
    if (decision !== null) decisionRef.current?.focus();
  }, [decision]);

  useEffect(() => {
    if (state !== initialState) stateRef.current?.focus();
  }, [initialState, state]);

  async function confirmDecision() {
    if (decision === null || state !== "valid" || requestState === "submitting") return;

    if (isPreview) {
      setState(decision === "accept" ? "accepted" : "declined");
      setDecision(null);
      return;
    }

    if (token === undefined) {
      setActionError("Tautan keputusan tidak lengkap. Minta tautan quote terbaru dari Niuva.");
      setRequestState("error");
      return;
    }

    setRequestState("submitting");
    setActionError(undefined);

    try {
      const response = await fetch(
        `/api/quote/${encodeURIComponent(token)}/${decision === "accept" ? "accept" : "decline"}`,
        { headers: { "content-type": "application/json" }, method: "POST" },
      );

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiError(payload) ?? "Keputusan quote belum dapat disimpan.");
      }
      if (payload === null || typeof payload !== "object") {
        throw new Error("Keputusan quote belum dapat disimpan.");
      }

      if (decision === "accept") {
        applyAcceptedPayload(payload);
      }
      if (decision === "decline") setState("declined");
      setDecision(null);
      setRequestState("idle");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Keputusan quote belum dapat disimpan.");
      setRequestState("error");
    }
  }

  const applyAcceptedPayload = useCallback((payload: unknown) => {
    const parsed = quoteAcceptanceResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Respons kelanjutan quote tidak valid.");
    }

    setOrderNumber(parsed.data.orderNumber);
    if (parsed.data.orderAccessToken !== undefined) {
      setOrderStatusToken(parsed.data.orderAccessToken);
    }
    const nextStatus = parsed.data.status ?? "WAITING_PAYMENT";
    setPaymentStatus(nextStatus);
    const nextPaymentUrl = parsed.data.payment?.redirectUrl;
    setPaymentRedirectUrl(nextPaymentUrl);
    setState("accepted");

    if (parsed.data.orderAccessToken !== undefined) {
      try {
        window.sessionStorage.setItem(QUOTE_RECOVERY_STORAGE_KEY, JSON.stringify({
          orderNumber: parsed.data.orderNumber,
          orderStatusToken: parsed.data.orderAccessToken,
          ...(nextPaymentUrl === undefined ? {} : { paymentRedirectUrl: nextPaymentUrl }),
          quoteNumber: quote.quoteNumber,
          status: nextStatus,
        }));
      } catch {
        // The current response remains usable without session storage.
      }
    }
  }, [quote.quoteNumber]);

  const recoverAcceptedQuote = useCallback(async () => {
    if (token === undefined) return;

    try {
      const response = await fetch(
        `/api/quote/${encodeURIComponent(token)}/accept`,
        { headers: { "content-type": "application/json" }, method: "POST" },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiError(payload) ?? "Kelanjutan pembayaran quote belum dapat dipulihkan.");
      }
      applyAcceptedPayload(payload);
      setRequestState("idle");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Kelanjutan pembayaran quote belum dapat dipulihkan.");
      setRequestState("error");
    }
  }, [applyAcceptedPayload, token]);

  useEffect(() => {
    if (isPreview || initialState !== "accepted" || token === undefined) return;

    try {
      const stored = window.sessionStorage.getItem(QUOTE_RECOVERY_STORAGE_KEY);
      if (stored !== null) {
        const parsed = quoteRecoveryStorageSchema.safeParse(JSON.parse(stored) as unknown);
        if (parsed.success && parsed.data.quoteNumber === quote.quoteNumber) {
          queueMicrotask(() => {
            setOrderNumber(parsed.data.orderNumber);
            setOrderStatusToken(parsed.data.orderStatusToken);
            setPaymentRedirectUrl(parsed.data.paymentRedirectUrl);
            setPaymentStatus(parsed.data.status);
          });
          return;
        }
      }
    } catch {
      // The route-bound token remains the recovery source when browser storage
      // is unavailable or contains malformed data.
    }

    queueMicrotask(() => {
      setRequestState("submitting");
      void recoverAcceptedQuote();
    });
  }, [initialState, isPreview, quote.quoteNumber, recoverAcceptedQuote, token]);

  const effectiveCopy = isPreview
    ? currentCopy
    : {
        ...currentCopy,
        title:
          state === "accepted"
            ? "Quote diterima dan order dibuat."
            : state === "declined"
              ? "Quote ditolak."
              : state === "expired"
                ? "Quote sudah kedaluwarsa."
                : state === "superseded"
                  ? "Versi quote terbaru tersedia."
                  : "Quote siap ditinjau.",
        description:
          state === "accepted"
            ? orderStatusToken
              ? paymentRedirectUrl && paymentStatus === "WAITING_PAYMENT"
                ? `Quote sudah diterima dan order ${orderNumber ?? "payable"} menunggu pembayaran. Lanjutkan pembayaran atau buka status order.`
                : "Quote sudah diterima dan order payable dibuat oleh server. Lanjutkan melalui tautan status order."
              : orderNumber
                ? `Quote sudah diterima dan order payable dibuat oleh server. Nomor order ${orderNumber} tercatat; simpan nomor ini bila perlu menghubungi Niuva.`
                : "Quote sudah diterima dan order payable dibuat oleh server. Jika membutuhkan status order, hubungi Niuva dengan nomor quote ini."
            : state === "declined"
              ? "Quote ditandai ditolak. Hubungi Niuva jika scope perlu dibahas kembali."
              : state === "expired"
                ? "Masa berlaku quote sudah selesai. Minta operator mengirim versi quote terbaru bila masih ingin melanjutkan."
                : state === "superseded"
                  ? "Quote ini sudah digantikan oleh versi terbaru. Minta tautan quote terbaru dari Niuva."
                  : "Tinjau scope, asumsi, dan total dari snapshot yang disimpan server sebelum membuat keputusan."
      };

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
            <div className={`${isPreview ? "border-info-border bg-info-background text-info" : "border-success-border bg-success-background text-success"} rounded-xl border p-4 text-sm`}>
              {isPreview
                ? "Preview lokal untuk review desain. Bukan quote customer dan tidak memberi akses ke data produksi."
                : "Projection server terotorisasi token. Nilai di halaman ini berasal dari snapshot quote yang dikunci saat dikirim."}
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
              description={isPreview ? "Nilai sudah diformat dari snapshot quote contoh. Browser tidak menghitung subtotal atau total." : "Nilai diformat dari snapshot quote server. Browser tidak menghitung subtotal atau total."}
              lines={quote.lines}
              note={isPreview ? "Fixture development Pricing v1. Ongkir custom dihitung setelah pengukuran paket final." : "Pricing dan ongkir custom mengikuti verifikasi operator; ongkir dihitung setelah pengukuran paket final."}
              sourceStatus="ready"
              title="Rincian quote"
              total={quote.total}
              variant="quote"
            />

            <div className="rounded-xl border border-border bg-card p-5 shadow-card" ref={stateRef} tabIndex={-1}>
              <StatusNotice description={effectiveCopy.description} title={effectiveCopy.title} tone={effectiveCopy.tone} />

              {actionError ? (
                <p className="mt-4 rounded-lg border border-destructive-border bg-destructive-background p-3 text-sm leading-6 text-destructive" role="alert">
                  {actionError}
                </p>
              ) : null}

              {state === "valid" && !isPreview ? (
                <div className="mt-5">
                  <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-700" />
                    <p>Keputusan diperiksa server dengan token, expiry, versi terbaru, dan snapshot harga.</p>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Button className="min-h-11 cursor-pointer" disabled={!hydrated || requestState === "submitting"} onClick={() => setDecision("accept")} type="button">
                      Terima quote
                    </Button>
                    <Button className="min-h-11 cursor-pointer" disabled={!hydrated || requestState === "submitting"} onClick={() => setDecision("decline")} type="button" variant="outline">
                      Tolak quote
                    </Button>
                  </div>
                </div>
              ) : state === "valid" ? (
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

              {orderStatusToken ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {paymentRedirectUrl && paymentStatus === "WAITING_PAYMENT" ? <a className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={paymentRedirectUrl} rel="noreferrer" target="_blank">Buka pembayaran</a> : null}
                  <AuLink className="min-h-11" href={`/orders/${orderStatusToken}`} variant="outline">
                    Lihat status order
                  </AuLink>
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
                <p className="mt-2 text-xs">{isPreview ? "Preview ini tidak mengirim keputusan atau mengubah request." : "Keputusan akan dicatat oleh server dan tidak dapat diulang pada quote yang sama."}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button className="min-h-11 cursor-pointer" disabled={requestState === "submitting"} onClick={() => void confirmDecision()} type="button" variant={decision === "accept" ? "default" : "destructive"}>
                    {requestState === "submitting" ? "Menyimpan keputusan…" : decision === "accept" ? "Konfirmasi terima" : "Konfirmasi tolak"}
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

function readApiError(payload: unknown): string | undefined {
  if (payload === null || typeof payload !== "object") return undefined;
  const error = (payload as Record<string, unknown>).error;
  return typeof error === "string" && error.trim().length > 0 ? error : undefined;
}
