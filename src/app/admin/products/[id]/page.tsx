import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { normalizeAdminReturnTo } from "@/modules/admin/navigation";
import { z } from "zod";

import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminMediaEditor } from "@/app/admin/admin-media-editor";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import {
  replaceProductMediaAction,
  updateProductAction,
  updateVariantAction,
} from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AdminOperationsService } from "@/modules/admin/operations";
import { StockAdjustmentPanel } from "./stock-adjustment-panel";

export const metadata: Metadata = { title: "Product detail admin · Niuva", robots: { follow: false, index: false } };
const currencyFormatter = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });

export default async function AdminProductDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const service = new AdminOperationsService({ authorize: async () => access });
  const result = await loadAdminRecordLogged("page:/admin/products/[id]", () => service.getProduct(id), { id, op: "detail" });
  if (result.status === "not-found") notFound();
  if (result.status === "unavailable") return <AdminDataUnavailableView active="products" kind={result.kind} role={access.profile.role} title="Detail produk belum dapat dimuat" />;
  const product = result.record;
  const returnTo = normalizeAdminReturnTo((await searchParams)?.returnTo, "/admin/products");

  return (
    <AdminShell active="products" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="product-detail" id="main-content">
        <AdminPageHeader title={product.name} description={`${product.slug} · ${product.isPublished ? "Published" : "Draft"}`} returnHref={returnTo} returnLabel="Kembali ke Products & Stock" breadcrumbs={[{ label: "Products & Stock", href: returnTo }, { label: product.name }]} />

        <section aria-labelledby="product-editor-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="product-editor-title">Editor produk</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Perubahan nama, slug, deskripsi, kategori, dan status publikasi divalidasi server. Pastikan dataset launch dan foto sudah disetujui Owner.</p>
          <AdminActionForm action={updateProductAction} className="mt-5" submitLabel="Simpan produk">
            <input name="productId" type="hidden" value={product.id} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama produk" name="name" required value={product.name} /><Field label="Slug" name="slug" required value={product.slug} /><Field label="Category ID (opsional)" name="categoryId" value={product.category?.id ?? ""} /></div>
            <label className="grid gap-2 text-sm font-medium" htmlFor="product-description"><span>Deskripsi</span><textarea className={textareaClass} defaultValue={product.description} id="product-description" name="description" required rows={4} /></label>
            <label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor="product-published"><input className="size-5 accent-primary" defaultChecked={product.isPublished} id="product-published" name="isPublished" type="checkbox" /><span>Publikasikan produk di katalog</span></label>
          </AdminActionForm>
        </section>

        <section aria-labelledby="media-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="media-title">Foto produk</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Gunakan foto produk yang sudah tersedia di penyimpanan publik Niuva. Susun urutan dan deskripsinya sebelum disimpan.</p>
          <AdminActionForm action={replaceProductMediaAction} className="mt-5" submitLabel="Simpan foto"><input name="productId" type="hidden" value={product.id} /><AdminMediaEditor label="Foto produk" media={product.media} /></AdminActionForm>
          {product.media.length === 0 ? <StatusNotice className="mt-5" tone="warning" title="Belum ada foto" description="Produk tetap tersimpan sebagai draft sampai media production dipetakan." /> : <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">{product.media.map((media) => <li className="rounded-lg border border-border px-3 py-2" key={media.id}><span className="font-mono text-xs">{media.storageKey}</span><span className="mt-1 block text-muted-foreground">{media.altText}</span></li>)}</ul>}
        </section>

        <section aria-labelledby="variants-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="variants-title">Varian &amp; stok</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Harga, dimensi, dan status varian ditulis ke database melalui CatalogService. Penyesuaian stok menjaga reservasi aktif tetap aman.</p>
          {product.variants.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Belum ada varian.</p> : <div className="mt-5 grid gap-5">{product.variants.map((variant) => <article className="rounded-lg border border-border p-4" key={variant.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{variant.name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{variant.sku}</p></div><span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold">{variant.isActive ? "Aktif" : "Nonaktif"}</span></div><AdminActionForm action={updateVariantAction} className="mt-5" submitLabel="Simpan varian"><input name="variantId" type="hidden" value={variant.id} /><input name="productId" type="hidden" value={product.id} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field id={`variant-name-${variant.id}`} label="Nama" name="name" required value={variant.name} /><Field id={`variant-sku-${variant.id}`} label="SKU" name="sku" required value={variant.sku} /><Field id={`variant-price-${variant.id}`} label="Harga (Rp)" name="priceRp" required value={variant.priceRp} /><Field id={`variant-weight-${variant.id}`} label="Berat (g)" name="weightGrams" required value={variant.weightGrams} /><Field id={`variant-length-${variant.id}`} label="Panjang (cm)" name="lengthCm" value={variant.lengthCm ?? ""} /><Field id={`variant-width-${variant.id}`} label="Lebar (cm)" name="widthCm" value={variant.widthCm ?? ""} /><Field id={`variant-height-${variant.id}`} label="Tinggi (cm)" name="heightCm" value={variant.heightCm ?? ""} /></div><label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor={`variant-active-${variant.id}`}><input className="size-5 accent-primary" defaultChecked={variant.isActive} id={`variant-active-${variant.id}`} name="isActive" type="checkbox" /><span>Varian aktif</span></label></AdminActionForm><div className="mt-5 border-t border-border pt-5"><div><p className="text-sm font-semibold">Stok fisik tersimpan</p><p className="mt-1 text-xs text-muted-foreground">{variant.stockOnHand} unit · {currencyFormatter.format(BigInt(variant.priceRp))} per unit</p></div><StockAdjustmentPanel productId={product.id} stockOnHand={variant.stockOnHand} variantId={variant.id} returnTo={returnTo} /></div></article>)}</div>}
        </section>
      </main>
    </AdminShell>
  );
}

function Field({ id, label, name, required, type = "text", value }: Readonly<{ id?: string; label: string; name: string; required?: boolean; type?: string; value: string }>) { const fieldId = id ?? name; return <label className="grid gap-2 text-sm font-medium" htmlFor={fieldId}><span>{label}</span><input className={inputClass} defaultValue={value} id={fieldId} name={name} required={required} type={type} /></label>; }
const inputClass = "min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
const textareaClass = "min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
