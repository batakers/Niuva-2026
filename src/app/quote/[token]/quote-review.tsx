"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { motionSystemClasses } from "@/design/motion";
import { typographySystemTokens as type } from "@/design/typography";
import { MoneySummary } from "@/components/niuva/money-summary";
import { StatusNotice, type StatusNoticeTone } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Button, buttonVariants } from "@/components/ui/button";
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
    description: "Keputusan diterima hanya di preview lokal. Belum ada pesanan, pembayaran, atau pesan yang dibuat.",
    title: "Quote ditandai diterima dalam preview.",
    tone: "success",
  },
  declined: {
    description: "Keputusan ditolak hanya di preview lokal. Quote dan pengajuan sungguhan tidak berubah.",
    title: "Quote ditandai ditolak dalam preview.",
    tone: "info",
  },
  expired: {
    description: "Masa berlaku tujuh hari sudah berakhir. Quote ini tidak dapat diterima; operator perlu mengirim versi baru.",
    title: "Quote sudah kedaluwarsa.",
    tone: "warning",
  },
  superseded: {
    description: "Versi ini sudah digantikan. Buka tautan quote terbaru agar scope dan harga yang Anda tinjau sesuai.",
    title: "Versi quote yang lebih baru tersedia.",
    tone: "warning",
  },
  valid: {
    description: "Periksa scope, asumsi, dan total sebelum membuat keputusan. Semua data di halaman ini adalah contoh.",
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
  const acceptRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const currentCopy = stateCopy[state];

  useEffect(() => {
    if (decision !== null) decisionRef.current?.focus();
  }, [decision]);

  useEffect(() => {
    if (state !== initialState) stateRef.current?.focus();
  }, [initialState, state]);

  // Cancelling the inline confirmation returns focus to the button that opened it.
  function cancelDecision() {
    const trigger = decision === "decline" ? declineRef.current : acceptRef.current;
    setDecision(null);
    queueMicrotask(() => trigger?.focus());
  }

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
      throw new Error("Kelanjutan quote belum dapat dibaca. Muat ulang halaman ini.");
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
            ? "Quote diterima dan pesanan dibuat."
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
                ? `Pesanan ${orderNumber ?? "Anda"} menunggu pembayaran. Lanjutkan pembayaran atau lihat status pesanan.`
                : "Pesanan sudah dibuat. Lanjutkan lewat halaman status pesanan."
              : orderNumber
                ? `Pesanan ${orderNumber} sudah dibuat. Simpan nomor ini bila perlu menghubungi Niuva.`
                : "Pesanan sudah dibuat. Hubungi Niuva dengan nomor quote ini untuk melihat statusnya."
            : state === "declined"
              ? "Hubungi Niuva bila scope perlu dibahas kembali."
              : state === "expired"
                ? "Masa berlaku quote sudah selesai. Minta operator mengirim versi terbaru bila masih ingin melanjutkan."
                : state === "superseded"
                  ? "Quote ini sudah digantikan oleh versi terbaru. Minta tautan quote terbaru dari Niuva."
                  : "Periksa scope, asumsi, dan total sebelum membuat keputusan."
      };

  return (
    <main className="overflow-x-hidden" data-quote-source={isPreview ? "preview" : "live"} data-quote-state={state} id="main-content">
      <div className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14">
        {isPreview ? (
          <StatusNotice aria-label="Preview quote" className="mb-8" description="Bukan quote pelanggan, dan keputusan di halaman ini tidak dikirim." role="note" size="compact" title="Preview lokal dengan data contoh." tone="info" />
        ) : null}
        <h1 className={`${type.display.className} max-w-[16em] text-balance`}>Tinjau yang dikunci sebelum menyetujui.</h1>
        <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">
          Isi quote ini sudah diperiksa operator dan tidak berubah selama masa berlakunya. Terima untuk membuat pesanan, atau tolak bila ada yang perlu dibahas ulang.
        </p>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-3">
          {[["Nomor quote", quote.quoteNumber], ["Versi", String(quote.version)], ["Berlaku sampai", quote.expiresAt]].map(([term, value]) => (
            <div className="bg-card px-5 py-4 sm:px-6" key={term}>
              <dt className="text-ui font-normal text-muted-foreground">{term}</dt>
              <dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto grid max-w-public items-start gap-8 px-5 pt-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="quote-scope-title">
            <h2 className="text-2xl font-medium tracking-[-0.015em]" id="quote-scope-title">Scope yang ditawarkan</h2>
            <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">
              Pengajuan {quote.requestReference}. Perubahan setelah quote dikirim dibuat sebagai versi baru.
            </p>
            <dl className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-2">
              {quote.scope.map((item) => (
                <div className="bg-card px-5 py-4 sm:px-6" key={item.label}>
                  <dt className="text-ui font-normal text-muted-foreground">{item.label}</dt>
                  <dd className="mt-1 text-lg font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="quote-assumptions-title">
            <h2 className="text-2xl font-medium tracking-[-0.015em]" id="quote-assumptions-title">Asumsi yang diverifikasi</h2>
            <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">
              Operator mencatat angka ini dari hasil slicing; harga di samping dihitung darinya.
            </p>
            <dl className="mt-5 divide-y divide-border rounded-[var(--radius-card)] border border-border bg-card">
              {quote.assumptions.map((item) => (
                <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:px-6" key={item.label}>
                  <dt className="text-ui font-normal text-muted-foreground">{item.label}</dt>
                  <dd>
                    <span className="block text-lg font-medium">{item.value}</span>
                    <span className="mt-1 block text-ui font-normal leading-[1.55] text-muted-foreground">{item.detail}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-ui font-normal leading-[1.55] text-muted-foreground">
              Quote dikunci saat dikirim. Masa berlaku tujuh hari dihitung dari waktu kirim.
            </p>
          </section>
        </div>

        <aside aria-label="Rincian dan keputusan quote" className="space-y-4 lg:sticky lg:top-24">
          <MoneySummary
            currency={quote.currency}
            headingLevel={2}
            lines={quote.lines}
            note="Total belum termasuk ongkir. Ongkir ditagih terpisah setelah paket final diukur."
            sourceStatus="ready"
            title="Rincian quote"
            total={quote.total}
            variant="quote"
          />

          <section aria-labelledby="quote-decision-title" className="rounded-[var(--radius-card)] border border-border bg-card p-5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-6" ref={stateRef} tabIndex={-1}>
            <h2 className="sr-only" id="quote-decision-title">Keputusan quote</h2>
            <StatusNotice description={effectiveCopy.description} title={effectiveCopy.title} tone={effectiveCopy.tone} />

            {actionError ? (
              <StatusNotice className="mt-4" enter size="compact" title={actionError} tone="error" />
            ) : null}

            {state === "valid" ? (
              <div className="mt-5">
                <p className="text-ui font-normal leading-[1.55] text-muted-foreground">
                  {isPreview
                    ? `Dikirim ${quote.sentAt}.`
                    : "Niuva memeriksa ulang masa berlaku dan versi quote sebelum menyimpan keputusan Anda."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button className="min-h-11" disabled={!hydrated || requestState === "submitting"} onClick={() => setDecision("accept")} ref={acceptRef} type="button">
                    Terima quote
                  </Button>
                  <Button className="min-h-11" disabled={!hydrated || requestState === "submitting"} onClick={() => setDecision("decline")} ref={declineRef} type="button" variant="outline">
                    Tolak quote
                  </Button>
                </div>
              </div>
            ) : null}

            {orderStatusToken ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {paymentRedirectUrl && paymentStatus === "WAITING_PAYMENT" ? <a className={buttonVariants({ className: "min-h-11" })} href={paymentRedirectUrl} rel="noreferrer" target="_blank">Buka pembayaran</a> : null}
                <NiuvaLink className="min-h-11" href={`/orders/${orderStatusToken}`} variant="outline">
                  Lihat status pesanan
                </NiuvaLink>
              </div>
            ) : null}
          </section>

          {decision !== null ? (
            <div
              aria-labelledby="quote-confirmation-title"
              className={`rounded-[var(--radius-card)] border border-warning-border/40 bg-warning-background p-5 text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-6 ${motionSystemClasses.enter}`}
              ref={decisionRef}
              onKeyDown={(event) => {
                if (event.key === "Escape" && requestState !== "submitting") cancelDecision();
              }}
              role="alertdialog"
              tabIndex={-1}
            >
              <h2 className="text-lg font-semibold" id="quote-confirmation-title">
                {decision === "accept" ? "Konfirmasi penerimaan quote" : "Konfirmasi penolakan quote"}
              </h2>
              <p className="mt-2 text-ui font-normal leading-[1.55]">
                {decision === "accept"
                  ? "Niuva memeriksa ulang masa berlaku, versi, dan harga quote, lalu membuat pesanan yang siap dibayar."
                  : "Quote yang ditolak tidak dapat diterima kembali. Bila kebutuhan berubah, operator membuat versi baru."}
              </p>
              <p className="mt-2 text-caption text-muted-foreground">{isPreview ? "Preview ini tidak mengirim keputusan atau mengubah pengajuan." : "Keputusan ini tercatat dan tidak dapat diubah untuk quote yang sama."}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button className="min-h-11" disabled={requestState === "submitting"} onClick={() => void confirmDecision()} type="button" variant={decision === "accept" ? "default" : "destructive"}>
                  {requestState === "submitting" ? "Menyimpan keputusan…" : decision === "accept" ? "Konfirmasi terima" : "Konfirmasi tolak"}
                </Button>
                <Button className="min-h-11" onClick={cancelDecision} type="button" variant="outline">
                  Kembali
                </Button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function readApiError(payload: unknown): string | undefined {
  if (payload === null || typeof payload !== "object") return undefined;
  const error = (payload as Record<string, unknown>).error;
  return typeof error === "string" && error.trim().length > 0 ? error : undefined;
}
