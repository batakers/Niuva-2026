import Image from "next/image";
import Link from "next/link";

import { CustomerLogoutButton } from "@/components/niuva/customer-logout-button";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import type { CustomPrintIntakeMode, CustomPrintQuoteStatus, CustomPrintRequestStatus } from "@/generated/prisma/client";
import {
  customRequestStatusLabel,
  orderNeedsCustomer,
  orderStatusLabel,
  orderTypeLabel,
  quoteStatusLabel,
} from "@/features/customer-status/labels";
import type { CustomerAvatarSource } from "@/lib/images/customer-avatar";
import type { CustomerAccount } from "@/modules/customer-auth/repository";
import { formatRupiah } from "@/modules/shared/format";

import { ClaimForm } from "./claim-form";

export type AccountMakeRequest = Readonly<{
  createdAt: Date;
  /** Current operator estimate, already filtered against the latest review. */
  estimate: Readonly<{ lowerRp: string; upperRp: string }> | null;
  id: string;
  intakeMode: CustomPrintIntakeMode;
  /** Customer's own slicer simulation, never operator-verified. */
  previewTotalRp: string | null;
  quote: Readonly<{ status: CustomPrintQuoteStatus; version: number }> | null;
  referenceNumber: string;
  status: CustomPrintRequestStatus;
}>;

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

const rowLinkClass = "grid gap-2.5 px-5 py-4 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 sm:px-6";
const listClass = "mt-5 divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-card";
const sectionTitleClass = "text-2xl font-medium tracking-[-0.015em]";

/** A stored status as text; amber only when the next step waits on the Customer. */
function StatusLabel({ attention, children }: Readonly<{ attention: boolean; children: string }>) {
  return (
    <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-caption font-medium ${attention ? "border-warning-border bg-warning-background text-warning" : "border-border bg-neutral-50 text-foreground"}`}>
      {children}
    </span>
  );
}

function makeSummary(request: AccountMakeRequest): string {
  const parts = [
    request.estimate
      ? `Estimasi operator ${formatRupiah(request.estimate.lowerRp)}–${formatRupiah(request.estimate.upperRp)}`
      : request.previewTotalRp
        ? `Simulasi awal ${formatRupiah(request.previewTotalRp)}, belum diverifikasi`
        : "Menunggu review operator",
  ];
  if (request.quote) parts.push(`Quote v${request.quote.version}: ${quoteStatusLabel(request.quote.status)}`);
  return parts.join(" · ");
}

export function AccountView({
  account,
  avatar,
  requests,
}: Readonly<{
  account: CustomerAccount;
  avatar: CustomerAvatarSource;
  requests: readonly AccountMakeRequest[];
}>) {
  const name = account.profile.displayName ?? account.profile.email;

  return (
    <main className="overflow-x-hidden pb-16 sm:pb-24" id="main-content">
      <div className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14">
        <h1 className={`${type.display.className} max-w-[16em] text-balance`}>Pekerjaan dan pesanan Anda.</h1>
        <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">
          Pantau pengajuan Custom 3D Print, quote, dan pesanan dari satu akun. Permintaan terkait data Anda ada di Pusat privasi.
        </p>

        <section aria-label="Profil Customer" className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            {avatar.mode !== "none" ? (
              // Decorative: the display name is rendered as text beside it.
              <Image
                alt=""
                className="size-12 shrink-0 rounded-full object-cover ring-1 ring-border"
                height={48}
                referrerPolicy="no-referrer"
                src={avatar.src}
                unoptimized={avatar.mode === "unoptimized"}
                width={48}
              />
            ) : (
              <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <dl className="min-w-0">
              <dt className="sr-only">Nama</dt>
              <dd className="truncate text-lg font-medium">{name}</dd>
              <dt className="sr-only">Email terverifikasi</dt>
              <dd className="break-all text-ui font-normal text-muted-foreground">
                {account.profile.email} <span className="whitespace-nowrap">· terverifikasi</span>
              </dd>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <NiuvaLink className="min-h-11" href="/account/privacy" variant="outline">Pusat privasi</NiuvaLink>
            <CustomerLogoutButton />
          </div>
        </section>
      </div>

      <div className="mx-auto grid max-w-public items-start gap-12 px-5 pt-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="account-make-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className={sectionTitleClass} id="account-make-title">Custom 3D Print</h2>
              {requests.length > 0 ? <p className="text-ui font-normal text-muted-foreground">{requests.length} pengajuan</p> : null}
            </div>
            <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Pengajuan, estimasi setelah review operator, dan quote.</p>
            {requests.length === 0 ? (
              <div className="mt-5 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6">
                <p className="text-base font-medium">Belum ada pengajuan Custom 3D Print.</p>
                <p className="mt-1 text-ui font-normal leading-[1.55] text-muted-foreground">Kirim model 3D atau referensi untuk direview operator.</p>
                <NiuvaLink className="mt-4 min-h-11" href="/custom-print" variant="outline">Mulai Custom 3D Print</NiuvaLink>
              </div>
            ) : (
              <ul aria-label="Pengajuan Custom 3D Print" className={listClass}>
                {requests.map((request) => (
                  <li key={request.id}>
                    <Link className={rowLinkClass} href={`/account/make/${request.id}`}>
                      <div className="min-w-0">
                        <p className="text-base font-medium tabular-nums">{request.referenceNumber}</p>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {dateFormatter.format(request.createdAt)} · {request.intakeMode === "REFERENCE_ONLY" ? "Referensi awal" : "Model 3D/CAD"}
                        </p>
                      </div>
                      <StatusLabel attention={request.quote?.status === "SENT"}>{customRequestStatusLabel(request.status)}</StatusLabel>
                      <p className="text-ui font-normal leading-[1.5]">{makeSummary(request)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="account-orders-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className={sectionTitleClass} id="account-orders-title">Riwayat pesanan</h2>
              {account.orders.length > 0 ? <p className="text-ui font-normal text-muted-foreground">{account.orders.length} pesanan</p> : null}
            </div>
            <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Produk Toko dan Custom 3D Print yang tertaut ke akun ini.</p>
            {account.orders.length === 0 ? (
              <div className="mt-5">
                <StatusNotice
                  action={<NiuvaLink className="min-h-11" href="/shop" variant="outline">Lihat Toko</NiuvaLink>}
                  description="Pesanan baru muncul di sini setelah checkout berhasil. Riwayat akun yang telah ditutup tidak ditautkan kembali otomatis."
                  title="Belum ada pesanan."
                  tone="info"
                />
              </div>
            ) : (
              <ul aria-label="Riwayat pesanan" className={listClass}>
                {account.orders.map((order) => (
                  <li key={order.id}>
                    <Link className={rowLinkClass} href={`/account/orders/${order.id}`}>
                      <div className="min-w-0">
                        <p className="text-base font-medium tabular-nums">{order.orderNumber}</p>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {orderTypeLabel(order.orderType)} · {dateFormatter.format(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <StatusLabel attention={orderNeedsCustomer(order.status)}>
                          {orderStatusLabel(order.status, order.orderType === "CUSTOM_PRINT")}
                        </StatusLabel>
                        <p className="text-base font-medium tabular-nums">{formatRupiah(order.grandTotalRp)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside aria-labelledby="account-claim-title" className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-medium tracking-[-0.015em]" id="account-claim-title">Tautkan pengajuan lama</h2>
          <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">
            Punya tautan privat dari sebelum memakai akun? Tempel tokennya di sini. Satu token hanya dapat dipakai sekali.
          </p>
          <ClaimForm />
        </aside>
      </div>
    </main>
  );
}
