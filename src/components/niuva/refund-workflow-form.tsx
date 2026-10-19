"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { NativeInput } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { RefundFormState } from "@/modules/refund/types";

type Mode = "request" | "intake" | "approve" | "refresh" | "receive-return";
export function RefundWorkflowForm({ action, mode, submissionKey, version, permalink }: Readonly<{
  action: (state: RefundFormState, data: FormData) => Promise<RefundFormState>;
  mode: Mode; submissionKey: string; version?: number; permalink: string;
}>) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" }, permalink);
  const [reason, setReason] = useState(state.values?.reason ?? "");
  const [category, setCategory] = useState(state.values?.category ?? "");
  const [returnState, setReturnState] = useState(state.values?.returnState ?? "");
  const [reference, setReference] = useState(state.values?.reference ?? "");
  const messageRef = useRef<HTMLParagraphElement>(null), id = useId();
  useEffect(() => { if (state.status === "error") messageRef.current?.focus(); }, [state]);
  const intake = mode === "request" || mode === "intake";
  const hasReference = mode === "intake" || mode === "approve" || mode === "receive-return";
  const label = mode === "request" ? "Ajukan refund penuh" : mode === "intake" ? "Catat pengajuan" : mode === "approve" ? "Simpan persetujuan Owner" : mode === "refresh" ? "Perbarui rincian untuk ditinjau" : "Catat retur diterima";
  return <form action={formAction} className="mt-5 space-y-5">
    <input name="submissionKey" type="hidden" value={submissionKey} />
    {version !== undefined ? <input name="expectedVersion" type="hidden" value={version} /> : null}
    <FieldSet disabled={pending} aria-label={intake ? "Pengajuan refund" : "Pemeriksaan refund"}>
      {intake ? <Field><FieldLabel htmlFor={`${id}-category`}>Jenis pengajuan</FieldLabel>
        <NativeSelect id={`${id}-category`} name="category" required value={category} onChange={event => setCategory(event.target.value)}>
          <option value="" disabled>Pilih jenis pengajuan</option><option value="DELIVERY_DELAY">Keterlambatan pengiriman</option><option value="ITEM_ISSUE">Barang atau hasil tidak sesuai</option><option value="OTHER">Alasan lain</option>
        </NativeSelect></Field> : null}
      <Field><FieldLabel htmlFor={`${id}-reason`}>{intake ? "Alasan pengajuan" : mode === "approve" ? "Dasar persetujuan Owner" : mode === "refresh" ? "Alasan meninjau ulang pembayaran" : "Hasil pemeriksaan retur"}</FieldLabel>
        <Textarea id={`${id}-reason`} name="reason" minLength={10} maxLength={1000} required rows={4} value={reason} onChange={event => setReason(event.target.value)} aria-describedby={`${id}-reason-help`} />
        <p id={`${id}-reason-help`} className="text-sm text-muted-foreground">Jelaskan kebutuhan penanganannya. Jangan sertakan password, OTP, atau data kartu.</p>
      </Field>
      {mode === "approve" ? <Field><FieldLabel htmlFor={`${id}-return`}>Syarat retur</FieldLabel>
        <NativeSelect id={`${id}-return`} name="returnState" value={returnState} required onChange={event => setReturnState(event.target.value)}>
          <option value="" disabled>Pilih hasil pemeriksaan</option><option value="PENDING">Menunggu retur</option><option value="RECEIVED">Retur diterima</option><option value="NOT_REQUIRED">Tidak perlu retur</option><option value="WAIVED">Retur dikesampingkan</option>
        </NativeSelect><p className="text-sm leading-6 text-muted-foreground">Pilihan menunggu retur membuat persetujuan bersyarat; proses refund menunggu bukti penerimaan. Pengesampingan retur memerlukan alasan di atas.</p></Field> : null}
      {hasReference ? <Field><FieldLabel htmlFor={`${id}-reference`}>{mode === "intake" ? "Referensi verifikasi pihak yang menghubungi" : "Referensi bukti retur"}{mode === "approve" && returnState !== "RECEIVED" ? " (bila ada)" : ""}</FieldLabel>
        <NativeInput id={`${id}-reference`} name="reference" type="text" maxLength={200} minLength={5} required={mode !== "approve" || returnState === "RECEIVED"} value={reference} onChange={event => setReference(event.target.value)} aria-describedby={`${id}-reference-help`} />
        <p id={`${id}-reference-help`} className="text-sm text-muted-foreground">Gunakan nomor kasus, catatan pemeriksaan, atau resi. Hindari URL berkas privat.</p>
      </Field> : null}
      <Button type="submit" className="min-h-11 w-fit max-w-full whitespace-normal" disabled={pending}>{pending ? "Menyimpan…" : label}</Button>
    </FieldSet>
    {state.message ? <p ref={messageRef} tabIndex={-1} role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-success"}>{state.message}</p> : null}
  </form>;
}
