import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import {
  adjustStockAction,
  replaceProductMediaAction,
  updateProductAction,
  updateVariantAction,
} from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, type AdminProductDetail } from "@/modules/admin/operations";

export const metadata: Metadata = { title: "Product detail admin · Niuva", robots: { follow: false, index: false } };
const currencyFormatter = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });

export default async function AdminProductDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;
  const product = await loadProduct(access, id);
  if (product === null) return <AdminDataUnavailableView role={access.profile.role} title="Detail produk belum dapat dimuat" />;

  return (
    <AdminShell active="products" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="product-detail" id="main-content">
        <header className="border-b border-border pb-6">
          <Link className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/products">← Kembali ke Products &amp; Stock</Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">{product.category?.name ?? "Tanpa kategori"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">{product.name}</h1><p className="mt-2 font-mono text-sm text-muted-foreground">{product.slug}</p></div><span className="rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">{product.isPublished ? "Published" : "Draft"}</span></div>
        </header>

        <section aria-labelledby="product-editor-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="product-editor-title">Editor produk</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Perubahan nama, slug, deskripsi, kategori, dan status publikasi divalidasi server. Pastikan dataset launch dan foto sudah disetujui Owner.</p>
          <AdminActionForm action={updateProductAction} className="mt-5" submitLabel="Simpan produk">
            <input name="productId" type="hidden" value={product.id} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama produk" name="name" required value={product.name} /><Field label="Slug" name="slug" required value={product.slug} /><Field label="Category ID (opsional)" name="categoryId" value={product.category?.id ?? ""} /></div>
            <label className="grid gap-2 text-sm font-medium" htmlFor="product-description"><span>Deskripsi</span><textarea className={textareaClass} defaultValue={product.description} id="product-description" name="description" required rows={4} /></label>
            <label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor="product-published"><input className="size-5 accent-[var(--color-brand-700)]" defaultChecked={product.isPublished} id="product-published" name="isPublished" type="checkbox" /><span>Publikasikan produk di katalog</span></label>
          </AdminActionForm>
        </section>

        <section aria-labelledby="media-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="media-title">Mapping foto produk</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Gunakan storage key publik yang sudah ada di `public/media/products/`. Tidak ada upload atau penghapusan object storage otomatis dari form ini.</p>
          <AdminActionForm action={replaceProductMediaAction} className="mt-5" submitLabel="Simpan mapping foto"><input name="productId" type="hidden" value={product.id} /><label className="grid gap-2 text-sm font-medium" htmlFor="product-media-json"><span>Media JSON <span className="font-normal text-muted-foreground">(array altText, sortOrder, storageKey)</span></span><textarea className={`${textareaClass} min-h-40 font-mono`} defaultValue={JSON.stringify(product.media, null, 2)} id="product-media-json" name="mediaJson" required rows={8} /></label></AdminActionForm>
          {product.media.length === 0 ? <StatusNotice className="mt-5" tone="warning" title="Belum ada foto" description="Produk tetap tersimpan sebagai draft sampai media production dipetakan." /> : <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">{product.media.map((media) => <li className="rounded-lg border border-border px-3 py-2" key={media.id}><span className="font-mono text-xs">{media.storageKey}</span><span className="mt-1 block text-muted-foreground">{media.altText}</span></li>)}</ul>}
        </section>

        <section aria-labelledby="variants-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="variants-title">Varian &amp; stok</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Harga, dimensi, dan status varian ditulis ke database melalui CatalogService. Penyesuaian stok menjaga reservasi aktif tetap aman.</p>
          {product.variants.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Belum ada varian.</p> : <div className="mt-5 grid gap-5">{product.variants.map((variant) => <article className="rounded-lg border border-border p-4" key={variant.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{variant.name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{variant.sku}</p></div><span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold">{variant.isActive ? "Aktif" : "Nonaktif"}</span></div><AdminActionForm action={updateVariantAction} className="mt-5" submitLabel="Simpan varian"><input name="variantId" type="hidden" value={variant.id} /><input name="productId" type="hidden" value={product.id} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field id={`variant-name-${variant.id}`} label="Nama" name="name" required value={variant.name} /><Field id={`variant-sku-${variant.id}`} label="SKU" name="sku" required value={variant.sku} /><Field id={`variant-price-${variant.id}`} label="Harga (Rp)" name="priceRp" required value={variant.priceRp} /><Field id={`variant-weight-${variant.id}`} label="Berat (g)" name="weightGrams" required value={variant.weightGrams} /><Field id={`variant-length-${variant.id}`} label="Panjang (cm)" name="lengthCm" value={variant.lengthCm ?? ""} /><Field id={`variant-width-${variant.id}`} label="Lebar (cm)" name="widthCm" value={variant.widthCm ?? ""} /><Field id={`variant-height-${variant.id}`} label="Tinggi (cm)" name="heightCm" value={variant.heightCm ?? ""} /></div><label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor={`variant-active-${variant.id}`}><input className="size-5 accent-[var(--color-brand-700)]" defaultChecked={variant.isActive} id={`variant-active-${variant.id}`} name="isActive" type="checkbox" /><span>Varian aktif</span></label></AdminActionForm><div className="mt-5 border-t border-border pt-5"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><p className="text-sm font-semibold">Stok tersimpan</p><p className="mt-1 text-xs text-muted-foreground">{variant.stockOnHand} unit · {currencyFormatter.format(BigInt(variant.priceRp))} per unit</p></div><AdminActionForm action={adjustStockAction} submitLabel="Simpan stok"><input name="variantId" type="hidden" value={variant.id} /><input name="productId" type="hidden" value={product.id} /><Field id={`variant-stock-${variant.id}`} label="Stok baru" name="stockOnHand" required type="number" value={String(variant.stockOnHand)} /></AdminActionForm></div></div></article>)}</div>}
        </section>
      </main>
    </AdminShell>
  );
}

async function loadAdminAccess(): Promise<AdminAccess | null> { try { return await requireAdmin(); } catch { return null; } }
async function loadProduct(access: AdminAccess, id: string): Promise<AdminProductDetail | null> { try { return await new AdminOperationsService({ authorize: async () => access }).getProduct(id); } catch { return null; } }
function Field({ id, label, name, required, type = "text", value }: Readonly<{ id?: string; label: string; name: string; required?: boolean; type?: string; value: string }>) { const fieldId = id ?? name; return <label className="grid gap-2 text-sm font-medium" htmlFor={fieldId}><span>{label}</span><input className={inputClass} defaultValue={value} id={fieldId} name={name} required={required} type={type} /></label>; }
const inputClass = "min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
const textareaClass = "min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
