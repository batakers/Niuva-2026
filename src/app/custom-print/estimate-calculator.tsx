"use client";

import { useState } from "react";

import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Input } from "@/components/ui/input";
import { calculatePublicEstimate, publicEstimateSearchParams } from "@/modules/custom-print/public-estimate";
import type { CustomPrintPricingPolicy } from "@/modules/pricing/policy";
import { formatExactRupiah, formatRupiah } from "@/modules/shared/format";

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Public estimate from the visitor's own slicer numbers, on the active Pricing v1 rule the page read on the
 * server. Nothing is sent or stored; the request form recalculates on submit.
 */
export function EstimateCalculator({ policy, requestHref }: Readonly<{
  policy: CustomPrintPricingPolicy | null;
  /** The model request form, or null when model requests are not available. */
  requestHref: string | null;
}>) {
  const [material, setMaterial] = useState("PLA");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");

  if (policy === null) {
    return <StatusNotice className="mt-10 max-w-3xl" description="Operator tetap menghitung biaya dari file Anda saat review." role="note" title="Kalkulator belum tersedia saat ini." tone="info" />;
  }

  const estimate = calculatePublicEstimate({ material, quantity, weightGramsPerUnit: weight, hours, minutes }, policy);
  const started = weight.trim() !== "";

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <form aria-label="Kalkulator estimasi biaya" className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7" noValidate onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="estimate-material" label="Material">
            <select className={controlClass} onChange={(event) => setMaterial(event.target.value)} value={material}>
              <option value="PLA">PLA</option>
              <option value="ABS">ABS</option>
            </select>
          </FormField>
          <FormField id="estimate-quantity" label="Jumlah">
            <Input className={controlClass} inputMode="numeric" min={1} onChange={(event) => setQuantity(event.target.value)} type="number" value={quantity} />
          </FormField>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <FormField description="Dari slicer, untuk satu unit." id="estimate-weight" label="Berat per unit (g)">
            <Input className={controlClass} inputMode="decimal" onChange={(event) => setWeight(event.target.value)} placeholder="Contoh: 18,4" type="text" value={weight} />
          </FormField>
          <FormField id="estimate-hours" label="Durasi per unit (jam)">
            <Input className={controlClass} inputMode="numeric" min={0} onChange={(event) => setHours(event.target.value)} type="number" value={hours} />
          </FormField>
          <FormField id="estimate-minutes" label="Durasi per unit (menit)">
            <Input className={controlClass} inputMode="numeric" max={59} min={0} onChange={(event) => setMinutes(event.target.value)} type="number" value={minutes} />
          </FormField>
        </div>
        <p className="mt-5 text-caption leading-[1.45] text-muted-foreground">Dihitung dengan filamen stok Niuva. Untuk filamen sendiri atau rekomendasi material, operator menghitungnya saat review.</p>
      </form>

      <div className="flex flex-col rounded-[var(--radius-card)] border border-border bg-neutral-50 p-5 sm:p-7">
        <p className="text-ui font-semibold">Perkiraan biaya</p>
        <div aria-live="polite" className="mt-4 flex flex-1 flex-col">
          {estimate ? (
            <>
              <dl className="space-y-2 text-ui">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Material</dt><dd className="tabular-nums">{formatExactRupiah(estimate.materialSubtotalRp)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Waktu mesin</dt><dd className="tabular-nums">{formatExactRupiah(estimate.machineSubtotalRp)}</dd></div>
              </dl>
              <p className="mt-5 border-t border-border pt-4 text-caption text-muted-foreground">Total perkiraan</p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.015em] tabular-nums">{formatRupiah(estimate.finalTotalRp)}</p>
            </>
          ) : (
            <p className="text-ui text-muted-foreground">
              {started
                ? "Periksa angkanya: berat dan durasi lebih dari nol, menit 0–59, dan jumlah minimal 1."
                : "Isi berat dan durasi dari slicer untuk melihat perkiraan biaya."}
            </p>
          )}
        </div>
        <p className="mt-5 text-caption leading-[1.45] text-muted-foreground">Estimasi awal, bukan harga final. Belum termasuk ongkir dan biaya yang ditemukan operator saat review.</p>
        {estimate && requestHref ? (
          <NiuvaLink className="mt-5 min-h-11 self-start" href={`${requestHref}?${publicEstimateSearchParams(estimate).toString()}`} variant="outline">Ajukan model dengan angka ini</NiuvaLink>
        ) : null}
      </div>
    </div>
  );
}
