import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { adminStatusLabel, adminStatusTone, type AdminStatusTone } from "@/modules/admin/status-labels";

/** Shared table header style for every Admin list: sentence case, quiet band, no tracking. */
export const adminTableHeaderClass = "border-b border-border bg-neutral-50 text-caption text-muted-foreground";

const toneClasses: Readonly<Record<AdminStatusTone, string>> = {
  attention: "border-warning-border bg-warning-background text-warning",
  danger: "border-destructive-border bg-destructive-background text-destructive",
  neutral: "border-border bg-neutral-50 text-foreground",
  success: "border-success-border bg-success-background text-success",
};

/** One status chip for Admin; the label and colour come from the stored status. */
export function AdminStatusBadge({ className, label, tone, value }: Readonly<{ className?: string; label?: string; tone?: AdminStatusTone; value: string }>) {
  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-caption font-medium", toneClasses[tone ?? adminStatusTone(value)], className)}>
      {label ?? adminStatusLabel(value)}
    </span>
  );
}

/** A count above a list: label first, then the number. */
export function AdminSummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card className="gap-1 p-4 sm:p-5">
      <p className="text-caption leading-[1.45] text-muted-foreground">{label}</p>
      <p className="text-2xl font-medium tracking-[-0.015em] tabular-nums">{value}</p>
    </Card>
  );
}
