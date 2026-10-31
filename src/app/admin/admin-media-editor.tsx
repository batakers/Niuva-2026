"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { NativeInput as Input } from "@/components/ui/input";
import { useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { PUBLIC_MEDIA_MAX_BYTES, PUBLIC_MEDIA_MAX_ITEMS, publicMediaUrl, type PublicMediaOwner } from "@/modules/public-media/schema";
import { useAdminFormBusy } from "./admin-action-form";

type Media = Readonly<{ storageKey: string; altText: string; sortOrder: number }>;
export function AdminMediaEditor({ media, label, owner }: Readonly<{ media: readonly Media[]; label: string; owner: PublicMediaOwner }>) {
  const [rows, setRows] = useState(() => [...media].sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({ storageKey: item.storageKey, altText: item.altText, key: `initial-${index}` })));
  const [available, setAvailable] = useState<readonly Readonly<{ storageKey: string; url: string }>[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const setFormBusy = useAdminFormBusy(), inputId = useId(), maxItems = PUBLIC_MEDIA_MAX_ITEMS[owner.kind];
  useEffect(() => { setFormBusy(busy); return () => setFormBusy(false); }, [busy, setFormBusy]);
  function update(index: number, value: string) { setRows(previous => previous.map((item, position) => position === index ? { ...item, altText: value } : item)); }
  function move(index: number, step: number) { setRows(previous => { const next = [...previous]; const target = index + step; if (!next[index] || !next[target]) return previous; [next[index], next[target]] = [next[target]!, next[index]!]; return next; }); }
  async function api(input: unknown): Promise<unknown> {
    const response = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const body: unknown = await response.json();
    if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "Foto belum dapat diproses. Coba lagi.");
    return body;
  }
  async function upload(file: File) {
    setError(null);
    if (rows.length >= maxItems || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > PUBLIC_MEDIA_MAX_BYTES || file.size < 1) { setError(`Pilih JPEG, PNG, atau WebP maksimal 10 MiB. Satu galeri memuat maksimal ${maxItems} foto.`); return; }
    setBusy(true);
    try {
      const intent = await api({ operation: "intent", owner, contentType: file.type, sizeBytes: file.size });
      if (!intent || typeof intent !== "object" || !("assetId" in intent) || !("uploadUrl" in intent) || typeof intent.assetId !== "string" || typeof intent.uploadUrl !== "string") throw new Error("Upload belum dapat dimulai.");
      const put = await fetch(intent.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error("Foto belum terunggah. Periksa koneksi lalu coba lagi.");
      const result = await api({ operation: "confirm", assetId: intent.assetId });
      if (!result || typeof result !== "object" || !("storageKey" in result) || typeof result.storageKey !== "string") throw new Error("Foto belum terverifikasi.");
      const storageKey = result.storageKey;
      setRows(previous => [...previous, { storageKey, altText: "", key: crypto.randomUUID() }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Foto belum dapat diproses."); }
    finally { setBusy(false); }
  }
  async function loadAvailable() {
    setError(null); setBusy(true);
    try {
      const result = await api({ operation: "list", owner });
      if (!Array.isArray(result)) throw new Error("Daftar foto belum dapat dimuat.");
      setAvailable(result.filter((item): item is { storageKey: string; url: string } => !!item && typeof item === "object" && typeof item.storageKey === "string" && typeof item.url === "string"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Daftar foto belum dapat dimuat."); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-3">
    <input name="mediaJson" type="hidden" value={JSON.stringify(rows.map((item, sortOrder) => ({ storageKey: item.storageKey, altText: item.altText, sortOrder })))} />
    <p className="text-sm text-muted-foreground">Pilih urutan dan tulis deskripsi foto untuk pembaca layar. Foto pertama menjadi tampilan utama.</p>
    <Label className="grid gap-4 text-sm font-medium" htmlFor={inputId}>Unggah foto<Input accept="image/jpeg,image/png,image/webp" disabled={busy || rows.length >= maxItems} id={inputId} type="file" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></Label>
    <p className="text-xs text-muted-foreground">JPEG, PNG, atau WebP · maksimal 10 MiB per foto · {rows.length}/{maxItems} foto. Simpan galeri setelah upload selesai.</p>
    {busy ? <p role="status">Memproses foto…</p> : null}
    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    {rows.map((item, index) => <div className="grid min-w-0 gap-3 rounded-lg border border-border p-4" key={item.key}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{label} {index + 1}</h3><div className="flex gap-1"><Button variant="outline" aria-label={`Naikkan foto ${index + 1}`} className="flex size-11 items-center justify-center rounded-lg border border-border disabled:opacity-40" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp aria-hidden="true" className="size-4" /></Button><Button variant="outline" aria-label={`Turunkan foto ${index + 1}`} className="flex size-11 items-center justify-center rounded-lg border border-border disabled:opacity-40" disabled={index === rows.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown aria-hidden="true" className="size-4" /></Button><Button variant="destructive" aria-label={`Lepaskan foto ${index + 1}`} className="flex size-11 items-center justify-center rounded-lg text-destructive-icon hover:bg-destructive-background" onClick={() => setRows(previous => previous.filter((_, position) => position !== index))} type="button"><X aria-hidden="true" className="size-4" /></Button></div></div>
      {publicMediaUrl(item.storageKey, owner.kind) ? <Image alt={item.altText} className="max-h-40 w-fit rounded-lg object-contain" height={320} width={480} unoptimized src={publicMediaUrl(item.storageKey, owner.kind)!} /> : null}
      <Label className="grid gap-4 text-sm font-medium">Deskripsi foto<Input className="min-h-11 min-w-0 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" maxLength={500} required value={item.altText} onChange={event => update(index, event.target.value)} /></Label>
    </div>)}
    <Button variant="outline" className="min-h-11 w-fit" disabled={busy} onClick={() => void loadAvailable()} type="button">Muat foto tersimpan</Button>
    {available.length ? <Label className="grid gap-4 text-sm font-medium">Pilih foto tersimpan<NativeSelect value="" disabled={busy || rows.length >= maxItems} onChange={event => { const storageKey = event.target.value; if (storageKey) setRows(previous => [...previous, { key: crypto.randomUUID(), storageKey, altText: "" }]); }}><option value="">Pilih foto</option>{available.filter(item => !rows.some(row => row.storageKey === item.storageKey)).map((item, index) => <option key={item.storageKey} value={item.storageKey}>Foto tersimpan {index + 1}</option>)}</NativeSelect></Label> : null}
    <p className="text-xs text-muted-foreground">Melepaskan foto dari daftar tidak menghapus berkas asal.</p>
  </div>;
}
