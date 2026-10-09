import { Card } from "@/components/ui/card";
import { Table, TableCaption, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { AdminPageHeader } from "../admin-page-header";
import { AdminListControls } from "../admin-list-controls";
import { AdminListPosition } from "@/components/niuva/admin-list-position";
import { parseAdminListQuery, adminListQueryParams, type AdminListQuery } from "@/modules/admin/list-query";
import { buildAdminPageHref, withAdminReturnTo } from "@/modules/admin/navigation";

import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { StatusNotice } from "@/components/niuva/status-notice";
import type { AdminAccess } from "@/lib/auth/admin";
import type { FailureKind } from "@/lib/observability/logger";
import { AdminOperationsService, type AdminProductRow } from "@/modules/admin/operations";

export const metadata: Metadata = {
  title: "Products & Stock admin · Niuva",
  robots: { follow: false, index: false },
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export default async function AdminProductsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const query = parseAdminListQuery("products", await searchParams);
  const queryParams = adminListQueryParams(query);
  const returnTo = buildAdminPageHref("/admin/products", queryParams, query.page);
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;

  const loaded = await loadProducts(access, query);
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="products" kind={loaded.kind} role={access.profile.role} title="Products belum dapat dimuat" />;
  const result = loaded.data;
  const published = result.items.filter((item) => item.isPublished).length;
  const variants = result.items.flatMap((item) => item.variants);
  const lowStock = variants.filter((variant) => variant.isActive && variant.stockOnHand >= 0 && variant.stockOnHand <= 3).length;

  return (
      <AdminShell active="products" role={result.role}>
        <main id="main-content" data-admin-surface="products">
          <AdminListPosition listHref={returnTo} />
          <AdminPageHeader title="Products & Stock" description="Cari produk, periksa varian dan stok, lalu buka editor untuk memperbarui katalog." breadcrumbs={[{ label: "Products & Stock" }]} />
          <AdminListControls area="products" query={query} />

          <section aria-label="Ringkasan products" className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Hasil filter" value={String(result.filteredTotal)} />
            <SummaryCard label="Terpublikasi di halaman ini" value={String(published)} />
            <SummaryCard label="Stok menipis di halaman ini" value={String(lowStock)} />
          </section>

          <section className="mt-8" aria-labelledby="products-list-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold" id="products-list-title">Katalog internal</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Kelola harga, varian, stok, dan tampilan produk di situs.</p>
              </div>
              <p className="text-sm text-muted-foreground" role="status">{result.filteredTotal} hasil filter</p>
            </div>

            {result.items.length === 0 ? (
              <div className="mt-6"><StatusNotice tone="info" title="Tidak ada record yang sesuai." description="Coba ubah pencarian atau filter publikasi." /></div>
            ) : (
              <div className="mt-6 grid gap-4">
                {result.items.map((item) => <ProductCard item={item} key={item.id} returnTo={returnTo} />)}
              </div>
            )}
            <AdminPagination basePath="/admin/products" hasNext={result.hasNext} page={result.page} query={queryParams} />
          </section>
        </main>
      </AdminShell>
  );
}

type ProductsLoad =
  | { status: "ok"; data: Awaited<ReturnType<AdminOperationsService["listProducts"]>> }
  | { status: "unavailable"; kind: FailureKind };

async function loadProducts(access: AdminAccess, query: AdminListQuery): Promise<ProductsLoad> {
  try {
    return { status: "ok", data: await new AdminOperationsService({ authorize: async () => access }).listProducts(query) };
  } catch (error) {
    return { status: "unavailable", kind: recordAdminPageFailure(error, "page:/admin/products", { op: "list", page: String(query.page) }) };
  }
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <Card className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></Card>;
}

function ProductCard({ item, returnTo }: Readonly<{ item: AdminProductRow; returnTo: string }>) {
  const activeVariants = item.variants.filter((variant) => variant.isActive);
  const totalStock = activeVariants.reduce((total, variant) => total + variant.stockOnHand, 0);
  return (
    <Card as="article" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">{item.category?.name ?? "Tanpa kategori"}</p>
          <h3 className="mt-2 text-lg font-semibold"><Link className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/products/${item.id}`, returnTo)}>{item.name}</Link></h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{item.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className={item.isPublished ? "rounded-md border border-success-border bg-success-background px-2.5 py-1 text-success" : "rounded-md border border-warning-border bg-warning-background px-2.5 py-1 text-warning"}>{item.isPublished ? "Published" : "Draft"}</span>
          <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-muted-foreground">{item.mediaCount} foto</span>
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{item.description}</p>
      <div className="mt-5 overflow-x-auto border-t border-border pt-4">
        {item.variants.length === 0 ? (
          <p className="text-sm text-warning">Belum ada varian aktif untuk ditawarkan.</p>
        ) : (
          <Table className="w-full min-w-[34rem] text-left text-sm">
            <TableCaption className="sr-only">Varian {item.name}</TableCaption>
            <TableHeader className="text-xs uppercase tracking-[0.1em] text-muted-foreground"><TableRow><TableHead className="pb-3 font-medium" scope="col">Varian</TableHead><TableHead className="pb-3 font-medium" scope="col">SKU</TableHead><TableHead className="pb-3 font-medium" scope="col">Harga</TableHead><TableHead className="pb-3 text-right font-medium" scope="col">Stok</TableHead></TableRow></TableHeader>
            <TableBody className="divide-y divide-border">
              {item.variants.map((variant) => <TableRow key={variant.id}><TableHead className="py-3 font-medium" scope="row">{variant.name}{!variant.isActive ? " (nonaktif)" : ""}</TableHead><TableCell className="py-3 font-mono text-xs text-muted-foreground">{variant.sku}</TableCell><TableCell className="py-3 tabular-nums">{currencyFormatter.format(BigInt(variant.priceRp))}</TableCell><TableCell className={`py-3 text-right font-semibold tabular-nums ${variant.stockOnHand === 0 ? "text-warning" : variant.stockOnHand <= 3 ? "text-warning" : "text-foreground"}`}>{variant.stockOnHand}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Total stok varian aktif: {totalStock}. <Link className="font-semibold text-brand-700 underline-offset-4 hover:underline" href={withAdminReturnTo(`/admin/products/${item.id}`, returnTo)}>Buka editor dan adjustment</Link>.</p>
    </Card>
  );
}
