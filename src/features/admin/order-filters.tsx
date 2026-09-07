"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type AdminOrderTypeFilter = "all" | "RETAIL" | "CUSTOM_PRINT";
export type AdminOrderStatusFilter = "all" | "payment" | "production" | "shipping";
export type AdminOrderExceptionFilter = "all" | "exceptions";

type OrderFiltersProps = Readonly<{
  disabled: boolean;
  exceptionFilter: AdminOrderExceptionFilter;
  onExceptionChange: (value: AdminOrderExceptionFilter) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AdminOrderStatusFilter) => void;
  onTypeChange: (value: AdminOrderTypeFilter) => void;
  search: string;
  statusFilter: AdminOrderStatusFilter;
  typeFilter: AdminOrderTypeFilter;
}>;

const typeOptions = [
  { label: "Semua jenis", value: "all" },
  { label: "Ready-made", value: "RETAIL" },
  { label: "Custom print", value: "CUSTOM_PRINT" },
] as const satisfies readonly Readonly<{ label: string; value: AdminOrderTypeFilter }>[];

const statusOptions = [
  { label: "Semua status", value: "all" },
  { label: "Pembayaran", value: "payment" },
  { label: "Produksi", value: "production" },
  { label: "Pengiriman", value: "shipping" },
] as const satisfies readonly Readonly<{ label: string; value: AdminOrderStatusFilter }>[];

const exceptionOptions = [
  { label: "Semua order", value: "all" },
  { label: "Hanya exception", value: "exceptions" },
] as const satisfies readonly Readonly<{ label: string; value: AdminOrderExceptionFilter }>[];

export function OrderFilters({
  disabled,
  exceptionFilter,
  onExceptionChange,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  search,
  statusFilter,
  typeFilter,
}: OrderFiltersProps) {
  return (
    <div className="grid gap-5" data-component="admin-order-filters">
      <div className="max-w-xl">
        <label className="text-sm font-medium" htmlFor="admin-order-search">Cari nomor order</label>
        <Input
          className="mt-2 min-h-11"
          disabled={disabled}
          id="admin-order-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Contoh: ORD-EX-4072"
          type="search"
          value={search}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <fieldset disabled={disabled}>
          <legend className="text-sm font-medium">Jenis order</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="group">
            {typeOptions.map((option) => (
              <Button
                aria-pressed={typeFilter === option.value}
                className="min-h-11 cursor-pointer"
                key={option.value}
                onClick={() => onTypeChange(option.value)}
                type="button"
                variant={typeFilter === option.value ? "default" : "outline"}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={disabled}>
          <legend className="text-sm font-medium">Tahap operasional</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="group">
            {statusOptions.map((option) => (
              <Button
                aria-pressed={statusFilter === option.value}
                className="min-h-11 cursor-pointer"
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                type="button"
                variant={statusFilter === option.value ? "default" : "outline"}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={disabled}>
          <legend className="text-sm font-medium">Exception</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="group">
            {exceptionOptions.map((option) => (
              <Button
                aria-pressed={exceptionFilter === option.value}
                className="min-h-11 cursor-pointer"
                key={option.value}
                onClick={() => onExceptionChange(option.value)}
                type="button"
                variant={exceptionFilter === option.value ? "default" : "outline"}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
