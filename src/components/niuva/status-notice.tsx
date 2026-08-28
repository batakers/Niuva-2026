import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type StatusNoticeTone = "success" | "warning" | "info" | "error";

export type StatusNoticeProps = {
  tone: StatusNoticeTone;
  title: string;
  description: string;
  reason?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  role?: "status" | "alert";
  className?: string;
};

const icons: Record<StatusNoticeTone, LucideIcon> = {
  success: CheckCircle2,
  warning: TriangleAlert,
  info: Info,
  error: AlertCircle,
};

const toneClasses: Record<StatusNoticeTone, string> = {
  success: "border-success-border bg-success-background text-success",
  warning: "border-warning-border bg-warning-background text-warning",
  info: "border-info-border bg-info-background text-info",
  error: "border-destructive-border bg-destructive-background text-destructive",
};

export function StatusNotice({
  tone,
  title,
  description,
  reason,
  action,
  secondaryAction,
  role,
  className,
}: StatusNoticeProps) {
  const Icon = icons[tone];

  return (
    <Alert
      className={cn(
        "gap-3 p-4 [&>[data-slot=alert-description]]:text-current/80",
        toneClasses[tone],
        className,
      )}
      data-component="status-notice"
      data-tone={tone}
      role={role ?? (tone === "error" ? "alert" : "status")}
    >
      <Icon aria-hidden="true" className="mt-0.5" />
      <div className="min-w-0 space-y-1">
        <AlertTitle className="font-mono text-[0.68rem] uppercase tracking-[0.14em]">
          {tone}
        </AlertTitle>
        <p className="font-medium text-current">{title}</p>
        <AlertDescription className="text-current/80">
          {description}
        </AlertDescription>
        {reason ? <p className="text-xs text-current/80">Alasan: {reason}</p> : null}
        {action || secondaryAction ? (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </Alert>
  );
}
