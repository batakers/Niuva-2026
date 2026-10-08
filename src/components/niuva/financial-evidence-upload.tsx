"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useHydrated } from "./use-hydrated";
import { FINANCIAL_EVIDENCE_MAX_BYTES } from "@/modules/finance/evidence-policy";
const intentSchema = z.object({ data: z.object({ fileId: z.uuid(), uploadToken: z.string(), uploadUrl: z.url(), requiredHeaders: z.record(z.string(), z.string()) }) });
export function FinancialEvidenceUpload({ expenseId, enabled }: Readonly<{ expenseId: string; enabled: boolean }>) {
  const hydrated = useHydrated(), [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  if (!enabled) return <p className="text-sm text-muted-foreground">Penyimpanan bukti belum tersedia. Pengeluaran tetap tersimpan tanpa lampiran.</p>;
  const upload = async () => {
    if (!file || file.size < 1 || file.size > FINANCIAL_EVIDENCE_MAX_BYTES) { setMessage("Pilih JPEG, PNG, atau PDF maksimal 10 MiB."); return; }
    setBusy(true); setMessage("");
    try {
      const prepared = await fetch("/api/admin/finance/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "prepare", expenseId, originalName: file.name, mimeType: file.type, sizeBytes: file.size }) });
      if (!prepared.ok) throw new Error("Bukti belum dapat diunggah. Coba kembali.");
      const intent = intentSchema.parse(await prepared.json()).data;
      const uploaded = await fetch(intent.uploadUrl, { method: "PUT", headers: intent.requiredHeaders, body: file });
      if (!uploaded.ok) throw new Error("Unggah bukti belum berhasil.");
      const verified = await fetch("/api/admin/finance/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "verify", expenseId, fileId: intent.fileId, uploadToken: intent.uploadToken }) });
      if (!verified.ok) throw new Error("Isi bukti belum dapat diverifikasi. Periksa jenis file.");
      setMessage("Bukti berhasil dilampirkan. Muat ulang halaman untuk membuka bukti.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Bukti belum dapat diunggah."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3"><label className="grid gap-2 text-sm font-medium">Bukti pengeluaran (opsional)<input className="min-h-11 max-w-full text-sm" type="file" accept="image/jpeg,image/png,application/pdf" disabled={busy || !hydrated} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><p className="text-xs text-muted-foreground">JPEG, PNG, atau PDF · maksimal 10 MiB · akses privat.</p><Button disabled={!file || busy || !hydrated} type="button" variant="outline" onClick={upload}>{busy ? "Mengunggah…" : "Unggah bukti"}</Button>{message ? <p className="text-sm" role="status">{message}</p> : null}</div>;
}
