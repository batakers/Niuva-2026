import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type OptionChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "aria-pressed" | "children" | "disabled" | "type"
> & {
  label: string;
  selected?: boolean;
  unavailable?: boolean;
  unavailableLabel?: string;
  disabled?: boolean;
};

export function OptionChip({
  className,
  disabled = false,
  label,
  selected = false,
  unavailable = false,
  unavailableLabel = "Tidak tersedia",
  ...buttonProps
}: OptionChipProps) {
  const isDisabled = disabled || unavailable;
  const isSelected = selected && !unavailable;

  return (
    <button
      {...buttonProps}
      aria-pressed={isSelected}
      className={cn(
        "inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-lg border-2 border-border bg-background px-3 py-2 text-left text-sm leading-5 font-medium text-foreground transition-colors duration-150 ease-[var(--ease-standard-token)] outline-none select-none hover:not-disabled:border-primary hover:not-disabled:text-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 motion-reduce:transition-none",
        isSelected && "border-primary text-primary shadow-[inset_0_-3px_0_var(--primary)]",
        unavailable && "bg-muted text-muted-foreground",
        className,
      )}
      data-component="option-chip"
      data-state={unavailable ? "unavailable" : isSelected ? "selected" : "default"}
      data-unavailable={unavailable || undefined}
      disabled={isDisabled}
      type="button"
    >
      {isSelected ? (
        <span
          aria-hidden="true"
          className="inline-grid size-[18px] shrink-0 place-items-center rounded-full bg-primary text-[0.7rem] leading-none text-primary-foreground"
        >
          ✓
        </span>
      ) : null}
      <span className="min-w-0 break-words">{label}</span>
      {unavailable ? (
        <span className="min-w-0 break-words text-xs leading-4 font-normal text-muted-foreground">
          ({unavailableLabel})
        </span>
      ) : null}
    </button>
  );
}
