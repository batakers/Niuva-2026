import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { getServerCapabilities } from "@/lib/env/server";
import { CustomPrintAccessService } from "@/modules/custom-print/access-service";
import { isAppError } from "@/modules/shared/errors";

import { AppendModelForm } from "./append-model-form";

export const metadata: Metadata = {
  title: "Status request custom print · Niuva",
  description: "Lihat status request custom print dan langkah berikutnya.",
  robots: { follow: false, index: false },
  referrer: "no-referrer",
};

const statusLabels: Readonly<Record<string, string>> = {
  APPROVED: "Quote disetujui",
  CANCELLED: "Dibatalkan",
  DECLINED: "Quote ditolak",
  QUOTE_READY: "Quote sedang disiapkan",
  QUOTE_SENT: "Quote telah dikirim",
  SUBMITTED: "Menunggu pemeriksaan",
  UNDER_REVIEW: "Sedang ditinjau",
};

export default async function CustomPrintRequestStatusPage({ params }: PageProps<"/custom-print/requests/[token]">) {
  await connection();
  const { token } = await params;
  let status;
  try {
    status = await new CustomPrintAccessService().getStatus(token);
  } catch (error) {
    if (isAppError(error) && ["NOT_FOUND", "UNAUTHORIZED"].includes(error.code)) notFound();
    return <PublicShell functionalStatus="server-backed" scope="custom-request">
      <main className="mx-auto max-w-public px-5 py-16 sm:px-8" id="main-content">
        <StatusNotice title="Status belum dapat dimuat" description="Request tidak diubah. Muat ulang tautan privat ini setelah layanan kembali tersedia." tone="error" />
      </main>
    </PublicShell>;
  }

  let uploadsEnabled = false;
  try {
    uploadsEnabled = getServerCapabilities().customUploads;
  } catch {
    // Status remains available even if private upload is unavailable.
  }
  const canAppend = status.intakeMode === "REFERENCE_ONLY" &&
    ["SUBMITTED", "UNDER_REVIEW"].includes(status.status);

  return <PublicShell functionalStatus="server-backed" scope="custom-request">
    <main className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16" id="main-content">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-brand-700">Request custom print · {status.referenceNumber}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Status dan langkah berikutnya.</h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">Tautan ini bersifat privat. Simpan untuk kembali ke request dengan nomor referensi yang sama.</p>

        <div className="mt-9 grid gap-4 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-2 sm:p-6">
          <div><p className="text-muted-foreground">Status saat ini</p><p className="mt-2 font-semibold">{statusLabels[status.status] ?? status.status}</p></div>
          <div><p className="text-muted-foreground">Jalur awal</p><p className="mt-2 font-semibold">{status.intakeMode === "REFERENCE_ONLY" ? "Referensi awal" : "Model siap"}</p></div>
          <div><p className="text-muted-foreground">File privat diterima</p><p className="mt-2 font-semibold">{status.fileExtensions.length === 0 ? "Belum ada" : status.fileExtensions.join(" · ")}</p></div>
          <div><p className="text-muted-foreground">Model untuk review slicer</p><p className="mt-2 font-semibold">{status.modelReady ? "Sudah tersedia" : "Belum tersedia"}</p></div>
        </div>

        <div className="mt-6">
          {status.status === "QUOTE_SENT" ? <StatusNotice title="Quote sudah dikirim" description="Gunakan tautan quote privat yang diberikan Niuva untuk meninjau dan memberi keputusan. Nomor referensi ini tidak membuka quote." tone="info" />
            : !status.modelReady && status.intakeMode === "REFERENCE_ONLY" ? <StatusNotice title="Referensi sedang ditriase" description="Operator meninjau kebutuhan awal. Model 3D/CAD diperlukan sebelum hasil slicer dan quote final dapat dibuat." tone="info" />
              : <StatusNotice title="Request tercatat" description="Operator memeriksa model dan konteks request. Status upload tidak menentukan harga atau kelayakan produksi." tone="info" />}
        </div>

        {canAppend && uploadsEnabled ? <AppendModelForm token={token} /> : null}
        {canAppend && !uploadsEnabled ? <div className="mt-6"><StatusNotice title="Upload model belum tersedia" description="Request dan nomor referensi tetap tersimpan. Hubungi Niuva dengan nomor referensi ini untuk tindak lanjut manual." tone="warning" /></div> : null}
      </div>
    </main>
  </PublicShell>;
}
