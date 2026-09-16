import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, parseAdminPage, type AdminOrderRow } from "@/modules/admin/operations";

export const metadata: Metadata = {
  title: "Orders admin · Niuva",
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
}: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  await connection();
  const page = parseAdminPage((await searchParams).page);
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;

  const result = await loadOrders(access, page);
  if (result === null) return <AdminDataUnavailableView role={access.profile.role} title="Orders belum dapat dimuat" />;
  return (
      <AdminShell active="orders" role={result.role}>
        <main id="main-content" data-admin-surface="orders">
          <header className="border-b border-border pb-6">
            <p className="text-sm font-medium text-brand-700">Niuva / Operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Orders</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Satu daftar untuk membedakan retail dan custom print, membaca status pembayaran, lalu menentukan tindakan fulfillment berikutnya.
            </p>
          </header>

          <section aria-label="Ringkasan orders" className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Total tampil" value={String(result.items.length)} />
            <SummaryCard label="Retail" value={String(result.items.filter((item) => item.orderType === "RETAIL").length)} />
            <SummaryCard label="Custom print" value={String(result.items.filter((item) => item.orderType === "CUSTOM_PRINT").length)} />
          </section>

          <section className="mt-8" aria-labelledby="orders-list-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold" id="orders-list-title">Order terbaru</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">50 record per halaman dari database. Gunakan pagination untuk membuka record yang lebih lama; status tetap ditentukan service server.</p>
              </div>
              <p className="text-sm text-muted-foreground" role="status">Dibaca {dateFormatter.format(result.generatedAt)} · Halaman {result.page}</p>
            </div>

            {result.items.length === 0 ? (
              <div className="mt-6">
                <StatusNotice tone="info" title="Belum ada order." description="Daftar akan menampilkan order setelah checkout server berhasil membuat record." />
              </div>
            ) : (
              <>
                <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
                  <table className="w-full min-w-[58rem] text-left text-sm">
                    <caption className="sr-only">Daftar order terbaru</caption>
                    <thead className="border-b border-border bg-muted text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      <tr>
                        <th className="px-5 py-4 font-medium" scope="col">Order</th>
                        <th className="px-5 py-4 font-medium" scope="col">Customer</th>
                        <th className="px-5 py-4 font-medium" scope="col">Status</th>
                        <th className="px-5 py-4 font-medium" scope="col">Pembayaran</th>
                        <th className="px-5 py-4 text-right font-medium" scope="col">Total</th>
                        <th className="px-5 py-4 text-right font-medium" scope="col">Diperbarui</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.items.map((item) => <OrderTableRow item={item} key={item.id} />)}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 grid gap-3 lg:hidden">
                  {result.items.map((item) => <OrderCard item={item} key={item.id} />)}
                </div>
              </>
            )}
            <AdminPagination basePath="/admin/orders" hasNext={result.hasNext} page={result.page} />
          </section>
        </main>
      </AdminShell>
  );
}

async function loadAdminAccess(): Promise<AdminAccess | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

async function loadOrders(access: AdminAccess, page: number): Promise<Awaited<ReturnType<AdminOperationsService["listOrders"]>> | null> {
  try {
    return await new AdminOperationsService({ authorize: async () => access }).listOrders({ page });
  } catch {
    return null;
  }
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function OrderTableRow({ item }: Readonly<{ item: AdminOrderRow }>) {
  return (
    <tr>
      <th className="px-5 py-4 align-top font-medium" scope="row">
        <Link className="block font-mono text-sm text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/admin/orders/${item.id}`}>{item.orderNumber}</Link>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{orderTypeLabel(item.orderType)}</span>
      </th>
      <td className="px-5 py-4 align-top">
        <span className="block font-medium">{item.customerName}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{item.customerEmail}</span>
      </td>
      <td className="px-5 py-4 align-top"><StatusText value={item.status} /></td>
      <td className="px-5 py-4 align-top text-muted-foreground">{item.paymentStatus ? formatStatus(item.paymentStatus) : "Belum tercatat"}</td>
      <td className="px-5 py-4 text-right align-top font-semibold tabular-nums">{currencyFormatter.format(BigInt(item.grandTotalRp))}</td>
      <td className="px-5 py-4 text-right align-top text-xs text-muted-foreground">{dateFormatter.format(item.updatedAt)}</td>
    </tr>
  );
}

function OrderCard({ item }: Readonly<{ item: AdminOrderRow }>) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="font-mono text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/admin/orders/${item.id}`}>{item.orderNumber}</Link>
          <p className="mt-1 text-xs text-muted-foreground">{orderTypeLabel(item.orderType)}</p>
        </div>
        <StatusText value={item.status} />
      </div>
      <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-1 font-medium">{item.customerName}</dd><dd className="text-xs text-muted-foreground">{item.customerEmail}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="mt-1 font-semibold tabular-nums">{currencyFormatter.format(BigInt(item.grandTotalRp))}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Pembayaran</dt><dd className="mt-1 font-medium">{item.paymentStatus ? formatStatus(item.paymentStatus) : "Belum tercatat"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Diperbarui</dt><dd className="mt-1 text-muted-foreground">{dateFormatter.format(item.updatedAt)}</dd></div>
      </dl>
    </article>
  );
}

function StatusText({ value }: Readonly<{ value: string }>) {
  return <span className="inline-flex rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{formatStatus(value)}</span>;
}

function formatStatus(value: string): string {
  return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function orderTypeLabel(value: AdminOrderRow["orderType"]): string {
  return value === "CUSTOM_PRINT" ? "Custom print" : "Retail";
}
