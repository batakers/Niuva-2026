import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/niuva/public-shell";

import { typographySystemTokens } from "@/app/auis/styleguide/foundation/typography-proof";
import { EvidenceCard } from "@/components/niuva";
import { AuLink } from "@/components/ui/AuLink";
import { Icon } from "@/components/ui/Icon";
import { publicCompanyProfile, publicServices } from "@/features/public/company-content";
import { isPreviewParameter } from "@/features/frontend-preview/scenarios";
import { getCuratedPublicContentPreview } from "@/features/frontend-preview/server";
import { cn } from "@/lib/utils";

const processSteps = [
  {
    number: "01",
    name: "Idea",
    description: "Tujuan, konteks, dan batasan awal menjadi dasar keputusan.",
  },
  {
    number: "02",
    name: "Design",
    description: "Arah produk diterjemahkan menjadi bentuk dan detail yang dapat ditinjau.",
  },
  {
    number: "03",
    name: "Prototype",
    description: "Konsep diuji melalui iterasi yang membuat hal penting terlihat lebih awal.",
  },
  {
    number: "04",
    name: "Finished Product",
    description: "Hasil dikembangkan menuju produk nyata dengan dukungan manufaktur yang relevan.",
  },
] as const;

const displayToken = typographySystemTokens.display.className;
const headingToken = typographySystemTokens.heading.className;
const subheadingToken = typographySystemTokens.subheading.className;

function SectionMarker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-body text-sm font-medium text-brand-700", className)}>
      {children}
    </p>
  );
}

function PathArrow() {
  return <Icon aria-hidden="true" className="size-4" name="arrow-up-right" />;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { preview } = await searchParams;
  const isPreview = isPreviewParameter(preview);

  return {
    title: "Niuva",
    description: publicCompanyProfile.supportingCopy,
    robots: isPreview ? { follow: false, index: false } : { follow: true, index: true },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const curated = await getCuratedPublicContentPreview(preview);
  const content = curated ?? {
    company: publicCompanyProfile,
    services: publicServices,
  };
  const previewSuffix = curated ? "?preview=curated" : "";
  const capabilityCards = content.services.map((service, index) => ({
    actionLabel: "Tinjau layanan",
    description: service.websiteFraming,
    eyebrow: `Layanan ${index + 1} / ${content.services.length}`,
    href: `/services${previewSuffix}#${service.slug}`,
    meta: service.tags,
    title: service.title,
  }));

  return (
    <PublicShell scope="homepage">
      <main id="main-content">
        {curated && (
          <aside
            aria-label="Status preview konten Niuva"
            className="border-b border-info-border bg-info-background text-info"
          >
            <div className="mx-auto flex max-w-public flex-col gap-2 px-5 py-4 text-sm sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <p>
                Preview lokal · tampilan pembanding untuk konten publik yang sama; parameter preview tidak dapat diindeks.
              </p>
              <AuLink href="/projects?preview=curated" size="sm" variant="outline">
                Tinjau Projects
              </AuLink>
            </div>
          </aside>
        )}
        <section
          aria-labelledby="hero-title"
          className="dark scroll-mt-6 overflow-hidden bg-background text-foreground"
          data-home-section="hero"
          id="hero"
        >
          <div className="mx-auto max-w-public px-5 sm:px-8">
            <div className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-end lg:gap-16 lg:py-28">
              <div className="max-w-3xl">
                <SectionMarker className="text-brand-300">
                  Niuva · mitra pengembangan produk
                </SectionMarker>
                <h1
                  className={`${displayToken} mt-5 max-w-4xl text-neutral-50`}
                  id="hero-title"
                >
                  {content.company.headline}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8">
                  {content.company.supportingCopy}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <AuLink
                    className="gap-2"
                    href="/project-brief"
                    size="lg"
                  >
                    Diskusikan Proyek
                    <PathArrow />
                  </AuLink>
                  <Link
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-600 px-3 text-sm font-medium text-neutral-50 transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    href="#process"
                  >
                    Lihat cara kerja
                    <Icon aria-hidden="true" className="size-4" name="arrow-right" />
                  </Link>
                </div>
              </div>

              <div
                aria-labelledby="process-preview-title"
                className="rounded-xl border border-neutral-700 bg-neutral-800/80 p-5 shadow-floating sm:p-6"
              >
                <div className="flex items-center justify-between gap-4 border-b border-neutral-700 pb-4">
                  <p className="text-xs font-medium text-brand-300">
                    Alur kerja Niuva
                  </p>
                  <p className="text-xs text-neutral-400">
                    4 tahap
                  </p>
                </div>
                <h2 className="sr-only" id="process-preview-title">
                  Empat tahapan alur kerja Niuva
                </h2>
                <ol aria-label="Alur dari ide menjadi produk nyata" className="mt-2">
                  {processSteps.map((step) => (
                    <li
                      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-neutral-700 py-4 last:border-b-0"
                      key={step.number}
                    >
                      <span className="text-sm font-medium tabular-nums text-brand-300">{step.number}</span>
                      <div>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-display text-lg font-semibold text-neutral-50">
                            {step.name}
                          </h3>
                          <span className="text-xs text-neutral-400">
                            Tahap
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-neutral-300">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-700 pt-4 text-xs text-neutral-400">
                  <span>Riset</span>
                  <span>Design</span>
                  <span>Engineering</span>
                  <span>Prototyping</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-700 py-5 text-sm text-neutral-300">
              <span>Presisi dalam proses, ruang untuk eksplorasi.</span>
              <span className="text-xs text-brand-300">
                Bukti konkret · keputusan terarah
              </span>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="entry-paths-title"
          className="scroll-mt-6 border-b border-border bg-card py-16 sm:py-20"
          data-home-section="entry-paths"
          id="entry-paths"
        >
          <div className="mx-auto max-w-public px-5 sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(14rem,0.55fr)_minmax(0,1fr)] lg:items-end">
              <div>
                <SectionMarker>Pilih titik mulai</SectionMarker>
                <h2
                  className={`${headingToken} mt-3 max-w-xl`}
                  id="entry-paths-title"
                >
                  Mulai dari kebutuhan yang sudah Anda punya.
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Tidak semua project dimulai dari tempat yang sama. Pilih jalur yang
                paling dekat dengan konteks Anda, lalu bawa percakapan ke tahap
                berikutnya dengan lebih terarah.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-12">
              <Link
                className="group flex min-h-72 flex-col justify-between rounded-xl border border-brand-300 bg-brand-100 p-6 transition-colors hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-8 lg:col-span-7"
                href="/project-brief"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs font-medium text-brand-800">
                    Project
                  </span>
                  <PathArrow />
                </div>
                <div className="mt-12 max-w-lg">
                  <h3 className={`${subheadingToken} text-brand-950`}>
                    Punya ide atau project?
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-brand-900">
                    Untuk kebutuhan B2B, R&D, design, prototype, merchandise, atau
                    project custom yang membutuhkan pembahasan lebih dalam.
                  </p>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-950">
                  Diskusikan Proyek
                  <Icon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" name="arrow-right" />
                </span>
              </Link>

              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
                <Link
                  className="group flex min-h-40 flex-col justify-between rounded-xl border border-border bg-background p-5 transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  href="/custom-print"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-medium text-brand-700">
                      Custom print
                    </span>
                    <PathArrow />
                  </div>
                  <div className="mt-8">
                    <h3 className={subheadingToken}>Sudah punya model 3D?</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Pahami format file, review operator, quote, dan tahapan produksi sebelum menyiapkan request.
                    </p>
                  </div>
                </Link>

                <Link
                  className="group flex min-h-40 flex-col justify-between rounded-xl border border-border bg-background p-5 transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  href="/shop"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-medium text-brand-700">
                      Ready-made
                    </span>
                    <PathArrow />
                  </div>
                  <div className="mt-8">
                    <h3 className={subheadingToken}>Mau produk siap beli?</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Lihat katalog ready-made dan status ketersediaannya. Pembelian diaktifkan setelah detail produk dan cart selesai.
                    </p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                    Lihat katalog
                    <Icon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" name="arrow-right" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="capabilities-title"
          className="scroll-mt-6 bg-background py-16 sm:py-20"
          data-home-section="capabilities"
          id="capabilities"
        >
          <div className="mx-auto max-w-public px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(14rem,0.55fr)_minmax(0,1fr)] lg:gap-16">
              <div>
                <SectionMarker>Layanan yang tersedia</SectionMarker>
                <h2
                  className={`${headingToken} mt-3 max-w-md`}
                  id="capabilities-title"
                >
                  Kompetensi yang menghubungkan ide dengan bentuk.
                </h2>
                <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">
                  Empat layanan ini menjadi titik masuk untuk kebutuhan yang berbeda,
                  tetapi tetap berada dalam cara kerja Niuva yang sama: terukur dan
                  konkret.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {capabilityCards.map((capability) => (
                  <EvidenceCard
                    actionLabel={"actionLabel" in capability ? capability.actionLabel : undefined}
                    description={capability.description}
                    eyebrow={capability.eyebrow}
                    href={"href" in capability ? capability.href : undefined}
                    key={capability.title}
                    meta={capability.meta}
                    title={capability.title}
                    variant="capability"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="process-title"
          className="dark scroll-mt-6 bg-background py-16 text-foreground sm:py-20"
          data-home-section="process"
          id="process"
        >
          <div className="mx-auto max-w-public px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1fr)] lg:gap-16">
              <div>
                <SectionMarker className="text-brand-300">
                  Cara kerja · dari ide ke produk
                </SectionMarker>
                <h2
                  className={`${headingToken} mt-3 max-w-xl text-neutral-50`}
                  id="process-title"
                >
                  Satu alur kerja untuk keputusan yang lebih jelas.
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-neutral-300">
                  Setiap tahap membawa percakapan lebih dekat ke produk yang dapat
                  ditinjau, diuji, dan dikembangkan dengan konteks yang tetap utuh.
                </p>
                <div className="mt-8 inline-flex rounded-lg border border-neutral-600 px-3 py-2 text-sm font-medium text-brand-300">
                  Ide → desain → prototipe → produk jadi
                </div>
              </div>

              <ol className="border-t border-neutral-700" aria-label="Tahapan kerja Niuva">
                {processSteps.map((step) => (
                  <li
                    className="grid gap-4 border-b border-neutral-700 py-5 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6"
                    key={`detail-${step.number}`}
                  >
                    <span className="text-sm font-medium tabular-nums text-brand-300">{step.number}</span>
                    <div className="grid gap-2 sm:grid-cols-[minmax(10rem,0.6fr)_minmax(0,1fr)] sm:gap-6">
                      <h3 className="font-body text-xl font-semibold text-neutral-50">{step.name}</h3>
                      <p className="text-sm leading-6 text-neutral-300">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="next-step-title"
          className="scroll-mt-6 border-b border-border bg-brand-50 py-16 sm:py-20"
          data-home-section="next-step"
          id="next-step"
        >
          <div className="mx-auto max-w-public px-5 sm:px-8">
            <div className="grid gap-8 rounded-xl border border-brand-200 bg-brand-100 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] lg:items-end lg:p-10">
              <div>
                <SectionMarker>Langkah berikutnya</SectionMarker>
                <h2
                  className={`${headingToken} mt-3 max-w-2xl text-brand-950`}
                  id="next-step-title"
                >
                  Bawa konteks awalnya. Kita tentukan langkah berikutnya.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-brand-900">
                  Mulai dari tujuan, tahap, dan batasan yang sudah diketahui. Pilih
                  jalur yang paling sesuai, lalu lanjutkan percakapan dengan konteks
                  yang cukup untuk ditinjau bersama.
                </p>
              </div>
              <div className="border-l border-brand-300 pl-5 sm:pl-6">
                <p className="text-xs font-medium text-brand-800">
                  Mulai dari
                </p>
                <div className="mt-4 grid gap-2">
                  <Link
                    className="inline-flex items-center justify-between gap-3 rounded-lg border border-brand-300 bg-background px-3 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    href="/project-brief"
                  >
                    Diskusikan Proyek
                    <PathArrow />
                  </Link>
                  <Link
                    className="inline-flex items-center justify-between gap-3 rounded-lg border border-brand-300 bg-background px-3 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    href={`/services${previewSuffix}`}
                  >
                    Lihat layanan
                    <PathArrow />
                  </Link>
                  <Link
                    className="inline-flex items-center justify-between gap-3 rounded-lg border border-brand-300 bg-background px-3 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    href={`/projects${previewSuffix}`}
                  >
                    Lihat projects
                    <PathArrow />
                  </Link>
                </div>
                <address className="mt-6 border-t border-brand-300 pt-5 text-sm not-italic leading-6 text-brand-900">
                  <p>{content.company.contact.location}</p>
                  <div className="mt-3 flex flex-col gap-1">
                    <a className="underline underline-offset-4" href={`mailto:${content.company.contact.email}`}>
                      {content.company.contact.email}
                    </a>
                    <a className="underline underline-offset-4" href={content.company.contact.phoneHref}>
                      {content.company.contact.phone}
                    </a>
                  </div>
                </address>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
