import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { typographySystemTokens as type } from "@/design/typography";
import { StatusNotice } from "@/components/niuva/status-notice";
import { getServerCapabilities } from "@/lib/env/server";
import { CustomPrintAccessService, canAppendModel } from "@/modules/custom-print/access-service";
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
      <main className="mx-auto max-w-public px-5 py-16 sm:px-12" id="main-content">
        <StatusNotice title="Status belum dapat dimuat" description="Pengajuan Anda tidak berubah. Muat ulang tautan ini sebentar lagi." tone="error" />
      </main>
    </PublicShell>;
  }

  let uploadsEnabled = false;
  try {
    uploadsEnabled = getServerCapabilities().customUploads;
  } catch {
    // Status remains available even if private upload is unavailable.
  }
  const canAppend = canAppendModel(status);

  const facts = [
    ["Status saat ini", statusLabels[status.status] ?? status.status],
    ["Titik mulai", status.intakeMode === "REFERENCE_ONLY" ? "Referensi awal" : "Model 3D/CAD"],
    ["File yang diterima", status.fileExtensions.length === 0 ? "Belum ada" : status.fileExtensions.join(" · ")],
    ["Model 3D untuk diperiksa", status.modelReady ? "Sudah tersedia" : "Belum tersedia"],
  ] as const;

  return <PublicShell functionalStatus="server-backed" scope="custom-request">
    <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
      <div className="max-w-3xl">
        <p className="text-ui font-normal text-muted-foreground">Custom 3D Print · <span className="font-semibold text-foreground tabular-nums">{status.referenceNumber}</span></p>
        <h1 className={`${type.display.className} mt-3 text-balance`}>Status dan langkah berikutnya.</h1>
        <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">Tautan ini privat. Simpan untuk kembali ke pengajuan dengan nomor referensi yang sama.</p>

        <dl className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-2">
          {facts.map(([term, value]) => (
            <div className="bg-card px-5 py-5 sm:px-6" key={term}>
              <dt className="text-ui font-normal text-muted-foreground">{term}</dt>
              <dd className="mt-1 text-lg font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          {status.status === "QUOTE_SENT" ? <StatusNotice title="Quote sudah dikirim" description="Buka tautan quote privat dari Niuva untuk meninjau dan memberi keputusan. Nomor referensi ini tidak membuka quote." tone="info" />
            : !status.modelReady && status.intakeMode === "REFERENCE_ONLY" ? <StatusNotice title="Referensi sedang ditinjau" description="Operator meninjau kebutuhan awal Anda. Model 3D/CAD diperlukan sebelum operator dapat menyusun quote." tone="info" />
              : <StatusNotice title="Request tercatat" description="Operator memeriksa model dan kebutuhan Anda. File yang diterima belum menentukan harga atau kelayakan produksi." tone="info" />}
        </div>

        {canAppend && uploadsEnabled ? <AppendModelForm token={token} /> : null}
        {canAppend && !uploadsEnabled ? <div className="mt-6"><StatusNotice title="Upload model belum tersedia" description="Pengajuan dan nomor referensinya tetap tersimpan. Hubungi Niuva dengan nomor referensi ini untuk tindak lanjut." tone="warning" /></div> : null}
      </div>
    </main>
  </PublicShell>;
}
