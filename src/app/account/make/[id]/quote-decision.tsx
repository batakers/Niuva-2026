"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuoteDecision({ requestId, quoteId }: Readonly<{ requestId: string; quoteId: string }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string>();
  async function decide(decision: "accept" | "decline") {
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/account/make/${requestId}/quotes/${quoteId}/decision`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage("Keputusan belum dapat disimpan. Quote mungkin kedaluwarsa atau sudah diganti; muat ulang halaman.");
        return;
      }
      if (decision === "accept") {
        const result = body as { payment?: { redirectUrl?: string }; orderNumber?: string };
        setPaymentUrl(result.payment?.redirectUrl);
        setMessage(`Quote diterima. Order ${result.orderNumber ?? "baru"} tercatat di akun.`);
      } else setMessage("Quote ditolak. Operator dapat menindaklanjuti secara manual.");
      router.refresh();
    } catch { setMessage("Koneksi gagal. Coba lagi setelah memeriksa status quote."); }
    finally { setPending(false); }
  }
  return <div className="mt-5 space-y-3"><div className="flex flex-wrap gap-3">
    <button className="min-h-11 rounded-md bg-brand-950 px-5 text-white disabled:opacity-50" disabled={pending} onClick={() => void decide("accept")} type="button">Terima quote</button>
    <button className="min-h-11 rounded-md border border-border px-5 disabled:opacity-50" disabled={pending} onClick={() => void decide("decline")} type="button">Tolak quote</button>
  </div>{message && <p role="status" className="text-sm">{message}</p>}{paymentUrl && <a className="underline underline-offset-4" href={paymentUrl} rel="noopener noreferrer" referrerPolicy="no-referrer">Lanjutkan pembayaran</a>}</div>;
}
