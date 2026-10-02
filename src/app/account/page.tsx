import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";

import { CustomerLogoutButton } from "@/components/niuva/customer-logout-button";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  requireCustomer,
} from "@/lib/auth/customer";
import { isAppError } from "@/modules/shared/errors";
import {
  CustomerAuthRepository,
  type CustomerAccount,
} from "@/modules/customer-auth/repository";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { readCustomerPreviewSnapshot } from "@/modules/custom-print/customer-preview";
import { ClaimForm } from "./claim-form";

export const metadata: Metadata = {
  title: "Akun Customer · Niuva",
  description: "Pantau Project Brief, MAKE, quote, dan order Niuva.",
  robots: { index: false, follow: false },
};

const orderTypeLabels: Readonly<Record<CustomerAccount["orders"][number]["orderType"], string>> = {
  CUSTOM_PRINT: "Custom print",
  RETAIL: "Retail",
};

const orderStatusLabels: Readonly<Record<CustomerAccount["orders"][number]["status"], string>> = {
  CANCELLED: "Dibatalkan",
  COMPLETED: "Selesai",
  FINISHING_QC: "Finishing dan QC",
  IN_PRODUCTION: "Dalam produksi",
  PAID: "Pembayaran terverifikasi",
  PENDING_PAYMENT: "Menunggu pembayaran",
  PROCESSING: "Diproses",
  READY_TO_SHIP: "Siap dikirim",
  SHIPPED: "Dikirim",
  SUBMITTED: "Diajukan",
  UNDER_REVIEW: "Sedang ditinjau",
  WAITING_FOR_APPROVAL: "Menunggu persetujuan",
  WAITING_PAYMENT: "Menunggu pembayaran",
  WAITING_SHIPPING_PAYMENT: "Menunggu pembayaran pengiriman",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

function formatRupiah(value: string): string {
  return rupiah.format(BigInt(value));
}

export default async function AccountPage() {
  await connection();
  let customer;
  try {
    customer = await requireCustomer();
  } catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") {
      redirect("/login?returnTo=/account");
    }

    if (isAppError(error) && error.code === "CUSTOMER_AUTH_UNAVAILABLE") {
      return (
        <PublicShell functionalStatus="capability-gated" scope="account">
          <main id="main-content">
            <div className="mx-auto max-w-public px-5 py-16 sm:px-8">
              <StatusNotice
                tone="warning"
                title="Akun Customer belum tersedia."
                description="Sesi Customer belum dikonfigurasi pada environment ini."
              />
            </div>
          </main>
        </PublicShell>
      );
    }

    throw error;
  }

  const account = await new CustomerAuthRepository().getAccount(customer.id);
  if (account === null) {
    redirect("/login?returnTo=/account&error=auth_failed");
  }
  const work = await new CustomerWorkRepository().list(customer.id);

  return (
    <PublicShell functionalStatus="server-backed" scope="account">
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-public flex-wrap items-end justify-between gap-6 px-5 py-12 sm:px-8 sm:py-16">
            <div>
              <p className="text-sm font-medium text-brand-700">Akun Customer</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Pekerjaan dan order Anda.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Pantau Project Brief, MAKE, quote, dan order dari satu akun. Kelola permintaan terkait data Anda melalui Pusat privasi.
              </p>
            </div>
            <CustomerLogoutButton />
          </div>
        </section>

        <div className="mx-auto grid max-w-public gap-6 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Profil Customer</CardTitle>
              <CardDescription>Identitas Customer yang digunakan untuk mengirim brief, MAKE, dan checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                {account.profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.profile.avatarUrl}
                    alt=""
                    className="size-14 rounded-full object-cover ring-1 ring-border"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground" aria-hidden="true">
                    {(account.profile.displayName ?? account.profile.email).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{account.profile.displayName ?? account.profile.email}</p>
                  <p className="truncate text-sm text-muted-foreground">Customer Niuva</p>
                </div>
              </div>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Nama</dt>
                  <dd className="mt-1 font-medium">{account.profile.displayName ?? "Belum disediakan"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email terverifikasi</dt>
                  <dd className="mt-1 break-all font-medium">{account.profile.email}</dd>
                </div>
              </dl>
              <Link href="/account/privacy" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Pusat privasi dan data saya</Link>
            </CardContent>
          </Card>

          <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Project Brief</CardTitle><CardDescription>Status inquiry dan proposal B2B Anda.</CardDescription></CardHeader>
            <CardContent>{work.inquiries.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada Project Brief.</p> : <div className="divide-y divide-border">{work.inquiries.map((inquiry) => <Link className="block py-4 first:pt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href={`/account/inquiries/${inquiry.id}`} key={inquiry.id}><span className="font-semibold">{inquiry.referenceNumber}</span><span className="mt-1 block text-sm text-muted-foreground">{inquiry.status} · {dateFormatter.format(inquiry.createdAt)}{inquiry.quotes[0] ? ` · Proposal v${inquiry.quotes[0].version}: ${inquiry.quotes[0].status}` : ""}</span></Link>)}</div>}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>MAKE</CardTitle><CardDescription>Request custom print, estimasi pascareview, dan quote.</CardDescription></CardHeader>
            <CardContent>{work.requests.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada request MAKE.</p> : <div className="divide-y divide-border">{work.requests.map((request) => {
              const customerPreview = readCustomerPreviewSnapshot(request.customerPreviewSnapshot);
              return <Link className="block py-4 first:pt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href={`/account/make/${request.id}`} key={request.id}><span className="font-semibold">{request.referenceNumber}</span><span className="mt-1 block text-sm text-muted-foreground">{request.status} · {dateFormatter.format(request.createdAt)} · {request.estimates[0] ? `Estimasi operator ${formatRupiah(request.estimates[0].lowerRp.toFixed(0))}–${formatRupiah(request.estimates[0].upperRp.toFixed(0))}` : customerPreview ? `Simulasi awal ${formatRupiah(customerPreview.result.finalTotalRp)} · belum diverifikasi` : "Perlu review"}{request.quotes[0] ? ` · Quote v${request.quotes[0].version}: ${request.quotes[0].status}` : ""}</span></Link>;
            })}</div>}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tautkan pekerjaan lama</CardTitle><CardDescription>Gunakan token dari tautan privat yang diterbitkan sebelum pekerjaan Anda dimiliki akun. Satu token hanya dapat dipakai sekali.</CardDescription></CardHeader>
            <CardContent><ClaimForm /></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Riwayat order</CardTitle>
              <CardDescription>Retail dan custom print yang sudah tertaut ke Customer ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {account.orders.length === 0 ? (
                <StatusNotice
                  tone="info"
                  title="Belum ada order tertaut."
                  description="Order baru akan muncul setelah checkout berhasil. Riwayat akun yang telah ditutup tidak ditautkan kembali otomatis."
                />
              ) : (
                <div className="divide-y divide-border">
                  {account.orders.map((order) => (
                    <Link href={`/account/orders/${order.id}`} key={order.id} className="grid gap-3 py-5 first:pt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <p className="font-semibold">{order.orderNumber}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {orderTypeLabels[order.orderType]} · {dateFormatter.format(order.createdAt)}
                        </p>
                        <p className="mt-2 text-sm">Status: <span className="font-medium">{orderStatusLabels[order.status]}</span></p>
                      </div>
                      <p className="font-semibold tabular-nums sm:text-right">{formatRupiah(order.grandTotalRp)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
