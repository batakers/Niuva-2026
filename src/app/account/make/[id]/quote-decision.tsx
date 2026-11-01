"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button, buttonVariants } from "@/components/ui/button";

type Decision = "accept" | "decline";
type Result = Readonly<{ ok: boolean; paymentUrl?: string; text: string }>;

/**
 * Accept/decline for the latest sent quote. It stays mounted after the decision so the
 * result and payment link survive the refresh that removes the decision buttons.
 */
export function QuoteDecision({ decidable, requestId, quoteId }: Readonly<{ decidable: boolean; requestId: string; quoteId: string }>) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>();
  const acceptRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (decision !== null) confirmRef.current?.focus();
  }, [decision]);

  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  // Cancelling the confirmation returns focus to the button that opened it.
  function cancel() {
    const trigger = decision === "decline" ? declineRef.current : acceptRef.current;
    setDecision(null);
    queueMicrotask(() => trigger?.focus());
  }

  async function confirm() {
    if (decision === null || pending) return;
    setPending(true);
    try {
      const response = await fetch(`/api/account/make/${requestId}/quotes/${quoteId}/decision`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setResult({ ok: false, text: "Keputusan belum dapat disimpan. Quote mungkin kedaluwarsa atau sudah diganti; muat ulang halaman." });
        setDecision(null);
        return;
      }
      if (decision === "accept") {
        const accepted = body as { payment?: { redirectUrl?: string }; orderNumber?: string };
        setResult({
          ok: true,
          ...(accepted.payment?.redirectUrl?.startsWith("https://") ? { paymentUrl: accepted.payment.redirectUrl } : {}),
          text: `Quote diterima. Pesanan ${accepted.orderNumber ?? "baru"} tercatat di akun dan menunggu pembayaran.`,
        });
      } else {
        setResult({ ok: true, text: "Quote ditolak. Operator dapat menyiapkan versi baru bila kebutuhan berubah." });
      }
      setDecision(null);
      router.refresh();
    } catch {
      setResult({ ok: false, text: "Koneksi gagal. Periksa status quote, lalu coba lagi." });
      setDecision(null);
    } finally {
      setPending(false);
    }
  }

  if (!decidable && result === undefined) return null;

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      {decidable && result?.ok !== true ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button className="min-h-11" disabled={!hydrated || pending} onClick={() => setDecision("accept")} ref={acceptRef} type="button">Terima quote</Button>
          <Button className="min-h-11" disabled={!hydrated || pending} onClick={() => setDecision("decline")} ref={declineRef} type="button" variant="outline">Tolak quote</Button>
        </div>
      ) : null}

      {decision !== null ? (
        <div
          aria-labelledby="account-quote-confirmation-title"
          className="rounded-[var(--radius-card)] border border-warning-border bg-warning-background p-5 text-warning focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) cancel();
          }}
          ref={confirmRef}
          role="alertdialog"
          tabIndex={-1}
        >
          <h4 className="text-lg font-semibold" id="account-quote-confirmation-title">
            {decision === "accept" ? "Konfirmasi penerimaan quote" : "Konfirmasi penolakan quote"}
          </h4>
          <p className="mt-2 text-ui font-normal leading-[1.55]">
            {decision === "accept"
              ? "Niuva memeriksa ulang masa berlaku, versi, dan harga quote, lalu membuat pesanan yang siap dibayar."
              : "Quote yang ditolak tidak dapat diterima kembali. Bila kebutuhan berubah, operator membuat versi baru."}
          </p>
          <p className="mt-2 text-caption">Keputusan ini tercatat dan tidak dapat diubah untuk quote yang sama.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="min-h-11" disabled={pending} onClick={() => void confirm()} type="button" variant={decision === "accept" ? "default" : "destructive"}>
              {pending ? "Menyimpan keputusan…" : decision === "accept" ? "Konfirmasi terima" : "Konfirmasi tolak"}
            </Button>
            <Button className="min-h-11" disabled={pending} onClick={cancel} type="button" variant="outline">Kembali</Button>
          </div>
        </div>
      ) : null}

      {result ? (
        <p
          className={`rounded-[var(--radius-control)] border p-3 text-ui font-normal leading-[1.55] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${result.ok ? "border-success-border bg-success-background text-success" : "border-destructive-border bg-destructive-background text-destructive"}`}
          ref={resultRef}
          role={result.ok ? "status" : "alert"}
          tabIndex={-1}
        >
          {result.text}
        </p>
      ) : null}
      {result?.paymentUrl ? (
        <a className={buttonVariants({ className: "min-h-11" })} href={result.paymentUrl} referrerPolicy="no-referrer" rel="noopener noreferrer">Lanjutkan pembayaran</a>
      ) : null}
    </div>
  );
}
