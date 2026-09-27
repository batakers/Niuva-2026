import type { Metadata } from "next";
import { connection } from "next/server";

import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
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
  title: "Request Custom 3D Print · Niuva",
  description: "Kirim model siap review atau mulai dari referensi awal untuk custom print Niuva.",
};

const modelReadinessItems = [
  "Satu file model atau lampiran review manual.",
  "Material, warna, jumlah, dan unit atau skala.",
  "Kontak yang dapat dipakai untuk pembahasan operator.",
] as const;
const referenceReadinessItems = [
  "Deskripsi kebutuhan, fungsi, dan perkiraan jumlah.",
  "Link atau foto referensi bila sudah tersedia.",
  "Kontak untuk tindak lanjut operator.",
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

  return (
    <PublicShell functionalStatus={functionalStatus} scope="custom-request">
      <main id="main-content" data-custom-request>
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-sm font-medium text-brand-700">Request Custom 3D Print</p>
              <h1 className={`${type.display.className} mt-4 max-w-3xl text-balance`}>
                {referenceMode ? "Mulai dari referensi, lanjutkan sampai model siap." : "Siapkan file untuk review operator."}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                {referenceMode
                  ? "Deskripsi dapat dikirim tanpa model 3D. Foto privat tersedia saat storage aktif; operator meninjau kebutuhan sebelum file model, slicing, dan quote."
                  : liveEnabled
                  ? "Upload privat meneruskan file ke ruang penyimpanan tertutup untuk diperiksa operator sebelum estimasi dan produksi."
                  : previewEnabled
                    ? "Preview ini memeriksa metadata dan konfigurasi tanpa mengunggah isi file atau membuat request nyata."
                    : "Upload custom print belum diaktifkan pada runtime ini. Diskusikan kebutuhan Anda melalui project brief."}
              </p>
            </div>

            <aside className="rounded-xl bg-brand-950 p-6 text-neutral-50 lg:col-span-5" aria-labelledby="readiness-title">
              <div className="flex items-center gap-3">
                <Icon aria-hidden="true" className="size-5 text-brand-300" name="file-search" />
                <h2 className="text-base font-semibold" id="readiness-title">Yang perlu disiapkan</h2>
              </div>
              <ul className="mt-5 space-y-3">
                {(referenceMode ? referenceReadinessItems : modelReadinessItems).map((item) => (
                  <li className="flex gap-3 text-sm leading-6 text-neutral-300" key={item}>
                    <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-300" name="check" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:gap-12">
            <aside className="space-y-8 lg:col-span-4 lg:sticky lg:top-8 lg:self-start">
              <nav aria-label="Pilih kesiapan file" className="grid gap-2">
                <NiuvaLink aria-current={!referenceMode ? "page" : undefined} href={`/custom-print/request${initialProductInterest ? `?product=${encodeURIComponent(initialProductInterest)}` : ""}`} variant={referenceMode ? "outline" : "default"}>Saya punya model 3D/CAD</NiuvaLink>
                <NiuvaLink aria-current={referenceMode ? "page" : undefined} href={`/custom-print/request?mode=reference${initialProductInterest ? `&product=${encodeURIComponent(initialProductInterest)}` : ""}`} variant={referenceMode ? "default" : "outline"}>Saya baru punya referensi</NiuvaLink>
              </nav>
              <div>
                <p className="text-sm font-medium text-brand-700">{referenceMode ? "Referensi awal" : liveEnabled ? "Ruang privat" : previewEnabled ? "Batas preview" : "Upload belum tersedia"}</p>
                <h2 className={`${type.heading.className} mt-3`}>{referenceMode ? "Satu request, konteks tetap tersambung." : liveEnabled ? "File diteruskan untuk review." : previewEnabled ? "Metadata terlihat. Isi file tetap di perangkat." : "Form menunggu aktivasi capability."}</h2>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  {referenceMode
                    ? "Setelah mengirim, simpan tautan privat. Model dapat ditambahkan ke nomor referensi yang sama saat siap."
                    : liveEnabled
                    ? "File dikirim langsung ke storage privat. Server hanya menerima metadata terverifikasi dan file ID setelah pemeriksaan selesai."
                    : previewEnabled
                      ? "Browser hanya memakai nama, ekstensi, dan ukuran untuk simulasi. Tidak ada file ID, storage key, atau signed URL yang dibuat."
                      : "Tidak ada file atau request yang dikirim sampai storage privat dan database siap digunakan."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Icon aria-hidden="true" className="size-6 text-brand-700" name="shield-check" />
                <h3 className="mt-4 text-base font-semibold">Review manusia tetap wajib</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {referenceMode
                    ? "Foto atau deskripsi bukan hasil slicing. Quote baru dapat dibuat setelah model diperiksa dan operator mencatat berat serta durasi."
                    : liveEnabled
                    ? "Status upload tidak menentukan kelayakan cetak, harga final, atau jadwal produksi."
                    : previewEnabled
                      ? "Status preview tidak menentukan kelayakan cetak, harga final, atau jadwal produksi."
                      : "Capability upload belum aktif; tidak ada status produksi yang dibuat dari halaman ini."}
                </p>
              </div>
              <NiuvaLink className="min-h-11" href="/custom-print" variant="outline">Kembali ke penjelasan proses</NiuvaLink>
            </aside>

            <div className="lg:col-span-8">
              {referenceMode ? <ReferenceRequestForm
                  databaseEnabled={databaseEnabled}
                  initialProductInterest={initialProductInterest}
                  productOptions={CUSTOM_FLOW_PRODUCT_OPTIONS}
                  uploadsEnabled={liveEnabled}
                /> : <RequestForm
                  initialProductInterest={initialProductInterest}
                  liveEnabled={liveEnabled}
                  previewEnabled={previewEnabled}
                  productOptions={CUSTOM_FLOW_PRODUCT_OPTIONS}
                />}
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
