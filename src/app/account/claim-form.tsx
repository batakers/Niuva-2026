"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function claim(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: formData.get("kind"), token: formData.get("token") }),
      });
      if (!response.ok) {
        setMessage("Tautan tidak valid, sudah dipakai, atau tidak dapat diklaim. Periksa kembali tautan privat Anda.");
        return;
      }
      setMessage("Berhasil ditautkan ke akun Anda. Tautan lama sudah tidak berlaku.");
      router.refresh();
    } catch {
      setMessage("Klaim belum dapat diproses. Coba lagi nanti.");
    } finally {
      setPending(false);
    }
  }

  return <form action={claim} className="space-y-4">
    <div><label className="mb-2 block text-sm font-medium" htmlFor="claim-kind">Jenis pekerjaan</label>
      <select id="claim-kind" name="kind" className="min-h-11 w-full rounded-md border border-border bg-background px-3" required>
        <option value="B2B_INQUIRY">Project Brief</option><option value="CUSTOM_PRINT_REQUEST">MAKE</option>
      </select></div>
    <div><label className="mb-2 block text-sm font-medium" htmlFor="claim-token">Token dari tautan privat lama</label>
      <input id="claim-token" name="token" type="text" autoComplete="off" required minLength={32} className="min-h-11 w-full rounded-md border border-border bg-background px-3" /></div>
    <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-brand-950 px-5 text-white disabled:opacity-50">{pending ? "Memproses…" : "Tautkan ke akun"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
