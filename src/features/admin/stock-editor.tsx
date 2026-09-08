"use client";

import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Input } from "@/components/ui/input";

import {
  stockAdjustmentReasonOptions,
  type ProductEditorErrors,
  type StockAdjustmentReason,
} from "./product-editor-data";

type StockEditorProps = Readonly<{
  disabled: boolean;
  errors: ProductEditorErrors;
  initialStockOnHand: string;
  onReasonChange: (value: string) => void;
  onStockBlur: () => void;
  onStockChange: (value: string) => void;
  reason: StockAdjustmentReason;
  stockOnHand: string;
}>;

export function StockEditor({
  disabled,
  errors,
  initialStockOnHand,
  onReasonChange,
  onStockBlur,
  onStockChange,
  reason,
  stockOnHand,
}: StockEditorProps) {
  const stockChanged = stockOnHand !== initialStockOnHand;
  const reasonError = errors.stockReason ?? (stockChanged && reason === "" ? "Pilih alasan saat jumlah stok berubah." : undefined);

  return (
    <section aria-labelledby="stock-editor-heading" className="border-t border-border pt-6" data-component="admin-stock-editor">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" id="stock-editor-heading">Penyesuaian stok</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Satu alasan diperlukan jika jumlah draft berubah.</p>
        </div>
        <p className="font-mono text-xs font-medium text-muted-foreground">Awal {initialStockOnHand} unit</p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <FormField
          description="Gunakan bilangan bulat nonnegatif. Server nantinya akan mengecek reservasi aktif sebelum menyimpan nilai ini."
          disabled={disabled}
          error={errors.stockOnHand}
          id="admin-product-stockOnHand"
          label="Stok fisik"
          required
        >
          <Input
            className="min-h-11"
            inputMode="numeric"
            onBlur={onStockBlur}
            onChange={(event) => onStockChange(event.target.value)}
            value={stockOnHand}
          />
        </FormField>

        <FormField
          description="Alasan adalah intent preview. Integrasi admin harus meneruskannya ke audit event yang diotorisasi server."
          disabled={disabled}
          error={reasonError}
          id="admin-product-stockReason"
          label="Alasan penyesuaian stok"
          required={stockChanged}
        >
          <select
            className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
            onBlur={onStockBlur}
            onChange={(event) => onReasonChange(event.target.value)}
            value={reason}
          >
            {stockAdjustmentReasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FormField>
      </div>

      {stockChanged ? (
        <StatusNotice
          className="mt-5"
          description="Preview mencatat perubahan ini secara lokal saja. Tidak ada stok produksi, reservasi, atau audit log yang diubah."
          reason={stockAdjustmentReasonOptions.find((option) => option.value === reason)?.label ?? "Belum dipilih"}
          title={`Draft stok berubah dari ${initialStockOnHand} menjadi ${stockOnHand || "kosong"} unit`}
          tone={reason === "" ? "warning" : "info"}
        />
      ) : null}
    </section>
  );
}
