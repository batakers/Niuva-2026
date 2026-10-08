"use client";
import { useActionState, useState } from "react";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { rateLabels, type EditableRates } from "@/modules/pricing/tariff-schema";
import { tariffAction, type TariffActionState } from "./actions";
export function TariffForm({ initialRates, activeId, canApply }: Readonly<{ initialRates: EditableRates; activeId: string | null; canApply: boolean }>) {
  const [rates, setRates] = useState(initialRates); const [editing, setEditing] = useState(true); const ready = useHydrated();
  const [state, action, pending] = useActionState(tariffAction, { status: "idle" } as TariffActionState);
  const review = !editing && state.status === "review" ? state.review : null;
  return <section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-label="Ubah tarif Custom Print">
    <h2 className="text-xl font-semibold">{review ? "Tinjau perubahan tarif" : "Tarif layanan"}</h2>
    <p className="mt-2 text-sm text-muted-foreground">Tarif bahan dihitung per gram secara bertingkat untuk setiap unit. Waktu mesin hanya dikenakan untuk bahan Niuva; pembulatan dilakukan pada total akhir.</p>
    {state.status === "error" && <p role="alert" className="mt-4 text-sm text-destructive">{state.message}</p>}
    {state.status === "success" && <p role="status" className="mt-4 rounded-lg bg-success-background p-3 text-sm">{state.message}</p>}
    {review ? <div className="mt-5 space-y-5">
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Tarif sebelum dan setelah perubahan dalam rupiah</caption><thead><tr><th className="p-2 text-left">Layanan</th><th className="p-2 text-right">Sekarang</th><th className="p-2 text-right">Baru</th></tr></thead><tbody>{(Object.keys(rateLabels) as (keyof EditableRates)[]).map(key => <tr key={key} className="border-t border-border"><th className="p-2 text-left font-medium">{rateLabels[key]}</th><td className="p-2 text-right">{review.before[key]}</td><td className="p-2 text-right font-semibold">{review.after[key]}</td></tr>)}</tbody></table></div>
      <div className="rounded-lg bg-muted p-4"><h3 className="font-semibold">Contoh perhitungan PLA</h3><p className="mt-1 text-sm text-muted-foreground">Satu unit, bahan Niuva, waktu mesin 1 jam. Contoh perhitungan, bukan harga final pesanan.</p><ul className="mt-3 space-y-2 text-sm">{review.samples.map(sample => <li key={sample.weight}>{sample.weight} gram: Rp {sample.beforeRp} → Rp {sample.afterRp}</li>)}</ul></div>
      <form action={action}><input type="hidden" name="phase" value="apply" /><input type="hidden" name="payload" value={JSON.stringify(review.request)} /><label className="flex items-start gap-3 text-sm"><input type="checkbox" name="confirmed" required className="mt-1" />Saya sudah meninjau tarif baru dan menyetujui penerapannya sekarang.</label><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-lg border border-border px-4">Kembali ubah</button><button disabled={!ready || pending || !canApply} className="min-h-11 rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50">{pending ? "Menerapkan…" : "Terapkan tarif"}</button></div></form>
    </div> : <form action={action} onSubmit={() => setEditing(false)} className="mt-5 space-y-5"><input type="hidden" name="phase" value="preview" /><input type="hidden" name="payload" value={JSON.stringify({ rates, expectedActiveId: activeId })} />
      <div className="grid gap-4 sm:grid-cols-2">{(Object.keys(rateLabels) as (keyof EditableRates)[]).map(key => <label key={key} className="grid gap-2 text-sm font-medium"><span>{rateLabels[key]} (Rp)</span><input className="min-h-11 rounded-lg border border-border bg-background px-3" inputMode="numeric" pattern="[1-9][0-9]{0,8}" required value={rates[key]} onChange={event => setRates({ ...rates, [key]: event.target.value })} disabled={!ready || pending} /></label>)}</div>
      <button disabled={!ready || pending || !canApply} className="min-h-11 rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50">{pending ? "Meninjau…" : "Tinjau perubahan"}</button>
    </form>}
    {!canApply && <p className="mt-4 text-sm text-muted-foreground">Penerapan tarif tersedia setelah lingkungan operasional diizinkan. Saat ini hanya development lokal yang diizinkan.</p>}
  </section>;
}
