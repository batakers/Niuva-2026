import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { ClosingPanel } from "@/components/niuva/closing-panel";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon, type IconName } from "@/components/ui/Icon";
import { mascotRenders } from "@/features/public/mascot";
import { getServerCapabilities } from "@/lib/env/server";
import { CUSTOM_FLOW_PRODUCT_OPTIONS } from "@/modules/custom-print/product-intake";
import { readPublicEstimatePolicy } from "@/modules/custom-print/public-estimate-service";
import { formatRupiah } from "@/modules/shared/format";
import { studioHourlyFromRp } from "@/features/public/studio-rental";
import { EstimateCalculator } from "./estimate-calculator";
import { StudioRentalSection } from "./studio-rental-section";
import { CUSTOM_FILE_MAX_BYTES, REFERENCE_PHOTO_MAX_BYTES } from "@/modules/policy/privacy";

export const metadata: Metadata = {
  title: "Custom 3D Print · Niuva",
  description:
    "Kirim model 3D atau referensi Anda. Operator Niuva memeriksa file dan hasil slicing, lalu mengirim quote sebelum produksi.",
};

const workflow = [
  {
    label: "File dan konfigurasi",
    description: "Kirim model 3D/CAD, atau deskripsi dan referensi, lengkap dengan material, jumlah, dan catatan Anda.",
  },
  {
    label: "Review dan slicing operator",
    description: "Operator memeriksa file, lalu mencatat berat, durasi cetak, dan temuan penting dari slicer.",
  },
  {
    label: "Quote dan persetujuan",
    description: "Niuva mengirim quote dari hasil review. Anda menerima atau menolaknya dari akun.",
  },
  {
    label: "Produksi dan QC",
    description: "Setelah pembayaran terverifikasi, pesanan dicetak, di-finishing, dan diperiksa sebelum dikirim.",
  },
] as const;

const preparationItems = [
  "Konfirmasi unit atau skala model, terutama untuk STL.",
  "Tentukan material, warna, dan jumlah awal.",
  "Tulis fungsi, area kritis, atau orientasi cetak bila penting.",
  "Pastikan Anda berhak mengirim file tersebut.",
] as const;

const boundaries = [
  { term: "Harga", icon: "circle-dollar-sign", detail: "Estimasi awal, bukan harga final. Tidak ada harga final instan dari geometri. Quote disusun setelah operator memeriksa hasil slicing dan biaya pekerjaan." },
  { term: "File", icon: "lock-keyhole", detail: "File Anda disimpan privat. Hanya tim Niuva yang membukanya, lewat tautan yang berlaku singkat." },
  { term: "Ongkir", icon: "package-check", detail: "Dihitung setelah produksi dan QC selesai, dari ukuran paket final." },
] as const satisfies readonly Readonly<{ detail: string; icon: IconName; term: string }>[];

const commonQuestions = [
  {
    question: "Saya baru punya sketsa atau foto. Bisa mulai?",
    answer: "Bisa. Mulai dari referensi: jelaskan kebutuhan dan perkiraan jumlah, lalu tambahkan link HTTPS atau satu foto bila ada. Model 3D bisa ditambahkan nanti dari akun, dengan nomor referensi yang sama.",
  },
  {
    question: "Apakah semua file menghasilkan simulasi biaya?",
    answer: "Tidak. Simulasi tersedia untuk STL, OBJ, dan 3MF bila Anda punya berat dan durasi cetak per unit dari slicer sendiri, dengan PLA atau ABS dari stok Niuva. STEP dan STP selalu diperiksa manual.",
  },
  {
    question: "Apakah simulasi atau estimasi awal adalah harga final?",
    answer: "Bukan. Simulasi hanya menghitung material dan waktu mesin. Operator memeriksa file, konfigurasi, dan biaya lain sebelum mengirim quote. Ongkir dihitung terpisah dari ukuran paket final.",
  },
  {
    question: "Kapan pekerjaan menjadi pesanan?",
    answer: "Setiap pengajuan direview operator lebih dulu. Setelah quote dikirim, Anda dapat menerima atau menolaknya dari akun. Pesanan baru dibuat dari quote yang Anda terima, setelah diperiksa ulang.",
  },
] as const;

const startCard = "flex min-w-0 flex-col rounded-[var(--radius-card)] border border-border bg-card p-6 sm:p-8";
const factRow = "grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-3";

export default async function CustomPrintPage() {
  await connection();

  let liveEnabled = false;
  let databaseEnabled = false;
  let customerAuthEnabled = false;
  try {
    const capabilities = getServerCapabilities();
    liveEnabled = capabilities.customUploads;
    databaseEnabled = capabilities.database;
    customerAuthEnabled = capabilities.database && capabilities.customerGoogle;
  } catch {
    // Incomplete provider configuration keeps the public page fail-closed.
  }

  const previewEnabled = process.env.NODE_ENV === "development" && !liveEnabled;
  const functionalStatus = liveEnabled
    ? "server-backed" as const
    : previewEnabled
      ? "frontend-preview" as const
      : "capability-gated" as const;
  const modelAvailable = customerAuthEnabled && (liveEnabled || previewEnabled);
  const referenceAvailable = customerAuthEnabled && databaseEnabled;

  const maxFileSizeLabel = `${CUSTOM_FILE_MAX_BYTES / 1_024 / 1_024} MiB`;
  const maxPhotoSizeLabel = `${REFERENCE_PHOTO_MAX_BYTES / 1_024 / 1_024} MiB`;
  const estimatePolicy = databaseEnabled ? await readPublicEstimatePolicy() : null;

  return (
    <PublicShell functionalStatus={functionalStatus} scope="custom-print" headerAction={{ href: "#start-custom", label: "Pilih titik mulai" }}>
      <main id="main-content" data-custom-print data-smooth-anchors>
        {/* Same blue-field geometry as a service detail, so its measured text contrast carries over. */}
        <section
          aria-labelledby="custom-print-title"
          className="relative mx-3 overflow-hidden rounded-[var(--radius-media)] bg-[radial-gradient(130%_70%_at_50%_100%,var(--brand-400)_0%,var(--brand-600)_32%,var(--brand-700)_62%,var(--brand-800)_100%)] text-white sm:mx-6 lg:h-120 lg:bg-[radial-gradient(52%_105%_at_83%_38%,var(--brand-400)_0%,var(--brand-600)_30%,var(--brand-700)_58%,var(--brand-800)_100%)]"
        >
          <div className="relative z-10 px-6 pt-10 sm:px-(--panel-inset) lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[calc(var(--panel-inset)+38rem)] lg:flex-col lg:justify-center lg:pr-0 lg:pt-0">
            <h1 className={`${type.display.className} text-balance`} id="custom-print-title">Review dulu. Baru produksi.</h1>
            <p className="mt-5 max-w-[44ch] text-base leading-[1.6] text-white sm:text-lg">Kirim model 3D atau ceritakan referensi Anda. Operator memeriksa kebutuhan dan hasil slicing, lalu mengirim quote untuk Anda setujui sebelum produksi dimulai.</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <NiuvaLink className="min-h-11" href="#start-custom" variant="onBrand">Pilih titik mulai</NiuvaLink>
              <a className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4 hover:decoration-2" href="#workflow">Lihat alurnya</a>
            </div>
          </div>
          <div className="relative h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[calc(var(--panel-inset)+38rem)] lg:h-auto">
            <Image alt="Maskot Niuva memegang laptop" className="absolute -bottom-7.5 left-1/2 h-[108%] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-xl lg:-bottom-10 lg:h-[112%]" height={1400} preload sizes="(max-width: 1024px) 90vw, 560px" src={mascotRenders.design} width={1400} />
            <div className="absolute top-14 right-(--panel-inset) z-20 hidden w-66 rounded-[var(--radius-control)] bg-card p-4 text-foreground shadow-floating xl:block">
              <p className="text-base font-semibold">Quote sebelum produksi</p>
              <p className="mt-1 text-caption leading-[1.45] text-muted-foreground">Produksi dimulai setelah quote Anda setujui dan pembayaran terverifikasi.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="modes-title" className="mx-auto max-w-public scroll-mt-24 px-5 pt-24 sm:px-12 sm:pt-32" id="start-custom">
          <h2 className={type.heading.className} id="modes-title">Mulai dari yang sudah Anda punya.</h2>
          <p className="mt-4 max-w-[52ch] text-lead leading-[1.6] text-muted-foreground">Keduanya masuk ke review operator yang sama. Referensi bisa dilengkapi dengan model 3D nanti.</p>
          {!customerAuthEnabled ? <div className="mt-8 max-w-3xl"><StatusNotice tone="warning" title="Login Customer belum tersedia saat ini." description="Anda tetap bisa membaca pilihan dan alurnya. Pengajuan bisa dikirim setelah login Customer tersedia." /></div> : null}

          <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
            <article aria-labelledby="mode-model-title" className={startCard}>
              <h3 className="text-2xl font-medium tracking-[-0.015em]" id="mode-model-title">Saya punya model 3D/CAD</h3>
              <p className="mt-3 max-w-[48ch] text-base leading-[1.6] text-muted-foreground">Unggah model secara privat, konfirmasi unit atau skala, lalu pilih material dan jumlah. Punya berat dan durasi dari slicer sendiri? Anda bisa melihat simulasi biaya komponen.</p>
              <dl className="mt-6 divide-y divide-border border-y border-border text-ui">
                <div className={factRow}><dt className="font-normal text-muted-foreground">Model</dt><dd className="font-semibold">STL · 3MF · OBJ</dd></div>
                <div className={factRow}><dt className="font-normal text-muted-foreground">Diperiksa manual</dt><dd className="font-semibold">STEP · STP</dd></div>
                <div className={factRow}><dt className="font-normal text-muted-foreground">Ukuran maksimal</dt><dd className="font-semibold tabular-nums">{maxFileSizeLabel} per file</dd></div>
              </dl>
              <div className="mt-auto pt-6">
                {!liveEnabled ? <p className="mb-4 text-ui font-normal text-muted-foreground">{previewEnabled ? "Preview lokal: file diperiksa di perangkat ini dan tidak dikirim." : "Unggah model belum tersedia saat ini."}</p> : null}
                {modelAvailable ? <NiuvaLink className="min-h-11" href="/custom-print/request" variant="outline">Siapkan model untuk review</NiuvaLink> : null}
              </div>
            </article>

            <article aria-labelledby="mode-reference-title" className={startCard}>
              <h3 className="text-2xl font-medium tracking-[-0.015em]" id="mode-reference-title">Saya baru punya referensi</h3>
              <p className="mt-3 max-w-[48ch] text-base leading-[1.6] text-muted-foreground">Ceritakan fungsi dan kebutuhan awal beserta perkiraan jumlah. Model 3D bisa ditambahkan nanti, dengan nomor referensi yang sama.</p>
              <dl className="mt-6 divide-y divide-border border-y border-border text-ui">
                <div className={factRow}><dt className="font-normal text-muted-foreground">Deskripsi</dt><dd className="font-semibold">Wajib, dengan perkiraan jumlah</dd></div>
                <div className={factRow}><dt className="font-normal text-muted-foreground">Link referensi</dt><dd className="font-semibold">HTTPS, opsional</dd></div>
                <div className={factRow}><dt className="font-normal text-muted-foreground">Foto atau sketsa</dt><dd className="font-semibold">JPG atau PNG, maks. {maxPhotoSizeLabel}, opsional</dd></div>
              </dl>
              <div className="mt-auto pt-6">
                {!databaseEnabled ? <p className="mb-4 text-ui font-normal text-muted-foreground">Pengajuan referensi belum tersedia saat ini.</p>
                  : !liveEnabled ? <p className="mb-4 text-ui font-normal text-muted-foreground">Foto belum bisa diunggah saat ini; deskripsi dan link tetap bisa dikirim.</p> : null}
                {referenceAvailable ? <NiuvaLink className="min-h-11" href="/custom-print/request?mode=reference" variant="outline">Ajukan referensi untuk review</NiuvaLink> : null}
              </div>
            </article>
          </div>

          <p className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-[var(--radius-card)] border border-border bg-card px-6 py-3 text-base leading-[1.55] sm:px-8">
            <span>Ingin mencetak sendiri? Sewa printer di studio Niuva mulai {formatRupiah(BigInt(studioHourlyFromRp))} per jam.</span>
            <a className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:decoration-2" href="#studio">Lihat harga sewa</a>
          </p>

          <div className="mt-10 grid gap-6 border-t border-border pt-8 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-10">
            <h3 className="text-xl font-medium tracking-[-0.01em]">Sebelum mengirim</h3>
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {preparationItems.map((item) => (
                <li className="flex gap-3 text-base leading-[1.55]" key={item}>
                  <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" name="check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="workflow-title" className="mx-auto max-w-public scroll-mt-24 px-5 pt-24 sm:px-12 sm:pt-32" id="workflow">
          <h2 className={type.heading.className} id="workflow-title">Dari file sampai barang jadi.</h2>
          <p className="mt-4 max-w-[52ch] text-lead leading-[1.6] text-muted-foreground">Setiap tahap punya keputusan yang jelas. Tidak ada yang diproduksi sebelum Anda menyetujui quote.</p>
          <ol className="mt-10 grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-4">
            {workflow.map(({ description, label }, index) => (
              <li className="border-t border-border pt-5" key={label}>
                <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-ui font-semibold text-brand-800 tabular-nums">{index + 1}</span>
                <h3 className="mt-4 text-xl font-medium tracking-[-0.01em]">{label}</h3>
                <p className="mt-2 max-w-[40ch] text-base leading-[1.6] text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        {CUSTOM_FLOW_PRODUCT_OPTIONS.length > 0 ? (
          <section aria-labelledby="custom-products-title" className="mx-auto max-w-public px-5 pt-24 sm:px-12 sm:pt-32">
            <h2 className={type.heading.className} id="custom-products-title">Pilih referensi, lalu biarkan operator mengunci detailnya.</h2>
            <p className="mt-4 max-w-[52ch] text-lead leading-[1.6] text-muted-foreground">Produk ini butuh detail custom, jadi tetap melalui review dan quote. Harga katalog tidak berlaku untuk alur ini.</p>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CUSTOM_FLOW_PRODUCT_OPTIONS.map((product) => (
                <li className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card" key={product.sourceProductId}>
                  <div className="relative aspect-square">
                    {product.imagePath ? <Image alt={`Foto referensi ${product.name}`} className="object-contain" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" src={product.imagePath} /> : null}
                  </div>
                  <div className="flex flex-1 flex-col border-t border-border p-5">
                    <h3 className="text-lg font-medium">{product.name}</h3>
                    <p className="mt-2 line-clamp-3 text-ui font-normal text-muted-foreground">Varian referensi: {product.variantNames.join(", ")}.</p>
                    {customerAuthEnabled ? <NiuvaLink className="mt-5 min-h-11 self-start" href={`/custom-print/request?product=${encodeURIComponent(product.sourceProductId)}`} variant="outline">Ajukan untuk Review</NiuvaLink> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="estimate-title" className="mx-auto max-w-public scroll-mt-24 px-5 pt-24 sm:px-12 sm:pt-32" id="estimate">
          <h2 className={type.heading.className} id="estimate-title">Perkirakan biaya dari angka slicer Anda.</h2>
          <p className="mt-4 max-w-[52ch] text-lead leading-[1.6] text-muted-foreground">Punya berat dan durasi cetak dari slicer? Lihat perkiraan material dan waktu mesin sebelum mengirim model. Tanpa login, dan angka Anda tidak disimpan.</p>
          <EstimateCalculator policy={estimatePolicy} requestHref={modelAvailable ? "/custom-print/request" : null} />
        </section>

        <section aria-labelledby="boundaries-title" className="mx-auto grid max-w-public gap-10 px-5 pt-24 sm:px-12 sm:pt-32 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2 className={type.heading.className} id="boundaries-title">Harga, file, dan ongkir punya aturannya sendiri.</h2>
            <p className="mt-4 max-w-[44ch] text-lead leading-[1.6] text-muted-foreground">Supaya angka yang Anda setujui adalah angka yang sudah diperiksa.</p>
          </div>
          <dl className="divide-y divide-border rounded-[var(--radius-media)] border border-border bg-card">
            {boundaries.map(({ detail, icon, term }) => (
              <div className="grid gap-2 px-6 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6 sm:px-8" key={term}>
                <dt className="flex items-center gap-2.5 self-start text-lg font-medium"><Icon aria-hidden="true" className="size-5 text-primary" name={icon} />{term}</dt>
                <dd className="text-base leading-[1.6]">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <StudioRentalSection />

        <section aria-labelledby="faq-title" className="mx-auto grid max-w-public gap-8 px-5 pt-24 sm:px-12 sm:pt-32 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <h2 className={type.heading.className} id="faq-title">Pertanyaan yang sering muncul.</h2>
          <div className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-card">
            {commonQuestions.map(({ question, answer }) => (
              <details className="group" key={question}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-card)] px-5 py-3 text-lg font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-6 [&::-webkit-details-marker]:hidden">
                  {question}
                  <Icon aria-hidden="true" className="size-4 shrink-0 transition-transform duration-[var(--duration-normal-token)] group-open:rotate-180 motion-reduce:transition-none" name="arrow-down" />
                </summary>
                <p className="max-w-[62ch] px-5 pb-5 text-base leading-[1.65] text-muted-foreground sm:px-6">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <ClosingPanel id="request-title" mascot={mascotRenders.build} title="Siap mengirim kebutuhan Anda?">
          {referenceAvailable || modelAvailable ? (
            <>
              <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-white">Operator meninjau setiap pengajuan dan mengirim quote sebelum apa pun dicetak.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {modelAvailable ? <NiuvaLink className="min-h-11" href="/custom-print/request" variant="onBrand">Saya punya model</NiuvaLink> : null}
                {referenceAvailable ? <NiuvaLink className="min-h-11" href="/custom-print/request?mode=reference" variant="onBrand">Mulai dari referensi</NiuvaLink> : null}
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-white"><span>Pengiriman menunggu login Customer.</span> Sementara itu, ceritakan kebutuhan Anda kepada tim Niuva lewat WhatsApp.</p>
              <B2BContactLink className="mt-7" variant="onBrand" />
            </>
          )}
        </ClosingPanel>
      </main>
    </PublicShell>
  );
}
