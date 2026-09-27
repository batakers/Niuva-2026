"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";

const resultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("PENDING"), message: z.string() }),
  z.object({ status: z.literal("AVAILABLE"), checkedAt: z.string(), lowerRp: z.string(), upperRp: z.string(),
    package: z.object({ weightGrams: z.number(), lengthCm: z.number(), widthCm: z.number(), heightCm: z.number(), declaredValueRp: z.number() }),
    couriers: z.array(z.object({ code: z.string(), name: z.string(), service: z.string(), priceRp: z.string(), eta: z.string().optional() })) }),
]);

export function RoughShippingForm({ requestId }: Readonly<{ requestId: string }>) {
  const [result, setResult] = useState<z.infer<typeof resultSchema>>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/account/make/${requestId}/rough-shipping`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postalCode: data.get("postalCode"), ...(data.get("areaId") ? { areaId: data.get("areaId") } : {}) }),
      });
      if (!response.ok) { setError(response.status === 429 ? "Terlalu sering memeriksa. Coba lagi nanti." : "Ongkir menyusul. Pemeriksaan belum dapat dilakukan."); return; }
      setResult(resultSchema.parse(await response.json()));
    } catch { setError("Ongkir menyusul. Periksa koneksi lalu coba lagi."); }
    finally { setPending(false); }
  }
  return <form className="mt-4 space-y-4 rounded-xl border border-border bg-card p-6" onSubmit={(event) => void check(event)}>
    <p className="text-sm leading-6 text-muted-foreground">Isi tujuan lalu pilih cek ongkir. Rate testing ini berdiri sendiri dari estimasi produksi dan tidak menjadi tagihan. Paket final akan diukur ulang.</p>
    <label className="grid gap-2 text-sm font-medium" htmlFor="rough-postal">Kode pos tujuan<input className="min-h-11 rounded-md border border-border bg-background px-3" id="rough-postal" name="postalCode" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} /></label>
    <label className="grid gap-2 text-sm font-medium" htmlFor="rough-area">Area ID Biteship (opsional)<input className="min-h-11 rounded-md border border-border bg-background px-3" id="rough-area" name="areaId" /></label>
    <button className="min-h-11 rounded-md bg-brand-950 px-5 text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Memeriksa…" : "Cek ongkir kasar"}</button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result?.status === "PENDING" && <p role="status" className="text-sm">{result.message}</p>}
    {result?.status === "AVAILABLE" && <div role="status" className="space-y-2 border-t border-border pt-4"><p className="font-semibold">Ongkir kasar Rp {result.lowerRp}–Rp {result.upperRp}</p><p className="text-sm text-muted-foreground">Dicek {new Date(result.checkedAt).toLocaleString("id-ID")}. Asumsi paket: {result.package.weightGrams} g, {result.package.lengthCm} × {result.package.widthCm} × {result.package.heightCm} cm, nilai Rp {result.package.declaredValueRp}.</p><ul className="list-inside list-disc text-sm">{result.couriers.map((rate) => <li key={`${rate.code}-${rate.service}`}>{rate.name} {rate.service}: Rp {rate.priceRp}{rate.eta ? ` · ${rate.eta}` : ""}</li>)}</ul></div>}
  </form>;
}
