import { connection } from "next/server";
import { AdminShell, AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { Card } from "@/components/ui/card";
import { NativeInput } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/niuva/form-field";
import { CatalogService } from "@/modules/catalog/service";
import { AdminAccessView } from "../../admin-access-view";
import { loadAdminPageAccess } from "../../admin-page-access";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminActionForm } from "../../admin-action-form";
import { createProductDraftAction } from "../../content-create-actions";
import { recordAdminPageFailure } from "../../admin-page-failure";

export const metadata = { title: "Tambah produk · Niuva", robots: { index: false, follow: false } };

export default async function NewProductPage() {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  let categories;
  try { categories = await new CatalogService({ authorizeAdmin: async () => gate.access }).listCategories(); }
  catch (error) { return <AdminDataUnavailableView active="products" role={gate.access.profile.role} kind={recordAdminPageFailure(error, "page:/admin/products/new", { op: "categories" })} />; }
  return <AdminShell active="products" role={gate.access.profile.role}><main id="main-content" className="max-w-3xl">
    <AdminPageHeader title="Tambah produk" description="Simpan sebagai draft, lalu lengkapi varian dan foto sebelum dipublikasikan." returnHref="/admin/products" breadcrumbs={[{ label: "Products & Stock", href: "/admin/products" }, { label: "Tambah produk" }]} />
    <Card as="section" className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Informasi awal produk</h2>
      <AdminActionForm action={createProductDraftAction} submitLabel="Simpan draft produk" successLinkLabel="Buka editor produk" className="mt-5">
        <FormField id="new-product-name" label="Nama produk" required><NativeInput name="name" required maxLength={240} /></FormField>
        <FormField id="new-product-slug" label="Tautan produk" required description="Bagian alamat halaman produk, misalnya penyangga-ponsel. Gunakan huruf kecil, angka, dan tanda hubung."><NativeInput name="slug" required maxLength={240} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></FormField>
        <FormField id="new-product-category" label="Kategori"><NativeSelect name="categoryId" defaultValue=""><option value="">Tanpa kategori</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</NativeSelect></FormField>
        <FormField id="new-product-description" label="Deskripsi produk" required><Textarea name="description" required rows={5} maxLength={12000} /></FormField>
      </AdminActionForm>
    </Card>
  </main></AdminShell>;
}
