import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getServerCapabilities } from "@/lib/env/server";
import { CUSTOM_FLOW_PRODUCT_OPTIONS } from "@/modules/custom-print/product-intake";
import { CUSTOM_FILE_MAX_BYTES, REFERENCE_PHOTO_MAX_BYTES } from "@/modules/policy/privacy";

export const metadata: Metadata = {
  title: "Custom 3D Print · Niuva",
  description:
    "Pahami alur file privat, review operator, slicing, quote, produksi, dan pengiriman untuk kebutuhan custom 3D print.",
};

const workflow = [
  {
    label: "File dan konfigurasi",
    description:
      "Mulai dari model 3D/CAD atau deskripsi dan referensi. Unit model, material, jumlah, dan catatan membantu pemeriksaan saat tersedia.",
    icon: "file-box",
  },
  {
    label: "Review dan slicing operator",
    description:
      "Operator memeriksa file lalu mencatat berat, durasi, material, konfigurasi, dan temuan yang relevan dari slicer.",
    icon: "scan-search",
  },
  {
    label: "Quote dan persetujuan",
    description:
      "Niuva menyusun quote dari hasil review. Produksi belum berjalan sebelum quote disetujui dan pembayaran terverifikasi.",
    icon: "receipt-text",
  },
  {
    label: "Produksi dan QC",
    description:
      "Pekerjaan masuk produksi sesuai konfigurasi yang disepakati, lalu melalui finishing dan quality control.",
    icon: "package-check",
  },
] as const satisfies readonly Readonly<{
  description: string;
  icon: IconName;
  label: string;
}>[];

const preparationItems = [
  "Konfirmasi unit atau skala model, terutama untuk STL.",
  "Tentukan kebutuhan material, warna, dan jumlah awal.",
  "Sertakan catatan fungsi, area kritis, atau orientasi bila relevan.",
  "Pastikan Anda berhak mengirim dan memproses file tersebut.",
] as const;

const commonQuestions = [
  {
    question: "Saya baru punya sketsa atau foto. Bisa mulai?",
    answer: "Bisa. Pilih mode referensi awal, jelaskan kebutuhan dan perkiraan jumlah, lalu tambahkan link HTTPS atau satu foto bila tersedia. Model dapat ditambahkan pada request yang sama lewat akun saat siap.",
  },
  {
    question: "Apakah semua file menghasilkan simulasi biaya?",
    answer: "Tidak. STL, OBJ, dan 3MF dapat dipakai untuk simulasi komponen hanya jika Anda juga mempunyai berat dan durasi per unit dari slicer sendiri, memilih PLA atau ABS dan filament stok Niuva. STEP dan STP tetap masuk review manual.",
  },
  {
    question: "Apakah simulasi atau estimasi awal adalah harga final?",
    answer: "Bukan. Simulasi customer hanya memuat komponen material dan waktu mesin. Operator memeriksa file, konfigurasi, dan biaya lain sebelum menerbitkan estimasi produksi dan quotation. Ongkir dihitung terpisah dari ukuran paket final.",
  },
  {
    question: "Kapan pekerjaan menjadi order?",
    answer: "Request masuk review operator lebih dulu. Setelah quotation dikirim, Anda dapat menerima atau menolaknya dari akun. Order custom baru dibuat dari quotation yang diterima dan divalidasi ulang.",
  },
] as const;

export default async function CustomPrintPage() {
  await connection();

  let liveEnabled = false;
  let databaseEnabled = false;
  try {
    const capabilities = getServerCapabilities();
    liveEnabled = capabilities.customUploads;
    databaseEnabled = capabilities.database;
  } catch {
    // Incomplete provider configuration keeps the public page fail-closed.
  }

  const previewEnabled = process.env.NODE_ENV === "development" && !liveEnabled;
  const functionalStatus = liveEnabled
    ? "server-backed" as const
    : previewEnabled
      ? "frontend-preview" as const
      : "capability-gated" as const;

  const maxFileSizeLabel = `${CUSTOM_FILE_MAX_BYTES / 1_024 / 1_024} MiB`;
  const maxPhotoSizeLabel = `${REFERENCE_PHOTO_MAX_BYTES / 1_024 / 1_024} MiB`;

  return (
    <PublicShell functionalStatus={functionalStatus} scope="custom-print">
      <main id="main-content" data-custom-print>
        <section className="dark overflow-hidden border-b border-border bg-background text-foreground">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-brand-300">Custom 3D Print</p>
              <h1 className={`${type.display.className} mt-4 text-balance`}>
                Review dulu. Baru produksi.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300">
                Mulai dari model siap atau referensi awal. Operator meninjau kebutuhan dan hasil slicing sebelum Niuva menyusun quote yang dapat Anda setujui.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <NiuvaLink className="min-h-11 gap-2" href="#request-readiness">
                  Siapkan request
                  <Icon aria-hidden="true" className="size-4" name="arrow-down" />
                </NiuvaLink>
                <NiuvaLink className="min-h-11" href="#workflow" variant="outline">
                  Pahami proses
                </NiuvaLink>
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
                Model atau referensi awal dapat menjadi titik mulai. Operator tetap memverifikasi model dan hasil slicing sebelum estimasi produksi atau quote diterbitkan.
              </p>
            </div>

            <ol className="border-t border-border">
              {workflow.map(({ description, icon, label }) => (
                <li className="grid gap-4 border-b border-border py-7 sm:grid-cols-[3rem_minmax(0,1fr)]" key={label}>
                  <span className="flex size-11 items-center justify-center rounded-lg border border-brand-300 bg-brand-100 text-brand-800">
                    <Icon aria-hidden="true" className="size-5" name={icon} />
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

        <section className="border-b border-border bg-background" aria-labelledby="custom-products-title">
          <div className="mx-auto max-w-public px-5 py-16 sm:px-8 sm:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-brand-700">Inspirasi produk custom</p>
              <h2 className={`${type.heading.className} mt-3`} id="custom-products-title">
                Pilih referensi, lalu biarkan operator mengunci detailnya.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                Lima produk berikut memiliki foto referensi, tetapi tetap draft karena membutuhkan konteks custom, review, dan quote. Harga pada katalog bukan checkout otomatis untuk alur ini.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CUSTOM_FLOW_PRODUCT_OPTIONS.map((product) => (
                <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card" key={product.sourceProductId}>
                  <div className="relative aspect-[4/3] bg-muted">
                    {product.imagePath ? <Image alt={`Foto referensi ${product.name}`} className="object-cover" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" src={product.imagePath} /> : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-semibold leading-6">{product.name}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      Varian referensi: {product.variantNames.join(", ")}.
                    </p>
                    <NiuvaLink className="mt-5 min-h-11 w-full" href={`/custom-print/request?product=${encodeURIComponent(product.sourceProductId)}`}>
                      Ajukan untuk Review
                    </NiuvaLink>
                  </div>
                </article>
              ))}
            </div>
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
                  Batas model adalah {maxFileSizeLabel} per file. Foto referensi opsional JPG, JPEG, atau PNG dibatasi {maxPhotoSizeLabel}. Ekstensi dan MIME tetap divalidasi sebelum review.
                </div>
              </div>

              <aside className="rounded-xl bg-brand-950 p-6 text-neutral-50 sm:p-8 lg:col-span-5" aria-labelledby="prepare-title">
                <p className="text-sm font-medium text-brand-300">Sebelum mengirim</p>
                <h3 className={`${type.subheading.className} mt-3`} id="prepare-title">Empat hal yang mempercepat pemeriksaan.</h3>
                <ul className="mt-6 space-y-4">
                  {preparationItems.map((item) => (
                    <li className="flex gap-3 text-sm leading-6 text-neutral-300" key={item}>
                      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-300" name="check" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-card" aria-labelledby="modes-title">
          <div className="mx-auto max-w-public px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-sm font-medium text-brand-700">Dua titik mulai MAKE</p>
            <h2 className={`${type.heading.className} mt-3`} id="modes-title">Pilih sesuai bahan yang sudah Anda miliki.</h2>
            <div className="mt-10 grid gap-8 border-t border-border md:grid-cols-2 md:gap-12">
              <div className="pt-7">
                <h3 className={type.subheading.className}>Saya punya model 3D/CAD</h3>
                <p className="mt-3 leading-7 text-muted-foreground">Unggah model privat, konfirmasi unit atau skala, lalu beri material dan perkiraan jumlah. STL, OBJ, dan 3MF dapat disertai berat serta durasi per unit dari slicer Anda untuk simulasi komponen opsional. STEP/STP diperiksa manual.</p>
                <p className="mt-3 text-sm font-medium">{liveEnabled ? "Upload privat tersedia pada runtime ini." : "Upload model sedang tidak tersedia pada runtime ini."}</p>
                {liveEnabled && <NiuvaLink className="mt-5 min-h-11" href="/custom-print/request">Siapkan model untuk review</NiuvaLink>}
              </div>
              <div className="border-t border-border pt-7 md:border-l md:border-t-0 md:pl-12">
                <h3 className={type.subheading.className}>Saya baru punya referensi</h3>
                <p className="mt-3 leading-7 text-muted-foreground">Ceritakan fungsi dan kebutuhan awal beserta perkiraan jumlah. Link HTTPS dan satu foto privat bersifat opsional. Nomor referensi tetap sama ketika model ditambahkan kemudian.</p>
                <p className="mt-3 text-sm font-medium">{databaseEnabled ? liveEnabled ? "Deskripsi, link, dan foto dapat dikirim." : "Deskripsi dan link dapat dikirim tanpa upload foto." : "Pengiriman menunggu database tersedia."}</p>
                {databaseEnabled && <NiuvaLink className="mt-5 min-h-11" href="/custom-print/request?mode=reference" variant="outline">Ajukan referensi untuk review</NiuvaLink>}
              </div>
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
                <dt className="flex items-center gap-2 text-sm font-semibold"><Icon aria-hidden="true" className="size-4 text-brand-700" name="lock-keyhole" /> Akses file</dt>
                <dd className="text-sm leading-6 text-muted-foreground">Saat upload aktif, file customer disimpan privat dan Admin mengaksesnya melalui tautan singkat.</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="flex items-center gap-2 text-sm font-semibold"><Icon aria-hidden="true" className="size-4 text-brand-700" name="scan-search" /> Harga</dt>
                <dd className="text-sm leading-6 text-muted-foreground">Estimasi awal, bukan harga final. Tidak ada harga final instan dari geometri. Quote disusun setelah input slicer diverifikasi operator dan biaya pekerjaan dinilai.</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="flex items-center gap-2 text-sm font-semibold"><Icon aria-hidden="true" className="size-4 text-brand-700" name="package-check" /> Pengiriman</dt>
                <dd className="text-sm leading-6 text-muted-foreground">Biaya pengiriman custom dihitung setelah produksi, QC, dan ukuran paket final tersedia.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="border-b border-border bg-background" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
            <div><p className="text-sm font-medium text-brand-700">Sebelum mengajukan</p><h2 className={`${type.heading.className} mt-3`} id="faq-title">Pertanyaan yang sering muncul.</h2></div>
            <div className="divide-y divide-border border-y border-border">
              {commonQuestions.map(({ question, answer }) => <details className="group py-5" key={question}>
                <summary className="min-h-11 cursor-pointer py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{question}</summary>
                <p className="max-w-2xl pb-2 pr-4 text-sm leading-7 text-muted-foreground">{answer}</p>
              </details>)}
            </div>
          </div>
        </section>

        <section className="bg-background" id="request-readiness" aria-labelledby="request-title">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,1.1fr)] lg:items-center">
            <div>
              <p className="text-sm font-medium text-brand-700">Langkah berikutnya</p>
              <h2 className={`${type.heading.className} mt-3`} id="request-title">Pilih titik mulai sesuai yang sudah Anda punya.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Model siap masuk review file. Jika baru punya sketsa, foto, atau kebutuhan awal, kirim referensi dan tambahkan model pada request yang sama nanti.
              </p>
            </div>
            <StatusNotice
              tone="info"
              title={databaseEnabled
                ? "Referensi awal dapat dikirim untuk ditriase operator."
                : previewEnabled
                  ? "Form model siap untuk preview lokal."
                  : "Form request menunggu database."}
              description={databaseEnabled
                ? liveEnabled
                  ? "Mulai dengan referensi atau unggah model secara privat. Kelayakan cetak dan quote tetap menunggu review operator."
                  : "Kirim deskripsi dan link tanpa upload. Foto dan model baru dapat diunggah setelah storage privat tersedia."
                : previewEnabled
                  ? "Preview model hanya menguji metadata lokal; tidak membuat request nyata."
                  : "Pengiriman request belum tersedia. Anda tetap dapat menjelaskan kebutuhan melalui Project Brief saat layanan itu aktif."}
              action={databaseEnabled
                ? <NiuvaLink className="min-h-11" href="/custom-print/request?mode=reference">Mulai dari referensi</NiuvaLink>
                : liveEnabled || previewEnabled
                  ? <NiuvaLink className="min-h-11" href="/custom-print/request">Saya punya model</NiuvaLink>
                : undefined}
              secondaryAction={<NiuvaLink className="min-h-11" href={liveEnabled ? "/custom-print/request" : "/project-brief"} variant="outline">{liveEnabled ? "Saya punya model" : "Diskusikan kebutuhan khusus"}</NiuvaLink>}
            />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
