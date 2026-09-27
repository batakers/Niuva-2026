import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import { publicServices } from "@/features/public/company-content";
import { listPublishedPortfolioProjects } from "@/modules/portfolio/public-service";

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

  await connection();
  let relatedProjects: Awaited<ReturnType<typeof listPublishedPortfolioProjects>> = [];
  try {
    relatedProjects = (await listPublishedPortfolioProjects()).filter((project) =>
      project.serviceLabel === service.title && project.detailReadiness !== "card-only",
    );
  } catch {
    // Service information remains available when the published portfolio cannot be read.
  }

  return (
    <PublicShell scope="services">
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16">
            <NiuvaLink className="min-h-11" href="/services" size="sm" variant="outline">← Semua layanan</NiuvaLink>
            <p className="mt-10 text-sm font-medium text-brand-700">Layanan Niuva</p>
            <h1 className={`${type.display.className} mt-4 max-w-4xl`}>{service.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{service.websiteFraming}</p>
            <div className="mt-8 flex flex-wrap gap-2" aria-label="Fokus layanan">
              {service.tags.map((tag) => <span className="rounded-md border border-border px-3 py-1.5 text-xs" key={tag}>{tag}</span>)}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background" aria-labelledby="service-context-title">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <p className="text-sm font-medium text-brand-700">Ruang lingkup</p>
              <h2 className={`${type.heading.className} mt-3`} id="service-context-title">Mulai dari konteks yang sudah ada.</h2>
            </div>
            <div className="space-y-8">
              <p className="text-lg leading-8">{service.sourceScope}</p>
              <dl className="divide-y divide-border border-y border-border">
                <div className="py-5"><dt className="font-semibold">Yang bisa Anda bawa</dt><dd className="mt-2 leading-7 text-muted-foreground">{service.inputs}</dd></div>
                <div className="py-5"><dt className="font-semibold">Arah pembahasan awal</dt><dd className="mt-2 leading-7 text-muted-foreground">{service.outputs}</dd></div>
              </dl>
              <p className="text-sm leading-6 text-muted-foreground">Project Brief membantu tim Niuva meninjau kebutuhan sebelum ruang lingkup dan langkah kerja disepakati.</p>
              <NiuvaLink className="min-h-11" href={`/project-brief?service=${encodeURIComponent(service.slug)}`}>Diskusikan layanan ini</NiuvaLink>
            </div>
          </div>
        </section>

        <section className="bg-card" aria-labelledby="related-projects-title">
          <div className="mx-auto max-w-public px-5 py-16 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><p className="text-sm font-medium text-brand-700">Bukti yang dapat ditinjau</p><h2 className={`${type.heading.className} mt-3`} id="related-projects-title">Projects terkait</h2></div>
              <NiuvaLink className="min-h-11" href="/projects" variant="outline">Semua projects</NiuvaLink>
            </div>
            {relatedProjects.length === 0 ? (
              <p className="mt-8 max-w-2xl text-sm leading-6 text-muted-foreground">Detail project terkait belum tersedia untuk ditampilkan. Anda tetap dapat menjelaskan kebutuhan melalui Project Brief.</p>
            ) : (
              <ul className="mt-8 divide-y divide-border border-y border-border">
                {relatedProjects.map((project) => <li className="grid gap-3 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={project.id}>
                  <div><p className="font-semibold">{project.title}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{project.summary}</p></div>
                  <NiuvaLink className="min-h-11" href={`/projects/${project.slug}`} size="sm" variant="outline">Lihat project</NiuvaLink>
                </li>)}
              </ul>
            )}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
