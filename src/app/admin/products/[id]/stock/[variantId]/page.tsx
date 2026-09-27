import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { z } from "zod";

import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, parseAdminPage, type AdminStockHistory } from "@/modules/admin/operations";

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
  searchParams: Promise<{ page?: string }>;
}>) {
  await connection();
  const { id, variantId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(variantId).success) notFound();
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;
  const history = await loadHistory(access, id, variantId, parseAdminPage((await searchParams).page));
  if (history === undefined) return <AdminDataUnavailableView active="products" role={access.profile.role} title="Riwayat stok belum dapat dimuat" />;
  if (history === null) notFound();

  return (
    <AdminShell active="products" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="stock-history" id="main-content">
        <header className="border-b border-border pb-6">
          <Link className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/admin/products/${history.product.id}`}>
            ← Kembali ke {history.product.name}
          </Link>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Riwayat stok varian</h1>
          <p className="mt-2 text-sm text-muted-foreground">{history.variant.name} · {history.variant.sku}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Riwayat lengkap tersedia sejak saldo pembuka saat migrasi. Transaksi sebelum titik itu tidak direkonstruksi.</p>
        </header>

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
                    {movement.orderId ? <Link className="mt-2 inline-block text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/admin/orders/${movement.orderId}`}>Order {movement.orderNumber}</Link> : null}
                  </div>
                  <div className="text-left tabular-nums sm:text-right">
                    <p className="font-semibold">{movement.delta > 0 ? "+" : ""}{movement.delta} unit</p>
                    <p className="mt-1 text-sm text-muted-foreground">{movement.balanceBefore} → {movement.balanceAfter}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <AdminPagination basePath={`/admin/products/${id}/stock/${variantId}`} hasNext={history.hasNext} page={history.page} />
        </section>
      </main>
    </AdminShell>
  );
}

function Balance({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

async function loadAdminAccess(): Promise<AdminAccess | null> {
  try { return await requireAdmin(); } catch { return null; }
}

async function loadHistory(access: AdminAccess, productId: string, variantId: string, page: number): Promise<AdminStockHistory | null | undefined> {
  try { return await new AdminOperationsService({ authorize: async () => access }).getStockHistory(productId, variantId, { page }); } catch { return undefined; }
}
