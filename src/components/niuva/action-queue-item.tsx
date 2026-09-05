import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type ActionQueueKind = "inquiry" | "custom-review" | "order" | "package";
export type ActionQueueStatus =
  | "new"
  | "waiting"
  | "in-progress"
  | "blocked"
  | "completed"
  | "action-pending";

export type ActionQueueItemProps = {
  reference: string;
  kind: ActionQueueKind;
  status: ActionQueueStatus;
  summary: string;
  updatedAt: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
};

const kindLabels: Record<ActionQueueKind, string> = {
  inquiry: "Project brief",
  "custom-review": "Custom 3D Print",
  order: "Order",
  package: "Package",
};

const statusLabels: Record<ActionQueueStatus, string> = {
  new: "Baru",
  waiting: "Menunggu tindakan",
  "in-progress": "Sedang dikerjakan",
  blocked: "Terblokir",
  completed: "Selesai",
  "action-pending": "Tindakan menunggu konfirmasi",
};

const statusClasses: Record<ActionQueueStatus, string> = {
  new: "border-info-border bg-info-background text-info",
  waiting: "border-warning-border bg-warning-background text-warning",
  "in-progress": "border-info-border bg-info-background text-info",
  blocked: "border-destructive-border bg-destructive-background text-destructive",
  completed: "border-success-border bg-success-background text-success",
  "action-pending": "border-warning-border bg-warning-background text-warning",
};

export function ActionQueueItem({
  reference,
  kind,
  status,
  summary,
  updatedAt,
  primaryAction,
  secondaryActions,
  className,
}: ActionQueueItemProps) {
  return (
    <Card
      className={cn("shadow-card", className)}
      data-component="action-queue-item"
      data-status={status}
      role="listitem"
      aria-label={`${kindLabels[kind]} ${reference}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-xs font-medium text-brand-700">
              {kindLabels[kind]}
            </p>
            <h3 className="mt-1 text-sm leading-snug font-semibold">{summary}</h3>
          </div>
          <Badge className={cn("shrink-0", statusClasses[status])} variant="outline">
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="font-mono text-xs font-medium text-foreground">{reference}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon aria-hidden="true" className="size-3.5" name="clock-3" />
          Diperbarui {updatedAt}
        </p>
      </CardContent>
      {primaryAction || secondaryActions ? (
        <CardFooter className="flex-wrap gap-2">
          {primaryAction}
          {secondaryActions}
        </CardFooter>
      ) : null}
    </Card>
  );
}
