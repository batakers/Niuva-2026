import Link from "next/link";
import { withAdminReturnTo } from "@/modules/admin/navigation";

import { AdminActionForm } from "@/app/admin/admin-action-form";
import { adjustStockAction } from "@/app/admin/actions";

const inputClass = "min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

export function StockAdjustmentPanel({
  productId,
  stockOnHand,
  variantId,
  returnTo = "/admin/products",
}: Readonly<{ productId: string; stockOnHand: number; variantId: string; returnTo?: string }>) {
  return (
    <div className="mt-4 grid gap-3">
      <AdminActionForm action={adjustStockAction} submitLabel="Simpan penyesuaian stok">
        <input name="variantId" type="hidden" value={variantId} />
        <input name="productId" type="hidden" value={productId} />
        <input name="expectedStockOnHand" type="hidden" value={stockOnHand} />
        <label className="grid gap-2 text-sm font-medium" htmlFor={`stock-${variantId}`}>
          <span>Stok fisik baru</span>
          <input className={inputClass} defaultValue={stockOnHand} id={`stock-${variantId}`} min={0} name="stockOnHand" required type="number" />
        </label>
        <label className="grid gap-2 text-sm font-medium" htmlFor={`reason-${variantId}`}>
          <span>Alasan penyesuaian</span>
          <textarea className={`${inputClass} min-h-24`} id={`reason-${variantId}`} maxLength={500} name="reason" required rows={3} />
        </label>
      </AdminActionForm>
      <Link
        className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href={withAdminReturnTo(`/admin/products/${productId}/stock/${variantId}`, returnTo)}
      >
        Lihat riwayat stok varian
      </Link>
    </div>
  );
}
