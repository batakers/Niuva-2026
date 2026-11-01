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
import { AdminOperationsService, type AdminOrderRow } from "@/modules/admin/operations";
import { AdminStatusBadge, AdminSummaryCard, adminTableHeaderClass } from "@/app/admin/admin-ui";
import { adminStatusLabel } from "@/modules/admin/status-labels";

export const metadata: Metadata = {
  title: "Pesanan · Admin Niuva",
  robots: { follow: false, index: false },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export default async function AdminOrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const query = parseAdminListQuery("orders", await searchParams);
  const page = query.page;
  const queryParams = adminListQueryParams(query);
  const returnTo = buildAdminPageHref("/admin/orders", queryParams, page);
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;

  const loaded = await loadOrders(access, query);
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="orders" kind={loaded.kind} role={access.profile.role} title="Pesanan belum dapat dimuat" />;
  const result = loaded.data;
  return (
      <AdminShell active="orders" role={result.role}>
        <main id="main-content" data-admin-surface="orders">
          <AdminListPosition listHref={returnTo} />
          <AdminPageHeader title="Pesanan" description="Cari pesanan, pantau pembayaran, dan buka detail untuk tindakan fulfillment." breadcrumbs={[{ label: "Pesanan" }]} />
          <AdminListControls area="orders" query={query} />

          <section aria-label="Ringkasan pesanan" className="mt-6 grid gap-3 sm:grid-cols-3">
            <AdminSummaryCard label="Hasil filter" value={String(result.filteredTotal)} />
            <AdminSummaryCard label="Produk Toko di halaman ini" value={String(result.items.filter((item) => item.orderType === "RETAIL").length)} />
            <AdminSummaryCard label="Custom Print di halaman ini" value={String(result.items.filter((item) => item.orderType === "CUSTOM_PRINT").length)} />
          </section>

          <section className="mt-8" aria-labelledby="orders-list-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-medium tracking-[-0.015em]" id="orders-list-title">Pesanan terbaru</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">50 record per halaman. Filter berlaku untuk seluruh daftar; buka detail untuk melakukan tindakan.</p>
              </div>
              <p className="text-sm text-muted-foreground" role="status">Dibaca {dateFormatter.format(result.generatedAt)} · Halaman {result.page}</p>
            </div>

            {result.items.length === 0 ? (
              <div className="mt-6">
                <StatusNotice tone="info" title="Tidak ada record yang sesuai." description="Coba ubah pencarian atau filter. Record baru akan tampil setelah berhasil diajukan." />
              </div>
            ) : (
              <>
                <Card className="gap-0 py-0 mt-6 hidden overflow-x-auto lg:block">
                  <Table className="w-full min-w-[58rem] text-left text-sm">
                    <TableCaption className="sr-only">Daftar pesanan terbaru</TableCaption>
                    <TableHeader className={adminTableHeaderClass}>
                      <TableRow>
                        <TableHead className="px-5 py-4 font-medium" scope="col">Pesanan</TableHead>
                        <TableHead className="px-5 py-4 font-medium" scope="col">Customer</TableHead>
                        <TableHead className="px-5 py-4 font-medium" scope="col">Status</TableHead>
                        <TableHead className="px-5 py-4 font-medium" scope="col">Pembayaran</TableHead>
                        <TableHead className="px-5 py-4 text-right font-medium" scope="col">Total</TableHead>
                        <TableHead className="px-5 py-4 text-right font-medium" scope="col">Diperbarui</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {result.items.map((item) => <OrderTableRow item={item} key={item.id} returnTo={returnTo} />)}
                    </TableBody>
                  </Table>
                </Card>
                <div className="mt-6 grid gap-3 lg:hidden">
                  {result.items.map((item) => <OrderCard item={item} key={item.id} returnTo={returnTo} />)}
                </div>
              </>
            )}
            <AdminPagination basePath="/admin/orders" hasNext={result.hasNext} page={result.page} query={queryParams} />
          </section>
        </main>
      </AdminShell>
  );
}

type OrdersLoad =
  | { status: "ok"; data: Awaited<ReturnType<AdminOperationsService["listOrders"]>> }
  | { status: "unavailable"; kind: FailureKind };

async function loadOrders(access: AdminAccess, query: AdminListQuery): Promise<OrdersLoad> {
  try {
    return { status: "ok", data: await new AdminOperationsService({ authorize: async () => access }).listOrders(query) };
  } catch (error) {
    return { status: "unavailable", kind: recordAdminPageFailure(error, "page:/admin/orders", { op: "list", page: String(query.page) }) };
  }
}


function OrderTableRow({ item, returnTo }: Readonly<{ item: AdminOrderRow; returnTo: string }>) {
  return (
    <TableRow>
      <TableHead className="px-5 py-4 align-top font-medium" scope="row">
        <Link className="block break-all font-mono text-sm text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/orders/${item.id}`, returnTo)}>{item.orderNumber}</Link>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{orderTypeLabel(item.orderType)}</span>
      </TableHead>
      <TableCell className="px-5 py-4 align-top">
        <span className="block font-medium">{item.customerName}</span>
        <span className="mt-1 block break-all text-xs text-muted-foreground">{item.customerEmail}</span>
      </TableCell>
      <TableCell className="px-5 py-4 align-top"><AdminStatusBadge value={item.status} /></TableCell>
      <TableCell className="px-5 py-4 align-top text-muted-foreground">{item.paymentStatus ? adminStatusLabel(item.paymentStatus) : "Belum tercatat"}</TableCell>
      <TableCell className="px-5 py-4 text-right align-top font-semibold tabular-nums">{currencyFormatter.format(BigInt(item.grandTotalRp))}</TableCell>
      <TableCell className="px-5 py-4 text-right align-top text-xs text-muted-foreground">{dateFormatter.format(item.updatedAt)}</TableCell>
    </TableRow>
  );
}

function OrderCard({ item, returnTo }: Readonly<{ item: AdminOrderRow; returnTo: string }>) {
  return (
    <Card as="article" className="gap-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="font-mono text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/orders/${item.id}`, returnTo)}>{item.orderNumber}</Link>
          <p className="mt-1 text-xs text-muted-foreground">{orderTypeLabel(item.orderType)}</p>
        </div>
        <AdminStatusBadge value={item.status} />
      </div>
      <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-1 font-medium">{item.customerName}</dd><dd className="text-xs text-muted-foreground">{item.customerEmail}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="mt-1 font-semibold tabular-nums">{currencyFormatter.format(BigInt(item.grandTotalRp))}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Pembayaran</dt><dd className="mt-1 font-medium">{item.paymentStatus ? adminStatusLabel(item.paymentStatus) : "Belum tercatat"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Diperbarui</dt><dd className="mt-1 text-muted-foreground">{dateFormatter.format(item.updatedAt)}</dd></div>
      </dl>
    </Card>
  );
}


function orderTypeLabel(value: AdminOrderRow["orderType"]): string {
  return value === "CUSTOM_PRINT" ? "Custom Print" : "Produk Toko";
}
