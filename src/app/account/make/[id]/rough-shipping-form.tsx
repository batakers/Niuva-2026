"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/modules/shared/format";

const resultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("PENDING"), message: z.string() }),
  z.object({ status: z.literal("AVAILABLE"), checkedAt: z.string(), lowerRp: z.string(), upperRp: z.string(),
    package: z.object({ weightGrams: z.number(), lengthCm: z.number(), widthCm: z.number(), heightCm: z.number(), declaredValueRp: z.number() }),
    couriers: z.array(z.object({ code: z.string(), name: z.string(), service: z.string(), priceRp: z.string(), eta: z.string().optional() })) }),
]);

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

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
      if (!response.ok) { setError(response.status === 429 ? "Terlalu sering memeriksa. Coba lagi beberapa menit lagi." : "Perkiraan ongkir belum dapat diperiksa. Coba lagi nanti."); return; }
      setResult(resultSchema.parse(await response.json()));
    } catch { setError("Perkiraan ongkir belum dapat diperiksa. Periksa koneksi lalu coba lagi."); }
    finally { setPending(false); }
  }
  return <form className="mt-4 space-y-4" onSubmit={(event) => void check(event)}>
    <div className="space-y-2">
      <label className="block text-ui font-medium" htmlFor="rough-postal">Kode pos tujuan</label>
      <input className={controlClass} id="rough-postal" inputMode="numeric" maxLength={5} name="postalCode" pattern="[0-9]{5}" required />
    </div>
    <div className="space-y-2">
      <label className="block text-ui font-medium" htmlFor="rough-area">ID area kurir <span className="font-normal text-muted-foreground">(opsional)</span></label>
      <input aria-describedby="rough-area-description" className={controlClass} id="rough-area" name="areaId" />
      <p className="text-caption text-muted-foreground" id="rough-area-description">Kosongkan bila tidak tahu; kode pos sudah cukup.</p>
    </div>
    <Button className="min-h-11 w-full" disabled={pending} type="submit" variant="outline">{pending ? "Memeriksa…" : "Cek perkiraan ongkir"}</Button>
    {error ? <p className="text-ui font-normal leading-[1.55] text-destructive" role="alert">{error}</p> : null}
    {result?.status === "PENDING" ? <p className="text-ui font-normal leading-[1.55]" role="status">{result.message}</p> : null}
    {result?.status === "AVAILABLE" ? <div className="space-y-3 border-t border-border pt-4" role="status">
      <p className="text-lg font-semibold tabular-nums">{formatRupiah(result.lowerRp)}–{formatRupiah(result.upperRp)}</p>
      <ul className="divide-y divide-border border-y border-border">
        {result.couriers.map((rate) => (
          <li className="flex items-baseline justify-between gap-4 py-2 text-ui" key={`${rate.code}-${rate.service}`}>
            <span className="min-w-0">{rate.name} {rate.service}{rate.eta ? <span className="text-muted-foreground"> · {rate.eta}</span> : null}</span>
            <span className="font-medium tabular-nums">{formatRupiah(rate.priceRp)}</span>
          </li>
        ))}
      </ul>
      <p className="text-caption leading-[1.45] text-muted-foreground">
        Dicek {dateFormatter.format(new Date(result.checkedAt))}. Asumsi paket {result.package.weightGrams} g, {result.package.lengthCm} × {result.package.widthCm} × {result.package.heightCm} cm, nilai {formatRupiah(BigInt(Math.trunc(result.package.declaredValueRp)))}.
      </p>
    </div> : null}
  </form>;
}
