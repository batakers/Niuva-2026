"use client";

import type { ActionQueueKind } from "@/components/niuva/action-queue-item";
import { Button } from "@/components/ui/button";

export type QueueFilter = "all" | ActionQueueKind;

type QueueFiltersProps = Readonly<{
  disabled: boolean;
  onChange: (filter: QueueFilter) => void;
  selected: QueueFilter;
}>;

const filterOptions = [
  { value: "all", label: "Semua" },
  { value: "inquiry", label: "Brief" },
  { value: "custom-review", label: "Custom Print" },
  { value: "quote", label: "Quote" },
  { value: "order", label: "Order" },
  { value: "package", label: "Pengukuran" },
  { value: "stock", label: "Stok" },
] as const satisfies readonly Readonly<{
  label: string;
  value: QueueFilter;
}>[];

export function QueueFilters({ disabled, onChange, selected }: QueueFiltersProps) {
  return (
    <div aria-label="Filter Action Queue" className="overflow-x-auto pb-1" role="group">
      <div className="flex min-w-max gap-2">
        {filterOptions.map((option) => {
          const isSelected = selected === option.value;

          return (
            <Button
              aria-pressed={isSelected}
              className="min-h-11 cursor-pointer"
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
              variant={isSelected ? "default" : "outline"}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
