import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { getOrderStatusPreview } from "@/features/frontend-preview/order-status";
import { OrderStatus } from "./order-status";

export const metadata: Metadata = {
  title: "Status order · Niuva",
  description: "Lihat status publik dan langkah berikutnya untuk order Niuva.",
  robots: { follow: false, index: false },
};

export default async function OrderStatusPage({ params, searchParams }: PageProps<"/orders/[token]">) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const preview = await getOrderStatusPreview({
    preview: query.preview,
    state: query.state,
    token,
  });

  if (preview === null) notFound();

  if (preview.kind === "loading") {
    return (
      <PublicShell scope="order-status">
        <main className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16" id="main-content">
          <div aria-busy="true" aria-live="polite" className="max-w-4xl">
            <p className="text-sm font-medium text-brand-700">Memuat status order contoh</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Status order sedang diperiksa.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Timeline belum ditampilkan sampai projection publik tersedia.</p>
            <div className="mt-10 grid gap-5 lg:grid-cols-12">
              <div className="h-96 animate-pulse rounded-xl bg-muted motion-reduce:animate-none lg:col-span-7" />
              <div className="h-72 animate-pulse rounded-xl bg-muted motion-reduce:animate-none lg:col-span-5" />
            </div>
          </div>
        </main>
      </PublicShell>
    );
  }

  if (preview.kind === "access-denied") {
    return (
      <PublicShell scope="order-status">
        <main className="mx-auto max-w-public px-5 py-16 sm:px-8 sm:py-24" id="main-content">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-brand-700">Akses status order</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Tautan status tidak dapat digunakan.</h1>
            <div className="mt-8">
              <StatusNotice
                description={preview.reason === "expired" ? "Masa akses tautan ini telah selesai. Minta tautan baru melalui kanal konfirmasi order Anda." : "Akses tautan ini sudah dicabut. Gunakan tautan terbaru yang diberikan Niuva."}
                title={preview.reason === "expired" ? "Tautan sudah kedaluwarsa" : "Tautan sudah dicabut"}
                tone="warning"
              />
            </div>
            <Link className="mt-8 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/">
              Kembali ke halaman utama
            </Link>
          </div>
        </main>
      </PublicShell>
    );
  }

  if (preview.kind === "service-error") {
    return (
      <PublicShell scope="order-status">
        <main className="mx-auto max-w-public px-5 py-16 sm:px-8 sm:py-24" id="main-content">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-brand-700">Status order</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Status belum dapat dimuat.</h1>
            <div className="mt-8">
              <StatusNotice
                action={<Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/orders/preview-order?preview=examples">Coba lagi</Link>}
                description="Tidak ada detail order yang ditampilkan ketika projection publik gagal dimuat."
                title="Layanan status sementara tidak tersedia"
                tone="error"
              />
            </div>
          </div>
        </main>
      </PublicShell>
    );
  }

  return (
    <PublicShell scope="order-status">
      <OrderStatus order={preview.order} scenario={preview.scenario} />
    </PublicShell>
  );
}
