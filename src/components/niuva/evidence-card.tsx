import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
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
  mediaAlt?: string;
  /** @deprecated Use mediaAlt for the accessible media description. */
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
  mediaAlt,
  mediaLabel,
  className,
}: EvidenceCardProps) {
  const showAction = Boolean(href && actionLabel);
  const resolvedMediaAlt = mediaAlt ?? mediaLabel ?? `Bukti ${title}`;

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
          aria-label={resolvedMediaAlt}
          className="overflow-hidden rounded-t-xl border-b border-border bg-muted"
          role="img"
        >
          {media}
        </div>
      ) : null}
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-body text-xs font-medium text-brand-700">
            {eyebrow}
          </p>
          {variant !== "capability" ? (
            <Badge variant="outline">{variantLabels[variant]}</Badge>
          ) : null}
        </div>
        <h3 className="text-base leading-snug font-medium">{title}</h3>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {meta?.length ? (
        <CardContent>
          <ul className="flex flex-wrap gap-2" aria-label="Metadata bukti">
            {meta.map((item) => (
              <li
                className="rounded-lg border border-border bg-muted px-2 py-1 font-body text-xs text-muted-foreground"
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
            <Icon aria-hidden="true" className="size-4" name="arrow-up-right" />
          </a>
        </CardFooter>
      ) : null}
    </Card>
  );
}
