"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { privacyOwnerSchema, privacyRequestSchema, isPrivacyResponseUrl } from "@/modules/customer-privacy/validation";
import { useHydrated } from "./use-hydrated";

export type PrivacyField = Readonly<{ name: string; label: string; kind?: "textarea" | "select" | "checkbox" | "date"; required?: boolean; help?: string; defaultValue?: string; options?: readonly { value: string; label: string }[] }>;
export const privacyControlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";
export function PrivacyForm({ action, mode, fields = [], hidden = {}, label, prefix, danger = false, initialErrors = {} }: Readonly<{
  action: string; mode: "email" | "request" | "owner" | "export" | "close"; fields?: readonly PrivacyField[]; hidden?: Readonly<Record<string, string>>; label: string; prefix: string; danger?: boolean; initialErrors?: Readonly<Record<string, string>>;
}>) {
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>(initialErrors);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { const restore = () => { busy.current = false; setPending(false); }; window.addEventListener("pageshow", restore); return () => window.removeEventListener("pageshow", restore); }, []);
  useEffect(() => { const field = Object.keys(initialErrors)[0]; if (field) (formRef.current?.elements.namedItem(field) as HTMLElement | null)?.focus(); }, [initialErrors]);
  function focusError(fieldErrors: Readonly<Record<string, string>>) {
    const field = Object.keys(fieldErrors)[0];
    if (field) (formRef.current?.elements.namedItem(field) as HTMLElement | null)?.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (busy.current) { event.preventDefault(); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    const schema = mode === "request" ? privacyRequestSchema : mode === "owner" ? privacyOwnerSchema : null;
    if (schema) {
      const parsed = schema.safeParse(Object.fromEntries(data));
      if (!parsed.success) {
        event.preventDefault(); const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
        setErrors(fieldErrors); setMessage("Periksa kolom yang ditandai."); focusError(fieldErrors); return;
      }
    }
    busy.current = true; setPending(true); setErrors({}); setMessage("");
    // Permanent closure keeps the native POST/303 boundary. All other forms
    // progressively enhance the same URL-encoded contract.
    if (mode === "close") return;
    event.preventDefault();
    try {
      const response = await fetch(action, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams([...data].map(([key, value]) => [key, String(value)])) });
      if (mode === "export" && response.ok && response.headers.get("content-disposition")) {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a"); link.href = url; link.download = "niuva-customer-data-v1.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage("Salinan data disiapkan untuk diunduh. Tautan konfirmasi ini sudah digunakan.");
      } else {
        const result: unknown = await response.json();
        if (!result || typeof result !== "object") throw new Error("invalid response");
        const record = result as Record<string, unknown>;
        if (response.ok && isPrivacyResponseUrl(record.url)) { window.location.assign(record.url); return; }
        const fieldErrors: Record<string, string> = {};
        if (record.fields && typeof record.fields === "object") for (const [key, value] of Object.entries(record.fields)) if (typeof value === "string") fieldErrors[key] = value;
        setErrors(fieldErrors); focusError(fieldErrors); setMessage(typeof record.message === "string" ? record.message : "Tindakan gagal diproses.");
      }
    } catch { setMessage("Koneksi terputus atau respons tidak valid. Periksa status sebelum mencoba lagi."); }
    busy.current = false; setPending(false);
  }
  return <form ref={formRef} action={action} method="post" onSubmit={submit} data-enhanced={hydrated} className="space-y-5" aria-busy={pending}>
    {Object.entries(hidden).map(([name, value]) => <input key={name} name={name} type="hidden" value={value} />)}
    {fields.map(field => {
      const id = `${prefix}-${field.name}`;
      const error = errors[field.name];
      const common = { id, name: field.name, required: field.required, "aria-invalid": Boolean(error), "aria-describedby": `${id}-help ${error ? `${id}-error` : ""}`, className: privacyControlClass, defaultValue: field.defaultValue };
      return <div key={field.name}>
        {field.kind === "checkbox" ? <label className="flex min-h-11 items-start gap-3 py-3" htmlFor={id}><input type="checkbox" id={id} name={field.name} required={field.required} defaultChecked={field.defaultValue === "on"} aria-invalid={Boolean(error)} aria-describedby={`${id}-help ${error ? `${id}-error` : ""}`} className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" /><span className="text-sm leading-6">{field.label}</span></label> : <><label htmlFor={id} className="mb-2 block text-sm font-medium">{field.label}</label>{field.kind === "textarea" ? <textarea {...common} rows={4} maxLength={field.name === "holdReason" ? 1000 : 3000} /> : field.kind === "select" ? <select {...common}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input {...common} type={field.kind === "date" ? "date" : "text"} />}</>}
        <p id={`${id}-help`} className="mt-2 text-sm leading-6 text-muted-foreground">{field.help}</p>
        {error ? <p id={`${id}-error`} className="mt-1 text-sm text-destructive">{error}</p> : null}
      </div>;
    })}
    <button type="submit" disabled={pending} className={`inline-flex min-h-11 max-w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 ${danger ? "border border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary text-primary-foreground hover:bg-brand-800"}`}>{label}</button>
    <p role="status" aria-live="polite" className="min-h-6 text-sm leading-6 text-muted-foreground">{pending ? "Memproses permintaan…" : message}</p>
  </form>;
}
