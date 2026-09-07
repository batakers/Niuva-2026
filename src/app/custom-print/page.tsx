import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDown,
  Check,
  FileBox,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  ScanSearch,
} from "lucide-react";

import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AuLink } from "@/components/ui/AuLink";

export const metadata: Metadata = {
  title: "Custom 3D Print · Niuva",
  description:
    "Pahami alur file privat, review operator, slicing, quote, produksi, dan pengiriman untuk kebutuhan custom 3D print.",
};

const workflow = [
  {
    label: "File dan konfigurasi",
    description:
      "Anda menyiapkan model, unit atau skala, material, jumlah, dan catatan yang membantu pemeriksaan.",
    icon: FileBox,
  },
  {
    label: "Review dan slicing operator",
    description:
      "Operator memeriksa file lalu mencatat berat, durasi, material, konfigurasi, dan temuan yang relevan dari slicer.",
    icon: ScanSearch,
  },
  {
    label: "Quote dan persetujuan",
    description:
      "Niuva menyusun quote dari hasil review. Produksi belum berjalan sebelum quote disetujui dan pembayaran terverifikasi.",
    icon: ReceiptText,
  },
  {
    label: "Produksi dan QC",
    description:
      "Pekerjaan masuk produksi sesuai konfigurasi yang disepakati, lalu melalui finishing dan quality control.",
    icon: PackageCheck,
  },
] as const;

const preparationItems = [
  "Konfirmasi unit atau skala model, terutama untuk STL.",
  "Tentukan kebutuhan material, warna, dan jumlah awal.",
  "Sertakan catatan fungsi, area kritis, atau orientasi bila relevan.",
  "Pastikan Anda berhak mengirim dan memproses file tersebut.",
] as const;

export default function CustomPrintPage() {
  return (
    <PublicShell scope="custom-print">
      <main id="main-content" data-custom-print>
        <section className="dark overflow-hidden border-b border-border bg-background text-foreground">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-brand-300">Custom 3D Print</p>
              <h1 className={`${type.display.className} mt-4 text-balance`}>
                Review dulu. Baru produksi.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300">
                File ditinjau dan dislicing operator sebelum Niuva menyusun quote yang dapat Anda setujui.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <AuLink className="min-h-11 gap-2" href="#request-readiness">
                  Siapkan request
                  <ArrowDown aria-hidden="true" className="size-4" />
                </AuLink>
                <AuLink className="min-h-11" href="#workflow" variant="outline">
                  Pahami proses
                </AuLink>
              </div>
            </div>

            <figure className="overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950">
              <div className="relative aspect-[3/2]">
                <Image
                  alt="Ilustrasi konseptual model 3D yang berubah dari wireframe menjadi lapisan cetak"
                  className="object-cover"
                  fill
                  priority
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  src="/assets/illustrations/custom-print-file-to-object.png"
                />
              </div>
              <figcaption className="border-t border-neutral-700 px-4 py-3 text-xs leading-5 text-neutral-400">
                Ilustrasi konseptual alur file ke objek. Bukan hasil produksi Niuva.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="border-b border-border bg-card" id="workflow" aria-labelledby="workflow-title">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(16rem,0.55fr)_minmax(0,1fr)] lg:gap-16">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <p className="text-sm font-medium text-brand-700">Alur yang dapat ditinjau</p>
              <h2 className={`${type.heading.className} mt-3`} id="workflow-title">
                Keputusan penting tidak diserahkan pada tebakan browser.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                Model adalah titik awal. Operator tetap memverifikasi hasil slicing sebelum harga dan produksi dapat bergerak.
              </p>
            </div>

            <ol className="border-t border-border">
              {workflow.map(({ description, icon: StepIcon, label }) => (
                <li className="grid gap-4 border-b border-border py-7 sm:grid-cols-[3rem_minmax(0,1fr)]" key={label}>
                  <span className="flex size-11 items-center justify-center rounded-lg border border-brand-300 bg-brand-100 text-brand-800">
                    <StepIcon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className={type.subheading.className}>{label}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-border bg-background" aria-labelledby="files-title">
          <div className="mx-auto max-w-public px-5 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:col-span-7">
                <p className="text-sm font-medium text-brand-700">Dossier file</p>
                <h2 className={`${type.heading.className} mt-3 max-w-xl`} id="files-title">
                  Bawa file dan konteks yang membantu review.
                </h2>
                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold">Model siap diperiksa</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">STL · 3MF · OBJ</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Format awal untuk alur model 3D. File tetap melalui validasi dan review operator.
                    </p>
                  </div>
                  <div className="border-t border-border pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                    <p className="text-sm font-semibold">Lampiran untuk review manual</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">STEP · STP</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Diterima sebagai referensi manual, bukan untuk analisis geometri atau harga otomatis.
                    </p>
                  </div>
                </div>
                <div className="mt-8 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
                  Batas ukuran file akan ditampilkan oleh form request setelah kebijakan final tersedia. Halaman ini tidak menebak angka sementara.
                </div>
              </div>

              <aside className="rounded-xl bg-brand-950 p-6 text-neutral-50 sm:p-8 lg:col-span-5" aria-labelledby="prepare-title">
                <p className="text-sm font-medium text-brand-300">Sebelum mengirim</p>
                <h3 className={`${type.subheading.className} mt-3`} id="prepare-title">Empat hal yang mempercepat pemeriksaan.</h3>
                <ul className="mt-6 space-y-4">
                  {preparationItems.map((item) => (
                    <li className="flex gap-3 text-sm leading-6 text-neutral-300" key={item}>
                      <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-card" aria-labelledby="boundaries-title">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-medium text-brand-700">Batas yang dibuat jelas</p>
              <h2 className={`${type.heading.className} mt-3 max-w-xl`} id="boundaries-title">
                File privat dan harga final punya jalur verifikasi sendiri.
              </h2>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              <div className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole aria-hidden="true" className="size-4 text-brand-700" /> Akses file</dt>
                <dd className="text-sm leading-6 text-muted-foreground">Upload produksi akan memakai penyimpanan privat dan akses singkat untuk pihak berwenang.</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="flex items-center gap-2 text-sm font-semibold"><ScanSearch aria-hidden="true" className="size-4 text-brand-700" /> Harga</dt>
                <dd className="text-sm leading-6 text-muted-foreground">Tidak ada harga final instan dari geometri. Quote disusun setelah input slicer diverifikasi operator.</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="flex items-center gap-2 text-sm font-semibold"><PackageCheck aria-hidden="true" className="size-4 text-brand-700" /> Pengiriman</dt>
                <dd className="text-sm leading-6 text-muted-foreground">Biaya pengiriman custom dihitung setelah produksi, QC, dan ukuran paket final tersedia.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="bg-background" id="request-readiness" aria-labelledby="request-title">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,1.1fr)] lg:items-center">
            <div>
              <p className="text-sm font-medium text-brand-700">Langkah berikutnya</p>
              <h2 className={`${type.heading.className} mt-3`} id="request-title">Siapkan konteksnya sekarang, kirim saat form tersedia.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Form khusus akan menangani file, konfigurasi, kontak, progres, validasi, dan pemulihan tanpa klaim upload palsu.
              </p>
            </div>
            <StatusNotice
              tone="info"
              title="Form request siap untuk preview."
              description="Anda dapat menguji metadata, konfigurasi, progres, dan pemulihan secara lokal. Tidak ada file atau request yang dikirim."
              action={<AuLink className="min-h-11" href="/custom-print/request">Mulai request</AuLink>}
              secondaryAction={<AuLink className="min-h-11" href="/project-brief" variant="outline">Diskusikan kebutuhan khusus</AuLink>}
            />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
