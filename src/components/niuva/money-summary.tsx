import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
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
  /** Heading level of the title within the page outline. */
  headingLevel?: 2 | 3;
  className?: string;
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
    description: "Kami sedang mengambil rincian terbaru.",
    tone: "info",
  },
  changed: {
    title: "Rincian berubah",
    description: "Nilai ini perlu diperiksa ulang sebelum Anda melanjutkan.",
    tone: "warning",
  },
  unavailable: {
    title: "Rincian belum tersedia",
    description: "Rincian belum dapat ditampilkan saat ini.",
    tone: "warning",
  },
  error: {
    title: "Rincian tidak dapat dimuat",
    description: "Rincian gagal dimuat. Muat ulang halaman, atau hubungi Niuva bila masalahnya berlanjut.",
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
  headingLevel = 3,
  className,
}: MoneySummaryProps) {
  const notice = sourceStatus === "ready" ? null : statusNoticeCopy[sourceStatus];
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section
      aria-busy={sourceStatus === "loading" || undefined}
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-card",
        variant === "compact" ? "p-4" : "p-5 sm:p-6",
        className,
      )}
      data-component="money-summary"
      data-source-status={sourceStatus}
      data-variant={variant}
    >
      <div className="flex items-start justify-between gap-3">
        <Heading className="text-xl font-medium tracking-[-0.015em]">{title ?? "Rincian biaya"}</Heading>
        {/* A badge only marks a state that needs attention; "ready" is the normal case. */}
        {sourceStatus === "ready" ? null : (
          <Badge variant={getBadgeVariant(sourceStatus)}>{statusLabels[sourceStatus]}</Badge>
        )}
      </div>
      {description ? (
        <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">{description}</p>
      ) : null}

      <dl className="mt-5 divide-y divide-border border-y border-border">
        {lines.map((line, index) => (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3" key={`${line.label}-${index}`}>
            <dt className="min-w-0">
              <span className="block text-ui font-medium">{line.label}</span>
              {line.detail ? <span className="mt-0.5 block text-caption text-muted-foreground">{line.detail}</span> : null}
            </dt>
            <dd className="text-ui font-medium tabular-nums">{line.value}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-4">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="text-right">
            <span className="block text-2xl font-semibold tracking-[-0.015em] tabular-nums">{total}</span>
            <span className="text-caption tabular-nums text-muted-foreground">{currency}</span>
          </dd>
        </div>
      </dl>

      {note ? <p className="mt-4 text-caption leading-[1.45] text-muted-foreground">{note}</p> : null}

      {notice ? (
        <StatusNotice
          action={action}
          className="mt-4 p-3"
          description={notice.description}
          role={sourceStatus === "error" ? "alert" : "status"}
          title={notice.title}
          tone={notice.tone}
        />
      ) : null}

      {!notice && action ? <div className="mt-5 flex flex-wrap gap-2">{action}</div> : null}
    </section>
  );
}
