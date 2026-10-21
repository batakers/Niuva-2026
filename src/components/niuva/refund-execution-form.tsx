"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { NativeInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RefundFormState } from "@/modules/refund/types";

export function RefundExecutionForm({ action, mode, submissionKey, version, allocationId, publicReason, authorizationId, permalink }: Readonly<{
  action: (state: RefundFormState, data: FormData) => Promise<RefundFormState>;
  mode: "submit" | "reconcile" | "authorize-manual" | "confirm-manual" | "revoke-manual"; submissionKey: string; version: number; allocationId?: string; publicReason?: string; authorizationId?: string; permalink: string;
}>) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" }, permalink), id = useId(), message = useRef<HTMLParagraphElement>(null);
  const [values, setValues] = useState<Record<string, string>>({ publicReason: publicReason ?? "", ...state.executionValues });
  const setValue = (name: string, value: string) => setValues(previous => ({ ...previous, [name]: value }));
  useEffect(() => { if (state.status === "error") message.current?.focus(); }, [state]);
  const reference = (name: string, label: string) => <Field><FieldLabel htmlFor={`${id}-${name}`}>{label}</FieldLabel><NativeInput id={`${id}-${name}`} name={name} type="text" minLength={10} maxLength={200} required autoComplete="off" value={values[name] ?? ""} onChange={event => setValue(name, event.target.value)} /></Field>;
  return <form action={formAction} className="mt-4 space-y-4">
    <input type="hidden" name="submissionKey" value={submissionKey} /><input type="hidden" name="expectedVersion" value={version} />
    {allocationId ? <input type="hidden" name="allocationId" value={allocationId} /> : null}{authorizationId ? <input type="hidden" name="authorizationId" value={authorizationId} /> : null}
    <FieldSet disabled={pending} aria-label={mode === "submit" ? "Pengajuan ke provider" : mode === "authorize-manual" ? "Persetujuan pengembalian manual" : mode === "confirm-manual" ? "Bukti pengembalian manual" : mode === "revoke-manual" ? "Pencabutan persetujuan manual" : "Pemeriksaan hasil refund"}>
      {mode === "submit" ? <><Field><FieldLabel htmlFor={`${id}-publicReason`}>Alasan yang aman ditampilkan Customer</FieldLabel><Textarea id={`${id}-publicReason`} name="publicReason" minLength={10} maxLength={255} rows={3} required value={values.publicReason ?? ""} onChange={event => setValue("publicReason", event.target.value)} readOnly={Boolean(publicReason)} /><p className="text-sm leading-6 text-muted-foreground">Alasan ini dapat tampil pada riwayat pembayaran Customer. Hindari data kartu, password, URL privat atau catatan internal.</p></Field>{reference("eligibilityEvidence", "Referensi pemeriksaan metode, batas waktu dan saldo merchant")}</> : null}
      {mode === "authorize-manual" ? <><Field><FieldLabel htmlFor={`${id}-reason`}>Dasar penanganan manual</FieldLabel><Textarea id={`${id}-reason`} name="reason" minLength={10} maxLength={1000} required rows={3} value={values.reason ?? ""} onChange={event => setValue("reason", event.target.value)} /></Field>
        {reference("providerResolutionReference", "Referensi konfirmasi provider: tidak ada refund tertunda atau berhasil")}
        {reference("recipientVerificationReference", "Referensi verifikasi nominal dan penerima")}
        <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" name="providerConfirmedNoPending" value="true" required checked={values.providerConfirmedNoPending === "true"} onChange={event => setValue("providerConfirmedNoPending", String(event.target.checked))} /><span>Saya telah memverifikasi hasil provider dan memastikan tidak ada refund yang masih berjalan atau sudah berhasil untuk sisa alokasi ini.</span></label>
        <p className="text-sm leading-6 text-muted-foreground">Timeout atau status settlement saja belum membuktikan ketiadaan refund. Catat bukti pemeriksaan provider sebelum menyetujui transfer. Gunakan referensi internal tanpa nomor rekening atau URL privat.</p></> : null}
      {mode === "confirm-manual" ? <>{reference("transferReference", "Referensi transfer bank yang unik")}{reference("evidenceReference", "Referensi bukti transfer yang sudah diperiksa")}
        <Field><FieldLabel htmlFor={`${id}-paidAt`}>Waktu transfer selesai (WIB)</FieldLabel><NativeInput id={`${id}-paidAt`} name="paidAt" type="datetime-local" step={1} required value={values.paidAt ?? ""} onChange={event => setValue("paidAt", event.target.value)} /></Field>
        <p className="text-sm leading-6 text-muted-foreground">Catat hanya transfer yang sudah selesai sesuai persetujuan manual. Form ini menyimpan bukti; tidak mengirim uang.</p></> : null}
      {mode === "revoke-manual" ? <><Field><FieldLabel htmlFor={`${id}-reason`}>Alasan mencabut persetujuan manual</FieldLabel><Textarea id={`${id}-reason`} name="reason" minLength={10} maxLength={1000} required rows={3} value={values.reason ?? ""} onChange={event => setValue("reason", event.target.value)} /></Field><p className="text-sm leading-6 text-muted-foreground">Hanya persetujuan yang belum digunakan dapat dicabut. Riwayat keputusan tetap tersimpan; hasil provider yang belum pasti tetap harus diperiksa.</p></> : null}
      <Button type="submit" disabled={pending} className="min-h-11 w-fit max-w-full whitespace-normal">{pending ? "Memeriksa…" : mode === "submit" ? "Ajukan alokasi ke provider" : mode === "reconcile" ? "Periksa hasil provider" : mode === "authorize-manual" ? "Simpan persetujuan manual" : mode === "revoke-manual" ? "Cabut persetujuan manual" : "Catat transfer terkonfirmasi"}</Button>
    </FieldSet>
    {state.message ? <p ref={message} role={state.status === "error" ? "alert" : "status"} tabIndex={-1} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-success"}>{state.message}</p> : null}
  </form>;
}
