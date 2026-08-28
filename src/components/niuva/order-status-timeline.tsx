import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  LockKeyhole,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OrderStatusTimelineVariant = "retail-order" | "custom-quote";
export type OrderStatusTimelineSize = "default" | "compact";
export type OrderStatusStepState =
  | "pending"
  | "current"
  | "completed"
  | "delayed"
  | "failed"
  | "cancelled"
  | "access-expired";

export type OrderStatusStep = {
  id: string;
  label: string;
  state: OrderStatusStepState;
  description?: string;
  timestamp?: string;
};

export type OrderStatusTimelineProps = {
  steps: readonly OrderStatusStep[];
  variant?: OrderStatusTimelineVariant;
  size?: OrderStatusTimelineSize;
  title?: string;
  description?: string;
  nextExpectation?: string;
  action?: ReactNode;
  className?: string;
};

const variantLabels: Record<OrderStatusTimelineVariant, string> = {
  "retail-order": "Retail order",
  "custom-quote": "Custom quote",
};

const stateLabels: Record<OrderStatusStepState, string> = {
  pending: "Menunggu",
  current: "Sedang berjalan",
  completed: "Selesai",
  delayed: "Terlambat",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  "access-expired": "Akses berakhir",
};

const stateIcons: Record<OrderStatusStepState, LucideIcon> = {
  pending: Circle,
  current: Clock3,
  completed: CheckCircle2,
  delayed: Clock3,
  failed: AlertCircle,
  cancelled: XCircle,
  "access-expired": LockKeyhole,
};

const stateClasses: Record<OrderStatusStepState, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  current: "border-brand-400 bg-brand-100 text-brand-800",
  completed: "border-success-border bg-success-background text-success",
  delayed: "border-warning-border bg-warning-background text-warning",
  failed: "border-destructive-border bg-destructive-background text-destructive",
  cancelled: "border-destructive-border bg-destructive-background text-destructive",
  "access-expired": "border-warning-border bg-warning-background text-warning",
};

export function OrderStatusTimeline({
  steps,
  variant = "retail-order",
  size = "default",
  title,
  description,
  nextExpectation,
  action,
  className,
}: OrderStatusTimelineProps) {
  return (
    <Card
      className={cn("shadow-card", size === "compact" && "text-sm", className)}
      data-component="order-status-timeline"
      data-size={size}
      data-variant={variant}
      size={size === "compact" ? "sm" : "default"}
    >
      <CardHeader>
        <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.14em] text-brand-700">
          {variantLabels[variant]}
        </p>
        <h3 className="text-base leading-snug font-semibold">{title ?? "Status proses"}</h3>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>

      <CardContent>
        <ol aria-label={`Tahapan ${variantLabels[variant]}`} className="space-y-0">
          {steps.map((step, index) => {
            const Icon = stateIcons[step.state];
            const isCurrent = step.state === "current";

            return (
              <li
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative flex gap-3 pb-5 last:pb-0",
                  size === "compact" && "gap-2 pb-4",
                )}
                data-state={step.state}
                key={step.id}
              >
                <div className="relative flex w-8 shrink-0 justify-center">
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-8 bottom-0 w-px bg-border"
                    />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-10 flex size-8 items-center justify-center rounded-full border",
                      size === "compact" && "size-7",
                      stateClasses[step.state],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                    <span
                      className={cn(
                        "font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground",
                        step.state === "failed" || step.state === "cancelled"
                          ? "text-destructive"
                          : step.state === "delayed" || step.state === "access-expired"
                            ? "text-warning"
                            : step.state === "completed"
                              ? "text-success"
                              : step.state === "current"
                                ? "text-brand-700"
                                : undefined,
                      )}
                    >
                      {stateLabels[step.state]}
                    </span>
                  </div>
                  {step.description ? (
                    <p className="text-xs leading-5 text-muted-foreground">{step.description}</p>
                  ) : null}
                  {step.timestamp ? (
                    <p className="font-mono text-xs text-muted-foreground">{step.timestamp}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>

      {nextExpectation || action ? (
        <CardFooter className="flex-wrap items-start justify-between gap-3">
          {nextExpectation ? (
            <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">Berikutnya:</span> {nextExpectation}
            </p>
          ) : <span />}
          {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
