import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import { publicServices } from "@/features/public/company-content";
import { listPublishedPortfolioProjects } from "@/modules/portfolio/public-service";

export const revalidate = 300;

type ServicePageProps = Readonly<{ params: Promise<{ slug: string }> }>;

function findService(slug: string) {
  return publicServices.find((service) => service.slug === slug);
}

export function generateStaticParams() {
  return publicServices.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const service = findService((await params).slug);
  if (!service) return { title: "Layanan tidak ditemukan · Niuva", robots: { index: false, follow: false } };
  return {
    title: `${service.title} · Layanan Niuva`,
    description: service.sourceScope,
    robots: { index: true, follow: true },
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const service = findService((await params).slug);
  if (!service) notFound();

  let relatedProjects: Awaited<ReturnType<typeof listPublishedPortfolioProjects>> = [];
  try {
    relatedProjects = (await listPublishedPortfolioProjects()).filter((project) =>
      project.serviceLabel === service.title && project.detailReadiness !== "card-only",
    );
  } catch {
    // Service information remains available when the published portfolio cannot be read.
  }

  return (
    <PublicShell scope="services" headerAction={{ href: `/project-brief?service=${encodeURIComponent(service.slug)}`, label: "Buat Project Brief" }}>
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
            <NiuvaLink className="min-h-11" href="/services" size="sm" variant="outline">← Semua layanan</NiuvaLink>
            <p className="mt-7 text-sm font-medium text-brand-700">Layanan Niuva</p>
            <h1 className={`${type.display.className} mt-4 max-w-4xl`}>{service.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{service.websiteFraming}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <NiuvaLink className="min-h-11" href={`/project-brief?service=${encodeURIComponent(service.slug)}`}>Buat Project Brief</NiuvaLink>
              <NiuvaLink className="min-h-11" href="#related-projects-title" variant="outline">Lihat proyek terkait</NiuvaLink>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background" aria-labelledby="service-fit-title">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
            <div>
              <p className="text-sm font-medium text-brand-700">Kecocokan dan input</p>
              <h2 className={`${type.heading.className} mt-3`} id="service-fit-title">Mulai dari kondisi proyek Anda.</h2>
            </div>
            <div className="space-y-8">
              <p className="text-lg leading-8">{service.sourceScope}</p>
              <dl className="divide-y divide-border border-y border-border">
                <div className="py-5"><dt className="font-semibold">Yang bisa Anda bawa</dt><dd className="mt-2 leading-7 text-muted-foreground">{service.inputs}</dd></div>
                <div className="py-5"><dt className="font-semibold">Arah output untuk dibahas</dt><dd className="mt-2 leading-7 text-muted-foreground">{service.outputs}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-card" aria-labelledby="service-review-title">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
            <div><p className="text-sm font-medium text-brand-700">Proses peninjauan</p><h2 className={`${type.heading.className} mt-3`} id="service-review-title">Langkah awal dibuat jelas sebelum ruang lingkup disepakati.</h2></div>
            <ol className="divide-y divide-border border-y border-border">
              <li className="grid gap-2 py-5 sm:grid-cols-[9rem_minmax(0,1fr)]"><h3 className="font-semibold">Bagikan konteks</h3><p className="text-sm leading-6 text-muted-foreground">Ceritakan tujuan, tahap saat ini, dan bahan awal melalui Project Brief.</p></li>
              <li className="grid gap-2 py-5 sm:grid-cols-[9rem_minmax(0,1fr)]"><h3 className="font-semibold">Tinjau kebutuhan</h3><p className="text-sm leading-6 text-muted-foreground">Tim Niuva meninjau informasi tersebut untuk memahami keputusan dan batasan yang perlu dibahas bersama.</p></li>
              <li className="grid gap-2 py-5 sm:grid-cols-[9rem_minmax(0,1fr)]"><h3 className="font-semibold">Tentukan lanjutan</h3><p className="text-sm leading-6 text-muted-foreground">Arah kerja dan output dibahas sesuai ruang lingkup yang kemudian disepakati; brief belum menjadi janji hasil atau jadwal.</p></li>
            </ol>
          </div>
        </section>

        <section className="bg-background" aria-labelledby="related-projects-title">
          <div className="mx-auto max-w-public px-5 py-16 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><p className="text-sm font-medium text-brand-700">Bukti yang dapat ditinjau</p><h2 className={`${type.heading.className} mt-3`} id="related-projects-title">Projects terkait</h2></div>
              <NiuvaLink className="min-h-11" href="/projects" variant="outline">Semua projects</NiuvaLink>
            </div>
            {relatedProjects.length === 0 ? (
              <p className="mt-8 max-w-2xl text-sm leading-6 text-muted-foreground">Detail project terkait belum tersedia untuk ditampilkan. Anda tetap dapat menjelaskan kebutuhan melalui Project Brief.</p>
            ) : (
              <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {relatedProjects.slice(0, 3).map((project) => {
                  const cover = project.media.find((media) => media.url);
                  return <li className="min-w-0 border-t border-border pt-5" key={project.id}>
                    {cover?.url ? <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card"><Image alt={cover.altText} className="object-contain" fill sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw" src={cover.url} /></div> : null}
                    <h3 className={`${type.subheading.className} mt-4`}>{project.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.summary}</p>
                    <NiuvaLink className="mt-4 min-h-11" href={`/projects/${project.slug}`} size="sm" variant="outline">Lihat project</NiuvaLink>
                  </li>;
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-public flex-col gap-5 px-5 py-14 sm:px-8 md:flex-row md:items-end md:justify-between">
            <div><h2 className={type.heading.className}>Siap membahas konteks proyek Anda?</h2><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Mulai dari informasi yang sudah tersedia. Pilihan layanan ini akan terbawa ke Project Brief dan tetap dapat Anda ubah.</p></div>
            <NiuvaLink className="min-h-11 shrink-0" href={`/project-brief?service=${encodeURIComponent(service.slug)}`}>Diskusikan layanan ini</NiuvaLink>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
