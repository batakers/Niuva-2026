"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ClaimForm() {
  const router = useRouter();
  const [message, setMessage] = useState<Readonly<{ ok: boolean; text: string }>>();
  const [pending, setPending] = useState(false);

  async function claim(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/account/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: formData.get("kind"), token: formData.get("token") }),
      });
      if (!response.ok) {
        setMessage({ ok: false, text: "Token tidak valid, sudah dipakai, atau tidak dapat ditautkan. Periksa kembali tautan privat Anda." });
        return;
      }
      setMessage({ ok: true, text: "Pengajuan sudah tertaut ke akun Anda. Tautan lama tidak berlaku lagi." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Pengajuan belum dapat ditautkan. Coba lagi nanti." });
    } finally {
      setPending(false);
    }
  }

  return <form action={claim} className="mt-5 space-y-4">
    {/* Only Custom 3D Print requests can be claimed; historical B2B work stays outside the account. */}
    <input name="kind" type="hidden" value="CUSTOM_PRINT_REQUEST" />
    <div className="space-y-2">
      <label className="block text-ui font-medium" htmlFor="claim-token">Token dari tautan privat lama</label>
      <input autoComplete="off" className={controlClass} id="claim-token" minLength={32} name="token" required type="text" />
    </div>
    <Button className="min-h-11 w-full" disabled={pending} type="submit" variant="outline">{pending ? "Memproses…" : "Tautkan ke akun"}</Button>
    {message ? (
      <p className={`text-ui font-normal leading-[1.55] ${message.ok ? "text-success" : "text-destructive"}`} role="status">{message.text}</p>
    ) : null}
  </form>;
}
