import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { normalizeAdminReturnTo, withAdminReturnTo } from "@/modules/admin/navigation";
import { z } from "zod";

import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminOperationsService, parseAdminPage } from "@/modules/admin/operations";

export const metadata: Metadata = { title: "Riwayat stok · Niuva Admin", robots: { index: false, follow: false } };

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const kindLabel: Readonly<Record<string, string>> = {
  OPENING_BALANCE: "Saldo awal",
  CATALOG_IMPORT: "Impor katalog",
  MANUAL_ADJUSTMENT: "Penyesuaian Admin",
  ORDER_CONSUMPTION: "Konsumsi order",
};

export default async function AdminStockHistoryPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string; variantId: string }>;
  searchParams: Promise<Readonly<Record<string, unknown>>>;
}>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;
  const { id, variantId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(variantId).success) notFound();
  const query = await searchParams;
  const page = parseAdminPage(typeof query.page === "string" ? query.page : undefined);
  const returnTo = normalizeAdminReturnTo(query.returnTo, "/admin/products");
  const service = new AdminOperationsService({ authorize: async () => access });
  const result = await loadAdminRecordLogged(
    "page:/admin/products/[id]/stock/[variantId]",
    () => service.getStockHistory(id, variantId, { page }),
    { id, op: "detail", page: String(page), variantId },
  );
  if (result.status === "not-found") notFound();
  if (result.status === "unavailable") return <AdminDataUnavailableView active="products" kind={result.kind} role={access.profile.role} title="Riwayat stok belum dapat dimuat" />;
  const history = result.record;

  return (
    <AdminShell active="products" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="stock-history" id="main-content">
        <AdminPageHeader title="Riwayat stok varian" description={`${history.variant.name} · ${history.variant.sku}. Riwayat tersedia sejak saldo pembuka saat migrasi.`} returnHref={withAdminReturnTo(`/admin/products/${id}`, returnTo)} returnLabel={`Kembali ke ${history.product.name}`} breadcrumbs={[{ label: "Products & Stock", href: returnTo }, { label: history.product.name, href: withAdminReturnTo(`/admin/products/${id}`, returnTo) }, { label: "Riwayat stok" }]} />

        <section aria-label="Saldo stok saat ini" className="grid gap-3 sm:grid-cols-3">
          <Balance label="Stok fisik" value={history.variant.stockOnHand} />
          <Balance label="Reservasi aktif" value={history.variant.reserved} />
          <Balance label="Tersedia" value={history.variant.available} />
        </section>

        <section aria-labelledby="movements-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="movements-title">Perubahan saldo</h2>
          {history.movements.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">Tidak ada perubahan pada halaman ini.</p>
          ) : (
            <ol className="mt-5 divide-y divide-border">
              {history.movements.map((movement) => (
                <li className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto]" key={movement.id}>
                  <div className="min-w-0">
                    <p className="font-semibold">{kindLabel[movement.kind] ?? movement.kind}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{dateFormatter.format(movement.createdAt)} · {movement.adminName ?? "Sistem"}</p>
                    {movement.reason ? <p className="mt-2 break-words text-sm">Alasan: {movement.reason}</p> : null}
                    {movement.orderId ? <Link className="mt-2 inline-block text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/orders/${movement.orderId}`, returnTo)}>Order {movement.orderNumber}</Link> : null}
                  </div>
                  <div className="text-left tabular-nums sm:text-right">
                    <p className="font-semibold">{movement.delta > 0 ? "+" : ""}{movement.delta} unit</p>
                    <p className="mt-1 text-sm text-muted-foreground">{movement.balanceBefore} → {movement.balanceAfter}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <AdminPagination basePath={`/admin/products/${id}/stock/${variantId}`} hasNext={history.hasNext} page={history.page} query={{ returnTo }} />
        </section>
      </main>
    </AdminShell>
  );
}

function Balance({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}
