import type { ReactNode } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type StatusNoticeTone = "success" | "warning" | "info" | "error";
export type StatusNoticeSize = "default" | "compact";

export type StatusNoticeProps = {
  tone: StatusNoticeTone;
  title: string;
  description: string;
  reason?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onAction?: () => void;
  ariaLive?: "polite" | "assertive" | "off";
  role?: "status" | "alert";
  size?: StatusNoticeSize;
  className?: string;
};

const icons: Record<StatusNoticeTone, IconName> = {
  success: "check-circle-2",
  warning: "triangle-alert",
  info: "info",
  error: "alert-circle",
};

const toneClasses: Record<StatusNoticeTone, string> = {
  success: "border-success-border bg-success-background text-success",
  warning: "border-warning-border bg-warning-background text-warning",
  info: "border-info-border bg-info-background text-info",
  error: "border-destructive-border bg-destructive-background text-destructive",
};

const toneLabels: Record<StatusNoticeTone, string> = {
  success: "Berhasil",
  warning: "Perlu perhatian",
  info: "Informasi",
  error: "Terjadi kendala",
};

export function StatusNotice({
  tone,
  title,
  description,
  reason,
  action,
  secondaryAction,
  actionLabel,
  secondaryActionLabel,
  onAction,
  ariaLive,
  role,
  size = "default",
  className,
}: StatusNoticeProps) {
  const resolvedRole = role ?? (tone === "error" ? "alert" : "status");
  const resolvedAriaLive = ariaLive ?? (resolvedRole === "alert" ? "assertive" : "polite");
  const primaryAction =
    action ??
    (actionLabel ? (
      <Button onClick={onAction} size={size === "compact" ? "sm" : "default"} type="button">
        {actionLabel}
      </Button>
    ) : null);
  const secondaryActionNode =
    secondaryAction ??
    (secondaryActionLabel ? (
      <Button size={size === "compact" ? "sm" : "default"} type="button" variant="outline">
        {secondaryActionLabel}
      </Button>
    ) : null);

  return (
    <Alert
      className={cn(
        "gap-3",
        size === "compact" ? "p-3" : "p-4",
        toneClasses[tone],
        className,
      )}
      data-component="status-notice"
      data-size={size}
      data-tone={tone}
      aria-live={resolvedAriaLive}
      role={resolvedRole}
    >
      <Icon aria-hidden="true" className="mt-0.5" name={icons[tone]} />
      <div className="min-w-0 space-y-1">
        <AlertTitle className="text-xs font-semibold">
          {toneLabels[tone]}
        </AlertTitle>
        <p className="font-medium text-current">{title}</p>
        <AlertDescription className="text-current">
          {description}
        </AlertDescription>
        {reason ? <p className="text-xs text-current">Alasan: {reason}</p> : null}
        {primaryAction || secondaryActionNode ? (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {primaryAction}
            {secondaryActionNode}
          </div>
        ) : null}
      </div>
    </Alert>
  );
}
