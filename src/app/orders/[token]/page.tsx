import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import {
  getLiveOrderStatus,
  getOrderStatusPreview,
} from "@/features/frontend-preview/order-status";
import { getRouteAccessTokenEntityId } from "@/modules/shared/access-token";
import { isAppError } from "@/modules/shared/errors";
import { OrderStatus } from "./order-status";

export const metadata: Metadata = {
  title: "Status pesanan · Niuva",
  description: "Lihat status dan langkah berikutnya untuk pesanan Niuva Anda.",
  robots: { follow: false, index: false },
};

export default async function OrderStatusPage({ params, searchParams }: PageProps<"/orders/[token]">) {
  await connection();
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const preview = await getOrderStatusPreview({
    preview: query.preview,
    state: query.state,
    token,
  });

  if (preview === null) {
    const orderId = getRouteAccessTokenEntityId(token);

    if (orderId === null) {
      notFound();
    }

    const liveResult = await loadLiveOrderStatus(orderId, token);
    if (!liveResult.ok) {
      if (isAppError(liveResult.error) && ["NOT_FOUND", "UNAUTHORIZED"].includes(liveResult.error.code)) {
        notFound();
      }

      return (
        <PublicShell functionalStatus="server-backed" scope="order-status">
          <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
            <div className="max-w-2xl">
              <h1 className={`${type.display.className} text-balance`}>Status belum dapat dimuat.</h1>
              <div className="mt-8">
                <StatusNotice
                  action={<NiuvaLink className="min-h-11" href={`/orders/${token}`} variant="outline">Coba lagi</NiuvaLink>}
                  description="Pesanan Anda tidak berubah. Muat ulang tautan ini sebentar lagi."
                  title="Status sementara tidak dapat dibuka"
                  tone="error"
                />
              </div>
            </div>
          </main>
        </PublicShell>
      );
    }

    return (
      <PublicShell functionalStatus="server-backed" scope="order-status">
        <OrderStatus order={liveResult.value.order} scenario={liveResult.value.scenario} isPreview={false} />
      </PublicShell>
    );
  }

  if (preview.kind === "loading") {
    return (
      <PublicShell scope="order-status">
        <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
          <div aria-busy="true" aria-live="polite">
            <h1 className={`${type.display.className} max-w-[16em] text-balance`}>Status order sedang diperiksa.</h1>
            <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">Tahapan pesanan tampil setelah statusnya selesai dimuat.</p>
            <div className="mt-8 h-24 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
              <div className="h-96 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
              <div className="h-72 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
            </div>
          </div>
        </main>
      </PublicShell>
    );
  }

  if (preview.kind === "access-denied") {
    return (
      <PublicShell scope="order-status">
        <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
          <div className="max-w-2xl">
            <h1 className={`${type.display.className} text-balance`}>Tautan status tidak dapat digunakan.</h1>
            <div className="mt-8">
              <StatusNotice
                action={<NiuvaLink className="min-h-11" href="/" variant="outline">Kembali ke beranda</NiuvaLink>}
                description={preview.reason === "expired" ? "Masa akses tautan ini sudah selesai. Minta tautan baru melalui kanal konfirmasi pesanan Anda." : "Akses tautan ini sudah dicabut. Gunakan tautan terbaru yang diberikan Niuva."}
                title={preview.reason === "expired" ? "Tautan sudah kedaluwarsa" : "Tautan sudah dicabut"}
                tone="warning"
              />
            </div>
          </div>
        </main>
      </PublicShell>
    );
  }

  if (preview.kind === "service-error") {
    return (
      <PublicShell scope="order-status">
        <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
          <div className="max-w-2xl">
            <h1 className={`${type.display.className} text-balance`}>Status belum dapat dimuat.</h1>
            <div className="mt-8">
              <StatusNotice
                action={<NiuvaLink className="min-h-11" href="/orders/preview-order?preview=examples" variant="outline">Coba lagi</NiuvaLink>}
                description="Detail pesanan tidak ditampilkan selama statusnya gagal dimuat."
                title="Status sementara tidak dapat dibuka"
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
      <OrderStatus order={preview.order} scenario={preview.scenario} isPreview />
    </PublicShell>
  );
}

type LiveOrderStatusResult =
  | Readonly<{ ok: true; value: Awaited<ReturnType<typeof getLiveOrderStatus>> }>
  | Readonly<{ error: unknown; ok: false }>;

async function loadLiveOrderStatus(orderId: string, token: string): Promise<LiveOrderStatusResult> {
  try {
    return { ok: true, value: await getLiveOrderStatus({ orderId, token }) };
  } catch (error) {
    return { error, ok: false };
  }
}
