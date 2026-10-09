"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type TrendSeries = Readonly<{ label: string; points: readonly Readonly<{ key: string; value: string }>[]; unit?: "Rp" | "jumlah" }>;
const chartConfig = { value: { label: "Nilai", color: "var(--primary)" } } satisfies ChartConfig;

// Numeric conversion is only for chart positioning. Every displayed amount keeps
// the canonical server string, including values above Number.MAX_SAFE_INTEGER.
export function AdminTrendChart({ label, points, unit = "jumlah" }: TrendSeries) {
  const id = useId();
  const rows = points.map(point => ({ key: point.key, value: Number(point.value), canonical: point.value }));
  const display = (value: string) => unit === "Rp" ? "Rp " + new Intl.NumberFormat("id-ID").format(BigInt(value)) : value + " kejadian";

  return <div className="min-w-0">
    <figure aria-labelledby={id}>
      <figcaption id={id} className="sr-only">{label}. Rincian setiap periode tersedia pada tabel data.</figcaption>
      <ChartContainer config={chartConfig} className="h-56 w-full aspect-auto" initialDimension={{ width: 320, height: 224 }}>
        <AreaChart accessibilityLayer data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="key" tickLine={false} axisLine={false} tickMargin={10} minTickGap={40} tickFormatter={value => String(value).slice(5)} />
          <YAxis width={44} tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} tickFormatter={value => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(Number(value))} />
          <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(_value, _name, item) => {
            const payload: unknown = item.payload;
            if (typeof payload !== "object" || payload === null || !("canonical" in payload) || typeof payload.canonical !== "string" || !("key" in payload) || typeof payload.key !== "string") return null;
            return <div className="grid gap-1"><span className="text-xs text-muted-foreground">{payload.key}</span><span className="font-medium tabular-nums">{display(payload.canonical)}</span></div>;
          }} />} />
          <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ChartContainer>
    </figure>
    <details className="mt-3">
      <summary className="min-h-11 cursor-pointer rounded-lg py-3 text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Lihat tabel data · {label}</summary>
      <div className="max-h-72 overflow-auto rounded-lg border border-border" tabIndex={0} aria-label={`Tabel ${label}`}>
        <Table>
          <TableCaption className="sr-only">{label}</TableCaption>
          <TableHeader><TableRow><TableHead className="px-3">Periode (Jakarta)</TableHead><TableHead className="px-3 text-right">{unit === "Rp" ? "Rupiah" : "Jumlah"}</TableHead></TableRow></TableHeader>
          <TableBody>{points.map(point => <TableRow key={point.key}><TableHead scope="row" className="px-3 font-normal">{point.key}</TableHead><TableCell className="px-3 text-right tabular-nums">{point.value}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </details>
  </div>;
}
