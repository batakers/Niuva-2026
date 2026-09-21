"use client";

import { useState } from "react";

import { OptionChip } from "@/components/niuva";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const materialOptions = [
  { id: "pla", label: "PLA", price: "Rp 380.000", unavailable: false },
  { id: "abs", label: "ABS", price: "Rp 420.000", unavailable: false },
  { id: "tpu", label: "TPU fleksibel", price: "Rp 465.000", unavailable: false },
  { id: "resin", label: "Resin untuk detail halus", unavailable: true, price: null },
] as const;

export function OptionChipShowcase() {
  const [selectedId, setSelectedId] = useState("abs");
  const selectedOption = materialOptions.find((option) => option.id === selectedId);

  return (
    <section
      className="scroll-mt-8 space-y-6"
      data-acceptance-gate="verified"
      data-component-showcase="option-chip"
      data-implementation-scope="styleguide-only"
      data-implementation-status="complete"
      id="option-chip-proof"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-brand-700">Design System · approved extension</p>
          <Badge variant="outline">Styleguide only</Badge>
          <Badge variant="outline">Chromium acceptance verified</Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">OptionChip</h2>
        <p className="max-w-3xl leading-7 text-muted-foreground">
          Native button untuk pilihan yang dapat dipilih satu per satu. Candidate B
          menjaga state selected dan unavailable tetap terbaca tanpa mengandalkan
          warna saja; product-screen propagation tetap merupakan gate terpisah.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.6fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Pilih material</CardTitle>
            <CardDescription>
              Label panjang membungkus, source order tetap, dan pilihan unavailable
              tidak dapat diaktifkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset className="min-w-0 space-y-3">
              <legend className="sr-only">Material untuk fixture</legend>
              <div
                aria-label="Material untuk fixture"
                className="flex min-w-0 max-w-full flex-wrap gap-2"
                role="group"
              >
                {materialOptions.map((option) => (
                  <OptionChip
                    key={option.id}
                    label={option.label}
                    onClick={() => setSelectedId(option.id)}
                    selected={selectedId === option.id}
                    unavailable={option.unavailable}
                  />
                ))}
              </div>
              <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
                Material terpilih: {selectedOption?.label}. {selectedOption?.price
                  ? `Harga fixture: ${selectedOption.price}.`
                  : "Harga belum tersedia untuk pilihan ini."}
              </p>
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance boundary</CardTitle>
            <CardDescription>Implementation ini membuktikan struktur styleguide.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              <li>Native `button` dengan `aria-pressed` untuk state selected.</li>
              <li>State unavailable memakai `disabled` dan label yang terlihat.</li>
              <li>Focus tetap pada control; status hanya menambah perubahan harga fixture.</li>
              <li>Chromium browser/semantics acceptance sudah diverifikasi pada proof ini.</li>
              <li>Cross-browser, physical screen-reader, dan product propagation tetap gate terpisah.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-[20rem] space-y-3 rounded-xl border border-dashed border-border bg-muted p-4">
        <div>
          <h3 className="font-semibold">Reflow frame · 320px</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Group membungkus dalam source order tanpa horizontal scroll.
          </p>
        </div>
        <div
          aria-label="Material pada frame sempit"
          className="flex min-w-0 max-w-full flex-wrap gap-2"
          data-option-chip-reflow="true"
          role="group"
        >
          {materialOptions.map((option) => (
            <OptionChip
              key={`narrow-${option.id}`}
              label={`${option.label} untuk order custom`}
              selected={selectedId === option.id}
              unavailable={option.unavailable}
              onClick={() => setSelectedId(option.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
