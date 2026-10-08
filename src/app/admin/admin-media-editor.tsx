"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

type Media = Readonly<{ storageKey: string; altText: string; sortOrder: number }>;
export function AdminMediaEditor({ media, label }: Readonly<{ media: readonly Media[]; label: string }>) {
  const [rows, setRows] = useState(() => [...media].sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({ storageKey: item.storageKey, altText: item.altText, key: `initial-${index}` })));
  function update(index: number, field: "storageKey" | "altText", value: string) { setRows(previous => previous.map((item, position) => position === index ? { ...item, [field]: value } : item)); }
  function move(index: number, step: number) { setRows(previous => { const next = [...previous]; const target = index + step; if (!next[index] || !next[target]) return previous; [next[index], next[target]] = [next[target]!, next[index]!]; return next; }); }
  return <div className="grid gap-3">
    <input name="mediaJson" type="hidden" value={JSON.stringify(rows.map((item, sortOrder) => ({ storageKey: item.storageKey, altText: item.altText, sortOrder })))} />
    <p className="text-sm text-muted-foreground">Pilih urutan dan tulis deskripsi foto untuk pembaca layar. Foto pertama menjadi tampilan utama.</p>
    {rows.map((item, index) => <div className="grid min-w-0 gap-3 rounded-lg border border-border p-4" key={item.key}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{label} {index + 1}</h3><div className="flex gap-1"><button aria-label={`Naikkan foto ${index + 1}`} className="flex size-11 items-center justify-center rounded-lg border border-border disabled:opacity-40" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp aria-hidden="true" className="size-4" /></button><button aria-label={`Turunkan foto ${index + 1}`} className="flex size-11 items-center justify-center rounded-lg border border-border disabled:opacity-40" disabled={index === rows.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown aria-hidden="true" className="size-4" /></button><button aria-label={`Lepaskan foto ${index + 1}`} className="flex size-11 items-center justify-center rounded-lg text-destructive-icon hover:bg-destructive-background" onClick={() => setRows(previous => previous.filter((_, position) => position !== index))} type="button"><X aria-hidden="true" className="size-4" /></button></div></div>
      <label className="grid gap-1.5 text-sm font-medium">Lokasi foto yang sudah diunggah<input className="min-h-11 min-w-0 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" maxLength={500} required value={item.storageKey} onChange={event => update(index, "storageKey", event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Deskripsi foto<input className="min-h-11 min-w-0 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" maxLength={500} required value={item.altText} onChange={event => update(index, "altText", event.target.value)} /></label>
    </div>)}
    <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => setRows(previous => [...previous, { key: crypto.randomUUID(), storageKey: "", altText: "" }])} type="button"><Plus aria-hidden="true" className="size-4" />Tambahkan foto yang sudah diunggah</button>
    <p className="text-xs text-muted-foreground">Melepaskan foto dari daftar tidak menghapus berkas asal.</p>
  </div>;
}
