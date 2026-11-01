"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AGE_DECLARATION_LABEL } from "@/modules/customer-auth/age-declaration";
import type { CustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { useHydrated } from "./use-hydrated";

export function CustomerGoogleConsentForm({ returnTo, legal }: { returnTo: string; legal: CustomerAuthLegalDocuments }) {
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    const reset = () => { busy.current = false; setPending(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    busy.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch(form.action, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(Array.from(new FormData(form), ([key, value]) => [key, String(value)])) });
      const result: unknown = await response.json();
      if (response.ok && result && typeof result === "object" && "destination" in result && typeof result.destination === "string" && result.destination.startsWith("/api/auth/google/start?")) {
        window.location.assign(result.destination); return;
      }
      setMessage(result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : "Persetujuan belum dapat disimpan. Coba lagi.");
    } catch { setMessage("Koneksi terputus. Periksa jaringan Anda dan coba lagi."); }
    busy.current = false; setPending(false);
  }
  const link = "inline-flex min-h-11 items-center rounded-lg font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring";
  return <form action="/api/auth/google/consent" method="post" onSubmit={submit} data-enhanced={hydrated} aria-busy={pending} className="space-y-5">
    <input type="hidden" name="returnTo" value={returnTo} />
    <input type="hidden" name="termsVersion" value={legal.terms.version} />
    <input type="hidden" name="privacyVersion" value={legal.privacy.version} />
    <label className="flex min-h-11 items-start gap-3 text-ui leading-[1.55]"><input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0 accent-primary focus-visible:ring-3 focus-visible:ring-ring" /><span>Saya menyetujui <a className={link} href={legal.terms.href} target="_blank" rel="noopener noreferrer">Syarat Layanan</a> dan <a className={link} href={legal.privacy.href} target="_blank" rel="noopener noreferrer">Kebijakan Privasi</a> Niuva untuk akun Google yang saya pilih.</span></label>
    <label className="flex min-h-11 items-start gap-3 text-ui leading-[1.55]"><input type="checkbox" name="ageDeclaration" required className="mt-1 size-4 shrink-0 accent-primary focus-visible:ring-3 focus-visible:ring-ring" /><span>{AGE_DECLARATION_LABEL}</span></label>
    <Button type="submit" disabled={pending} className="min-h-12 w-full">{pending ? "Menyimpan persetujuan…" : "Setuju dan lanjutkan ke Google"}</Button>
    <p role="status" aria-live="polite" className="min-h-6 text-ui text-destructive">{message}</p>
  </form>;
}
