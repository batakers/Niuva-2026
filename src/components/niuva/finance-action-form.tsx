"use client";
import { useActionState, useState, useId } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useHydrated } from "./use-hydrated";
import type { AdminAction } from "@/app/admin/actions";
export type FinanceFormField = Readonly<{ name: string; label: string; type?: "text" | "email" | "date" | "textarea" | "checkbox" | "select"; value?: string; required?: boolean; maxLength?: number; options?: readonly Readonly<{ value: string; label: string }>[]; help?: string }>;
const control = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
export function FinanceActionForm({ action, fields, hidden = {}, submitLabel, confirmMessage }: Readonly<{ action: AdminAction; fields: readonly FinanceFormField[]; hidden?: Readonly<Record<string, string>>; submitLabel: string; confirmMessage?: string }>) {
  const hydrated = useHydrated(), formId = useId();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(field => [field.name, field.value ?? ""])));
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} onSubmit={event => { if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault(); }} className="space-y-4">
    {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <fieldset className="grid gap-4" disabled={!hydrated || pending}>{fields.map(field => {
      const id = `${formId}-${field.name}`;
      const describedBy = field.help ? `${id}-help` : undefined;
      return <div key={field.name} className="grid min-w-0 gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">{field.label}</label>
        {field.type === "textarea" ? <textarea id={id} aria-describedby={describedBy} className={control} name={field.name} rows={3} value={values[field.name]} maxLength={field.maxLength ?? 1000} required={field.required} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))} />
        : field.type === "select" ? <select id={id} aria-describedby={describedBy} className={control} name={field.name} value={values[field.name]} required={field.required} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : field.type === "checkbox" ? <input id={id} aria-describedby={describedBy} className="size-5 accent-brand-700" type="checkbox" name={field.name} value="confirmed" checked={values[field.name] === "confirmed"} required={field.required} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.checked ? "confirmed" : "" }))} />
        : <input id={id} aria-describedby={describedBy} className={control} type={field.type ?? "text"} name={field.name} value={values[field.name]} maxLength={field.maxLength ?? 300} required={field.required} inputMode={field.name.endsWith("Rp") ? "numeric" : undefined} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))} />}
        {field.help ? <p id={describedBy} className="text-xs text-muted-foreground">{field.help}</p> : null}
      </div>;
    })}<Button className="min-h-11 w-fit" type="submit">{pending ? "Memproses…" : submitLabel}</Button></fieldset>
    {state.message ? <div className={`rounded-lg border p-4 text-sm ${state.status === "error" ? "border-destructive-border bg-destructive-background text-destructive" : "border-success-border bg-success-background text-success"}`} role={state.status === "error" ? "alert" : "status"}><p>{state.message}</p>{state.link ? <Link className="mt-2 inline-flex min-h-11 items-center font-semibold underline" href={state.link}>Buka hasil</Link> : null}</div> : null}
  </form>;
}
