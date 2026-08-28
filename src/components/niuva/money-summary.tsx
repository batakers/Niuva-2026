import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { StatusNotice, type StatusNoticeTone } from "@/components/niuva/status-notice";
import { cn } from "@/lib/utils";

export type MoneySummaryLine = {
  label: string;
  value: string;
  detail?: string;
};

export type MoneySummaryVariant = "checkout" | "quote" | "compact";

export type MoneySummaryStatus =
  | "loading"
  | "ready"
  | "changed"
  | "unavailable"
  | "error";

export type MoneySummaryProps = {
  lines: readonly MoneySummaryLine[];
  total: string;
  currency: string;
  sourceStatus?: MoneySummaryStatus;
  title?: string;
  description?: string;
  note?: string;
  action?: ReactNode;
  variant?: MoneySummaryVariant;
  className?: string;
};

const variantLabels: Record<MoneySummaryVariant, string> = {
  checkout: "Checkout",
  quote: "Custom quote",
  compact: "Summary",
};

const statusLabels: Record<MoneySummaryStatus, string> = {
  loading: "Memuat",
  ready: "Siap digunakan",
  changed: "Perlu validasi ulang",
  unavailable: "Belum tersedia",
  error: "Tidak dapat dimuat",
};

const statusNoticeCopy: Record<
  Exclude<MoneySummaryStatus, "ready">,
  { title: string; description: string; tone: StatusNoticeTone }
> = {
  loading: {
    title: "Rincian sedang dimuat",
    description: "Kami sedang mengambil rincian terbaru dari server.",
    tone: "info",
  },
  changed: {
    title: "Rincian berubah",
    description: "Nilai ini perlu diverifikasi ulang sebelum workflow dilanjutkan.",
    tone: "warning",
  },
  unavailable: {
    title: "Rincian belum tersedia",
    description: "Rincian belum dapat ditampilkan dari sumber yang berwenang.",
    tone: "warning",
  },
  error: {
    title: "Rincian tidak dapat dimuat",
    description: "Terjadi kendala saat mengambil rincian. Coba muat ulang atau minta pemeriksaan operator.",
    tone: "error",
  },
};

function getBadgeVariant(
  status: MoneySummaryStatus,
): "secondary" | "outline" | "destructive" {
  if (status === "error") {
    return "destructive";
  }

  if (status === "changed" || status === "unavailable") {
    return "outline";
  }

  return "secondary";
}

export function MoneySummary({
  lines,
  total,
  currency,
  sourceStatus = "ready",
  title,
  description,
  note,
  action,
  variant = "checkout",
  className,
}: MoneySummaryProps) {
  const notice = sourceStatus === "ready" ? null : statusNoticeCopy[sourceStatus];

  return (
    <Card
      aria-busy={sourceStatus === "loading" || undefined}
      className={cn(
        "shadow-card",
        variant === "quote" && "bg-muted/30",
        className,
      )}
      data-component="money-summary"
      data-source-status={sourceStatus}
      data-variant={variant}
      size={variant === "compact" ? "sm" : "default"}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.14em] text-brand-700">
              {variantLabels[variant]}
            </p>
            <h3 className="mt-1 text-base leading-snug font-semibold">
              {title ?? "Rincian biaya"}
            </h3>
          </div>
          <Badge variant={getBadgeVariant(sourceStatus)}>
            {statusLabels[sourceStatus]}
          </Badge>
        </div>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="divide-y divide-border border-y border-border">
          {lines.map((line, index) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 first:pt-3 last:pb-3"
              key={`${line.label}-${index}`}
            >
              <dt className="min-w-0 text-sm text-muted-foreground">
                <span className="block truncate text-foreground">{line.label}</span>
                {line.detail ? <span className="block text-xs">{line.detail}</span> : null}
              </dt>
              <dd className="font-mono text-sm font-medium text-foreground">{line.value}</dd>
            </div>
          ))}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground">
              Total
              <span className="mt-1 block font-mono text-xs font-normal text-muted-foreground">
                Mata uang: {currency}
              </span>
            </dt>
            <dd className="text-right">
              <span className="block text-xl font-semibold tracking-tight text-foreground">
                {total}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{currency}</span>
            </dd>
          </div>
        </dl>

        {note ? (
          <p className="border-l-2 border-brand-300 pl-3 text-xs leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">Sumber:</span> {note}
          </p>
        ) : null}

        {notice ? (
          <StatusNotice
            action={action}
            className="p-3"
            description={notice.description}
            role={sourceStatus === "error" ? "alert" : "status"}
            title={notice.title}
            tone={notice.tone}
          />
        ) : null}
      </CardContent>

      {!notice && action ? <CardFooter className="justify-end gap-2">{action}</CardFooter> : null}
    </Card>
  );
}
