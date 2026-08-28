import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type EvidenceCardVariant = "project" | "process" | "capability";
export type EvidenceCardSize = "default" | "compact";

export type EvidenceCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  variant?: EvidenceCardVariant;
  size?: EvidenceCardSize;
  href?: string;
  actionLabel?: string;
  meta?: readonly string[];
  media?: ReactNode;
  mediaLabel?: string;
  className?: string;
};

const variantLabels: Record<EvidenceCardVariant, string> = {
  project: "Project",
  process: "Process",
  capability: "Capability",
};

export function EvidenceCard({
  eyebrow,
  title,
  description,
  variant = "project",
  size = "default",
  href,
  actionLabel,
  meta,
  media,
  mediaLabel,
  className,
}: EvidenceCardProps) {
  const showAction = Boolean(href && actionLabel);

  return (
    <Card
      className={cn("shadow-card", className)}
      data-component="evidence-card"
      data-size={size}
      data-variant={variant}
      size={size === "compact" ? "sm" : "default"}
    >
      {media ? (
        <div
          aria-label={mediaLabel ?? `Bukti ${title}`}
          className="overflow-hidden rounded-t-xl border-b border-border bg-muted"
          role="img"
        >
          {media}
        </div>
      ) : null}
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.14em] text-brand-700">
            {eyebrow}
          </p>
          <Badge variant="outline">{variantLabels[variant]}</Badge>
        </div>
        <h3 className="text-base leading-snug font-medium">{title}</h3>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {meta?.length ? (
        <CardContent>
          <ul className="flex flex-wrap gap-2" aria-label="Metadata bukti">
            {meta.map((item) => (
              <li
                className="rounded-lg border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
      {showAction ? (
        <CardFooter>
          <a
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href={href}
          >
            {actionLabel}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </CardFooter>
      ) : null}
    </Card>
  );
}
