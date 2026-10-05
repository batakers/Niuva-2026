"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AGE_DECLARATION_LABEL, ageDeclarationSchema } from "@/modules/customer-auth/age-declaration";
export function InternalGoogleConsentForm({ returnTo }: { returnTo: string }) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ageError, setAgeError] = useState("");
  useEffect(() => {
    const reset = () => { busy.current = false; setPending(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const invalidAge = ageDeclarationSchema.safeParse(data.get("ageDeclaration")).error?.issues[0]?.message;
    setAgeError(invalidAge ?? "");
    if (invalidAge) {
      const field = form.elements.namedItem("ageDeclaration");
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    if (data.get("consent") !== "on") {
      setMessage("Setujui ketentuan dan pemberitahuan privasi yang tersedia.");
      const field = form.elements.namedItem("consent");
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    busy.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch(form.action, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(Array.from(new FormData(form), ([key, value]) => [key, String(value)])) });
      const result: unknown = await response.json();
      if (response.ok && result && typeof result === "object" && "destination" in result && typeof result.destination === "string" && result.destination.startsWith("/api/auth/google/start?")) { window.location.assign(result.destination); return; }
      setMessage(result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : "Persetujuan belum dapat disimpan. Coba lagi.");
    } catch { setMessage("Koneksi terputus. Coba lagi."); }
    busy.current = false; setPending(false);
  }
  const link = "inline-flex min-h-11 items-center rounded-lg text-primary underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring";
  return <form action="/api/auth/internal/google-consent" method="post" onSubmit={submit} aria-busy={pending} className="max-w-md space-y-5">
    <input type="hidden" name="returnTo" value={returnTo} />
    <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" required name="consent" className="mt-1 size-4 shrink-0 accent-primary focus-visible:ring-3 focus-visible:ring-ring" /><span>Saya menyetujui <a className={link} href="/internal-testing/policy?document=terms" target="_blank" rel="noopener noreferrer">Ketentuan Pengujian Internal</a> dan <a className={link} href="/internal-testing/policy?document=privacy" target="_blank" rel="noopener noreferrer">Pemberitahuan Privasi Pengujian</a>.</span></label>
    <div><label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" required name="ageDeclaration" className="mt-1 size-4 shrink-0 accent-primary focus-visible:ring-3 focus-visible:ring-ring" aria-invalid={Boolean(ageError)} aria-describedby={ageError ? "internal-age-error" : undefined} onChange={() => setAgeError("")} /><span>{AGE_DECLARATION_LABEL}</span></label>{ageError ? <p id="internal-age-error" className="mt-2 text-sm text-destructive">{ageError}</p> : null}</div>
    <Button className="min-h-12 w-full" type="submit" disabled={pending}>Setuju dan lanjutkan ke Google</Button>
    <p role="status" aria-live="polite" aria-atomic="true" className="min-h-5 text-sm text-muted-foreground">{pending ? "Menghubungkan ke Google…" : message}</p>
    <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className={link}>Kembali ke Login</Link>
  </form>;
}
