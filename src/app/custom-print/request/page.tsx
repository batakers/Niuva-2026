import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth/customer";
import { isAppError } from "@/modules/shared/errors";

import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { getServerCapabilities } from "@/lib/env/server";
import {
  CUSTOM_FLOW_PRODUCT_OPTIONS,
  getCustomFlowProductOption,
} from "@/modules/custom-print/product-intake";
import { RequestForm } from "./request-form";
import { ReferenceRequestForm } from "./reference-request-form";

export const metadata: Metadata = {
  title: "Pengajuan Custom 3D Print · Niuva",
  description: "Kirim model 3D untuk direview operator Niuva, atau mulai dari referensi awal.",
};

const modelReadinessItems = [
  "Satu file model: STL, 3MF, OBJ, atau STEP/STP.",
  "Material, warna, jumlah, dan unit atau skala.",
  "Nomor WhatsApp untuk pembahasan dengan operator.",
] as const;
const referenceReadinessItems = [
  "Deskripsi kebutuhan, fungsi, dan perkiraan jumlah.",
  "Link atau foto referensi bila sudah ada.",
  "Nomor WhatsApp untuk tindak lanjut operator.",
] as const;
const modelNextSteps = [
  "Operator memeriksa file dan konfigurasi Anda.",
  "Berat dan durasi cetak dicatat dari slicer.",
  "Quote dikirim ke akun untuk Anda terima atau tolak.",
] as const;
const referenceNextSteps = [
  "Operator meninjau kebutuhan dan referensi Anda.",
  "Model 3D ditambahkan dari akun, dengan nomor referensi yang sama.",
  "Setelah model diperiksa, quote dikirim ke akun Anda.",
] as const;

export default async function CustomPrintRequestPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ mode?: string | string[]; product?: string | string[] }> }>) {
  await connection();
  const params = await searchParams;
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const referenceMode = modeParam === "reference";
  const productParam = Array.isArray(params.product) ? params.product[0] : params.product;
  const initialProductInterest = productParam !== undefined && getCustomFlowProductOption(productParam) !== null
    ? productParam
    : undefined;
  const returnParams = new URLSearchParams();
  if (referenceMode) returnParams.set("mode", "reference");
  if (initialProductInterest) returnParams.set("product", initialProductInterest);
  const returnTo = `/custom-print/request${returnParams.size > 0 ? `?${returnParams.toString()}` : ""}`;
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    if (isAppError(error) && error.code === "CUSTOMER_AUTH_UNAVAILABLE") return <PublicShell scope="custom-request" functionalStatus="capability-gated"><main id="main-content" className="mx-auto max-w-public px-5 py-16 sm:px-12"><StatusNotice title="Login Customer belum tersedia" description="Pengajuan Custom 3D Print membutuhkan login Customer, yang belum tersedia saat ini." tone="warning" /></main></PublicShell>;
    throw error;
  }

  let liveEnabled = false;
  let databaseEnabled = false;
  try {
    const capabilities = getServerCapabilities();
    liveEnabled = capabilities.customUploads;
    databaseEnabled = capabilities.database;
  } catch {
    // Incomplete provider configuration fails closed at the page boundary.
  }
  const previewEnabled = process.env.NODE_ENV === "development" && !liveEnabled;
  const functionalStatus = (referenceMode ? databaseEnabled : liveEnabled)
    ? "server-backed" as const
    : previewEnabled
      ? "frontend-preview" as const
      : "capability-gated" as const;

  const modeQuery = (reference: boolean) => {
    const query = new URLSearchParams();
    if (reference) query.set("mode", "reference");
    if (initialProductInterest) query.set("product", initialProductInterest);
    return `/custom-print/request${query.size > 0 ? `?${query.toString()}` : ""}`;
  };
  const nextSteps = referenceMode ? referenceNextSteps : modelNextSteps;

  return (
    <PublicShell functionalStatus={functionalStatus} scope="custom-request">
      <main id="main-content" data-custom-request>
        <div className="mx-auto max-w-public px-5 pt-6 sm:px-12 sm:pt-8">
          <NiuvaLink className="min-h-11" href="/custom-print" size="sm" variant="outline"><Icon aria-hidden="true" className="size-4" name="arrow-left" />Custom 3D Print</NiuvaLink>
          <h1 className={`${type.display.className} mt-8 max-w-[18em] text-balance`}>
            {referenceMode ? "Mulai dari referensi, lanjutkan sampai model siap." : "Siapkan file untuk review operator."}
          </h1>
          <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">
            {referenceMode
              ? "Belum perlu model 3D. Ceritakan apa yang ingin dibuat; operator meninjau kebutuhan Anda sebelum ada model, slicing, dan quote."
              : liveEnabled
                ? "Model Anda tersimpan privat dan diperiksa operator sebelum ada quote atau produksi."
                : previewEnabled
                  ? "Preview lokal: file diperiksa di perangkat ini dan tidak dikirim, dan tidak ada pengajuan yang dibuat."
                  : "Unggah model belum tersedia saat ini. Anda bisa mulai dari referensi, atau membahas kebutuhan dengan tim Niuva lewat WhatsApp."}
          </p>
          <nav aria-label="Titik mulai" className="mt-8 flex flex-wrap gap-2">
            <NiuvaLink aria-current={!referenceMode ? "page" : undefined} className="min-h-11" href={modeQuery(false)} variant={referenceMode ? "outline" : "default"}>Saya punya model 3D/CAD</NiuvaLink>
            <NiuvaLink aria-current={referenceMode ? "page" : undefined} className="min-h-11" href={modeQuery(true)} variant={referenceMode ? "default" : "outline"}>Saya baru punya referensi</NiuvaLink>
          </nav>
        </div>

        <div className="mx-auto grid max-w-public items-start gap-8 px-5 pt-10 sm:px-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <div className="min-w-0">
            {referenceMode ? <ReferenceRequestForm
                customerEmail={customer.email}
                databaseEnabled={databaseEnabled}
                initialProductInterest={initialProductInterest}
                productOptions={CUSTOM_FLOW_PRODUCT_OPTIONS}
                uploadsEnabled={liveEnabled}
              /> : <RequestForm
                customerEmail={customer.email}
                initialProductInterest={initialProductInterest}
                liveEnabled={liveEnabled}
                previewEnabled={previewEnabled}
                productOptions={CUSTOM_FLOW_PRODUCT_OPTIONS}
              />}
          </div>

          <aside aria-labelledby="request-next-title" className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-medium tracking-[-0.015em]" id="request-next-title">Setelah Anda mengirim</h2>
            <ol className="mt-5 space-y-4">
              {nextSteps.map((step, index) => (
                <li className="flex gap-3 text-base leading-[1.55]" key={step}>
                  <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-ui font-semibold text-brand-800 tabular-nums">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t border-border pt-4 text-ui font-normal leading-[1.55] text-muted-foreground">Status pengajuan belum menentukan harga final, kelayakan cetak, atau jadwal produksi.</p>
            <h3 className="mt-6 text-lg font-medium">Yang perlu disiapkan</h3>
            <ul className="mt-3 space-y-2.5">
              {(referenceMode ? referenceReadinessItems : modelReadinessItems).map((item) => (
                <li className="flex gap-2.5 text-ui font-normal leading-[1.55]" key={item}>
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" name="check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}
