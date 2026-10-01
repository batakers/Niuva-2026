"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { emailSchema, passwordSchema } from "@/modules/customer-auth/password-validation";
export type AuthFormMode = "login" | "register" | "forgot-password" | "reset-password" | "verify" | "resend";
type Legal = { terms: { href: string; version: string }; privacy: { href: string; version: string } };
export function CustomerEmailForm({ mode, returnTo, available = true, token, legal }: { mode: AuthFormMode; returnTo: string; available?: boolean; token?: string; legal?: Legal | null }) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    // Keep native validation for no-JS forms; use translated field validation once mounted.
    if (formRef.current) formRef.current.noValidate = true;
    const reset = () => { busy.current = false; setPending(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  const path = mode === "verify" ? "verify" : mode;
  function validateField(name: string, value: string, form: HTMLFormElement): string | undefined {
    if (name === "email") return emailSchema.safeParse(value).error?.issues[0]?.message;
    if (name === "name" && !value.trim()) return "Masukkan nama lengkap Anda.";
    if (name === "password") return mode === "login" ? (!value ? "Masukkan password Anda." : undefined) : passwordSchema.safeParse(value).error?.issues[0]?.message;
    if (name === "confirmPassword" && value !== new FormData(form).get("password")) return "Konfirmasi password belum cocok.";
    if (name === "consent" && new FormData(form).get("consent") !== "on") return "Setujui Syarat Layanan dan Kebijakan Privasi.";
  }
  function focusError(fields: Record<string, string>) {
    const name = Object.keys(fields)[0];
    const field = name ? formRef.current?.elements.namedItem(name) : null;
    if (field instanceof HTMLElement) field.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !available) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields: Record<string, string> = {};
    for (const [name, value] of data) {
      const error = validateField(name, String(value), form);
      if (error) fields[name] = error;
    }
    if (mode === "register" && data.get("consent") !== "on") fields.consent = "Setujui Syarat Layanan dan Kebijakan Privasi.";
    setErrors(fields); setMessage("");
    if (Object.keys(fields).length) { focusError(fields); return; }
    busy.current = true; setPending(true);
    try {
      const response = await fetch(form.action, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(Array.from(data, ([key, value]) => [key, String(value)])) });
      const result: unknown = await response.json();
      if (!result || typeof result !== "object") throw new Error("invalid response");
      if (response.ok && "destination" in result && typeof result.destination === "string" && result.destination.startsWith("/") && !result.destination.startsWith("//")) { window.location.assign(result.destination); return; }
      const nextErrors: Record<string, string> = {};
      if ("fields" in result && result.fields && typeof result.fields === "object") for (const [key, value] of Object.entries(result.fields)) if (typeof value === "string") nextErrors[key] = value;
      setErrors(nextErrors); focusError(nextErrors);
      setMessage("message" in result && typeof result.message === "string" ? result.message : "Permintaan belum selesai. Coba lagi.");
    } catch { setMessage("Koneksi terputus. Periksa jaringan Anda dan coba lagi."); }
    busy.current = false; setPending(false);
  }
  function field(name: string, label: string, type = "text", autoComplete?: string) {
    const password = type === "password";
    return <div key={name}>
      <label htmlFor={`auth-${name}`} className="mb-2 block text-sm font-medium">{label}</label>
      <div className="relative">
        <Input id={`auth-${name}`} name={name} type={password && visible[name] ? "text" : type} autoComplete={autoComplete} required maxLength={name === "email" ? 254 : name === "name" ? 120 : 128} minLength={password && mode !== "login" ? 15 : undefined} className={`min-h-12 bg-card ${password ? "pr-12" : ""}`} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `auth-${name}-error` : name === "password" && mode !== "login" ? "password-guidance" : undefined}
          onChange={event => { if (errors[name]) { const error = validateField(name, event.target.value, event.target.form!); setErrors(current => ({ ...current, [name]: error ?? "" })); } }}
          onBlur={event => { const error = validateField(name, event.target.value, event.target.form!); setErrors(current => ({ ...current, [name]: error ?? "" })); }} />
        {password ? <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={`${visible[name] ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`} aria-pressed={Boolean(visible[name])} onClick={() => setVisible(current => ({ ...current, [name]: !current[name] }))}>{visible[name] ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button> : null}
      </div>
      {errors[name] ? <p id={`auth-${name}-error`} className="mt-2 text-sm text-destructive">{errors[name]}</p> : null}
      {name === "password" && mode !== "login" ? <p id="password-guidance" className="mt-2 text-sm text-muted-foreground">15–128 karakter. Spasi diperbolehkan.</p> : null}
    </div>;
  }
  const labels: Record<AuthFormMode, string> = { login: "Masuk", register: "Buat akun", "forgot-password": "Kirim tautan pemulihan", "reset-password": "Simpan password baru", verify: "Verifikasi email", resend: "Kirim ulang email verifikasi" };
  return <form ref={formRef} method="post" action={`/api/auth/email/${path}`} onSubmit={submit} aria-busy={pending} className="space-y-5">
    <input type="hidden" name="returnTo" value={returnTo} />
    {token ? <input type="hidden" name="token" value={token} /> : null}
    {mode === "register" ? field("name", "Nama lengkap", "text", "name") : null}
    {["login", "register", "forgot-password"].includes(mode) ? field("email", "Email", "email", "email") : null}
    {["login", "register", "reset-password"].includes(mode) ? field("password", mode === "reset-password" ? "Password baru" : "Password", "password", mode === "login" ? "current-password" : "new-password") : null}
    {["register", "reset-password"].includes(mode) ? field("confirmPassword", "Konfirmasi password", "password", "new-password") : null}
    {mode === "login" ? <div className="flex flex-wrap items-center justify-between gap-x-4"><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" name="remember" className="size-4 accent-primary focus-visible:ring-3 focus-visible:ring-ring" />Ingat saya</label><a className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring" href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}>Lupa password?</a></div> : null}
    {mode === "register" ? <div><label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-muted-foreground"><input id="auth-consent" type="checkbox" name="consent" required disabled={!legal} className="mt-1 size-4 shrink-0 accent-primary focus-visible:ring-3 focus-visible:ring-ring" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "auth-consent-error" : undefined} /><span>Saya menyetujui {legal ? <><a className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring" href={legal.terms.href} target="_blank" rel="noopener noreferrer">Syarat Layanan</a> dan <a className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring" href={legal.privacy.href} target="_blank" rel="noopener noreferrer">Kebijakan Privasi</a></> : "Syarat Layanan dan Kebijakan Privasi (belum tersedia)"} Niuva.</span></label>{errors.consent ? <p id="auth-consent-error" className="mt-2 text-sm text-destructive">{errors.consent}</p> : null}</div> : null}
    <Button type="submit" disabled={!available || pending} variant={mode === "resend" ? "outline" : "default"} className="min-h-12 w-full">{labels[mode]}</Button>
    <p role="status" aria-live="polite" aria-atomic="true" className="min-h-5 text-sm text-muted-foreground">{pending ? "Memproses…" : message}</p>
  </form>;
}
