import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
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

// Names the step list for assistive technology ("Tahapan pesanan Toko").
const variantLabels: Record<OrderStatusTimelineVariant, string> = {
  "retail-order": "pesanan Toko",
  "custom-quote": "pesanan Custom 3D Print",
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

const stateIcons: Record<OrderStatusStepState, IconName> = {
  pending: "circle",
  current: "clock-3",
  completed: "check-circle-2",
  delayed: "clock-3",
  failed: "alert-circle",
  cancelled: "x-circle",
  "access-expired": "lock-keyhole",
};

const stateClasses: Record<OrderStatusStepState, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  current: "border-primary bg-primary text-primary-foreground",
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
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-card",
        size === "compact" ? "p-4 text-sm" : "p-5 sm:p-6",
        className,
      )}
      data-component="order-status-timeline"
      data-size={size}
      data-variant={variant}
    >
      <h3 className="text-lg font-medium tracking-[-0.01em]">{title ?? "Status proses"}</h3>
      {description ? (
        <p className="mt-1 text-ui font-normal text-muted-foreground">{description}</p>
      ) : null}

      <ol aria-label={`Tahapan ${variantLabels[variant]}`} className="mt-5">
        {steps.map((step, index) => {
          const iconName = stateIcons[step.state];
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
                  <Icon aria-hidden="true" className="size-4" name={iconName} />
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-1 pt-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className={cn("text-base", isCurrent ? "font-semibold" : "font-medium")}>{step.label}</p>
                  <span
                    className={cn(
                      "text-caption font-medium text-muted-foreground",
                      step.state === "failed" || step.state === "cancelled"
                        ? "text-destructive"
                        : step.state === "delayed" || step.state === "access-expired"
                          ? "text-warning"
                          : step.state === "completed"
                            ? "text-success"
                            : step.state === "current"
                              ? "text-primary"
                              : undefined,
                    )}
                  >
                    {stateLabels[step.state]}
                  </span>
                </div>
                {step.description ? (
                  <p className="text-ui font-normal leading-[1.55] text-muted-foreground">{step.description}</p>
                ) : null}
                {step.timestamp ? (
                  <p className="text-caption tabular-nums text-muted-foreground">{step.timestamp}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {nextExpectation || action ? (
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4">
          {nextExpectation ? (
            <p className="min-w-0 flex-1 text-ui font-normal leading-[1.55] text-muted-foreground">
              <span className="font-semibold text-foreground">Berikutnya:</span> {nextExpectation}
            </p>
          ) : <span />}
          {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
