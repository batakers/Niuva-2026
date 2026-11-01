import type { ReactNode, Ref } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { motionSystemClasses } from "@/design/motion";
import { cn } from "@/lib/utils";

export type StatusNoticeTone = "success" | "warning" | "info" | "error";
/** `inline` drops the surface: an icon and a line or two next to the action that caused it. */
export type StatusNoticeSize = "default" | "compact" | "inline";

export type StatusNoticeProps = {
  tone: StatusNoticeTone;
  title: string;
  description?: string;
  /** Content a sentence cannot carry, such as a list of fields to fix or preview controls. */
  children?: ReactNode;
  reason?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onAction?: () => void;
  ariaLive?: "polite" | "assertive" | "off";
  /** `note` is advisory copy rendered with the page, so it is not announced as a live update. */
  role?: "status" | "alert" | "note";
  size?: StatusNoticeSize;
  /** The notice is the result of a client action and enters with motion; never for notices rendered with the page. */
  enter?: boolean;
  className?: string;
  /** Focus target after a submit, together with `tabIndex={-1}`. */
  ref?: Ref<HTMLDivElement>;
  tabIndex?: number;
  "aria-label"?: string;
};

const icons: Record<StatusNoticeTone, IconName> = {
  success: "check-circle-2",
  warning: "triangle-alert",
  info: "info",
  error: "alert-circle",
};

// The surface carries the tone quietly; the icon shape and the words carry the meaning, so the
// state never depends on color alone (DESIGN.md Form, Focus, Status).
const surfaceClasses: Record<StatusNoticeTone, string> = {
  success: "border-success-border/40 bg-success-background",
  warning: "border-warning-border/40 bg-warning-background",
  info: "border-info-border/40 bg-info-background",
  error: "border-destructive-border/40 bg-destructive-background",
};

const iconClasses: Record<StatusNoticeTone, string> = {
  success: "*:[svg]:text-success-icon",
  warning: "*:[svg]:text-warning-icon",
  info: "*:[svg]:text-info-icon",
  error: "*:[svg]:text-destructive-icon",
};

const sizeClasses: Record<StatusNoticeSize, string> = {
  default: "p-4",
  compact: "p-3",
  inline: "border-0 bg-transparent p-0",
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
  children,
  reason,
  action,
  secondaryAction,
  actionLabel,
  secondaryActionLabel,
  onAction,
  ariaLive,
  role,
  size = "default",
  enter = false,
  className,
  ref,
  tabIndex,
  "aria-label": ariaLabel,
}: StatusNoticeProps) {
  const resolvedRole = role ?? (tone === "error" ? "alert" : "status");
  const resolvedAriaLive = resolvedRole === "note" ? undefined : ariaLive ?? (resolvedRole === "alert" ? "assertive" : "polite");
  const inline = size === "inline";
  const primaryAction =
    action ??
    (actionLabel ? (
      <Button onClick={onAction} size={size === "default" ? "default" : "sm"} type="button">
        {actionLabel}
      </Button>
    ) : null);
  const secondaryActionNode =
    secondaryAction ??
    (secondaryActionLabel ? (
      <Button size={size === "default" ? "default" : "sm"} type="button" variant="outline">
        {secondaryActionLabel}
      </Button>
    ) : null);
  const actions = primaryAction || secondaryActionNode ? (
    <div className={`flex flex-wrap items-center gap-2 ${inline ? "" : "pt-3"}`}>
      {primaryAction}
      {secondaryActionNode}
    </div>
  ) : null;
  // Sizes sit on the text elements, not the root: the shared class merger reads `text-ui` as a color.
  const words = (
    <div className="min-w-0 space-y-1">
      <p className={`text-ui ${inline ? "font-medium" : "font-semibold"} text-foreground`}>{title}</p>
      {description ? <p className={`${inline ? "text-caption" : "text-ui"} text-pretty text-muted-foreground`}>{description}</p> : null}
      {reason ? <p className="text-caption text-muted-foreground">Alasan: {reason}</p> : null}
      {children ? <div className="pt-1 text-ui text-foreground">{children}</div> : null}
    </div>
  );

  return (
    <Alert
      aria-label={ariaLabel}
      className={cn(
        "gap-0 rounded-[var(--radius-control)] text-foreground has-[>svg]:gap-x-3",
        sizeClasses[size],
        inline ? null : surfaceClasses[tone],
        iconClasses[tone],
        enter && motionSystemClasses.enter,
        className,
      )}
      data-component="status-notice"
      data-size={size}
      data-tone={tone}
      aria-live={resolvedAriaLive}
      ref={ref}
      role={resolvedRole}
      tabIndex={tabIndex}
    >
      <Icon aria-hidden="true" className="size-4.5" name={icons[tone]} />
      <AlertTitle className="sr-only">{toneLabels[tone]}</AlertTitle>
      {inline ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-1">
          {words}
          {actions}
        </div>
      ) : (
        <div className="min-w-0">
          {words}
          {actions}
        </div>
      )}
    </Alert>
  );
}
