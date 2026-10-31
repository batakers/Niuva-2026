import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicShell } from "@/components/niuva/public-shell";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { ClosingPanel } from "@/components/niuva/closing-panel";
import { Icon } from "@/components/ui/Icon";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import { legacyServiceSlugs, publicServices } from "@/features/public/company-content";
import { mascotRenders } from "@/features/public/mascot";
import { ProjectTitle } from "@/features/public/project-title-view";
import { listPublishedPortfolioProjects } from "@/modules/portfolio/public-service";

export const revalidate = 300;

type ServicePageProps = Readonly<{ params: Promise<{ slug: string }> }>;
type ServiceSlug = (typeof publicServices)[number]["slug"];

// Each service gets the mascot pose that matches its work; the pose illustrates, it claims nothing.
const serviceMascot: Readonly<Record<ServiceSlug, { src: string; alt: string }>> = {
  "riset-pengembangan": { src: mascotRenders.idea, alt: "Maskot Niuva tersenyum menunjuk ke atas, ke bohlam menyala dan tanda tanya" },
  "desain-rekayasa": { src: mascotRenders.design, alt: "Maskot Niuva memegang laptop" },
  "prototipe-manufaktur-digital": { src: mascotRenders.build, alt: "Maskot Niuva memegang kunci inggris" },
  "konsultansi-workshop": { src: mascotRenders.collaborate, alt: "Maskot Niuva menunjuk ke depan" },
};

const firstSteps = [
  { title: "Bagikan konteks", body: "Ceritakan tujuan, tahap saat ini, dan bahan awal melalui WhatsApp." },
  { title: "Tinjau kebutuhan", body: "Tim Niuva meninjau informasi tersebut untuk memahami keputusan dan batasan yang perlu dibahas bersama." },
  { title: "Tentukan lanjutan", body: "Arah kerja dan output dibahas sesuai ruang lingkup yang kemudian disepakati; brief belum menjadi janji hasil atau jadwal." },
] as const;

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
  const { slug } = await params;
  // Links shared before the Owner's 31 Oct 2026 service change keep working.
  const successor = legacyServiceSlugs[slug];
  if (successor) permanentRedirect(`/services/${successor}`);
  const service = findService(slug);
  if (!service) notFound();
  const mascot = serviceMascot[service.slug];

  let relatedProjects: Awaited<ReturnType<typeof listPublishedPortfolioProjects>> = [];
  try {
    relatedProjects = (await listPublishedPortfolioProjects()).filter((project) =>
      project.serviceLabel === service.title && project.detailReadiness !== "card-only",
    );
  } catch {
    // Service information remains available when the published portfolio cannot be read.
  }

  return (
    <PublicShell scope="services" contactService={service.title}>
      <main id="main-content">
        <div className="mx-auto max-w-public px-5 pt-6 sm:px-12 sm:pt-8">
          <NiuvaLink className="min-h-11" href="/services" size="sm" variant="outline"><Icon aria-hidden="true" className="size-4" name="arrow-left" />Semua layanan</NiuvaLink>
        </div>

        <section
          aria-labelledby="service-title"
          className="relative mx-3 mt-6 overflow-hidden rounded-[var(--radius-media)] bg-[radial-gradient(130%_70%_at_50%_100%,var(--brand-400)_0%,var(--brand-600)_32%,var(--brand-700)_62%,var(--brand-800)_100%)] text-white sm:mx-6 lg:h-120 lg:bg-[radial-gradient(52%_105%_at_83%_38%,var(--brand-400)_0%,var(--brand-600)_30%,var(--brand-700)_58%,var(--brand-800)_100%)]"
        >
          <div className="relative z-10 px-6 pt-10 sm:px-(--panel-inset) lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[calc(var(--panel-inset)+38rem)] lg:flex-col lg:justify-center lg:pr-0 lg:pt-0">
            <h1 className={`${type.display.className} text-balance`} id="service-title">{service.title}</h1>
            <p className="mt-5 max-w-[44ch] text-base leading-[1.6] text-white sm:text-lg">{service.websiteFraming}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <B2BContactLink service={service.title} variant="onBrand" />
              <a className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4 hover:decoration-2" href="#related-projects-title">Lihat proyek terkait</a>
            </div>
          </div>
          <div className="relative h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[calc(var(--panel-inset)+38rem)] lg:h-auto">
            <Image alt={mascot.alt} className="absolute -bottom-7.5 left-1/2 h-[108%] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-xl lg:-bottom-10 lg:h-[112%]" height={1400} preload sizes="(max-width: 1024px) 90vw, 560px" src={mascot.src} width={1400} />
            <div className="absolute top-14 right-(--panel-inset) z-20 hidden w-66 rounded-[var(--radius-control)] bg-card p-4 text-foreground shadow-floating xl:block">
              <p className="text-base font-semibold">Dibahas lewat WhatsApp</p>
              <p className="mt-1 text-caption leading-[1.45] text-muted-foreground">Tanpa formulir atau akun. Ceritakan kebutuhan langsung kepada tim Niuva.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="service-fit-title" className="mx-auto grid max-w-public gap-10 px-5 pt-24 sm:px-12 sm:pt-32 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2 className={type.heading.className} id="service-fit-title">Mulai dari kondisi proyek Anda.</h2>
            <p className="mt-4 max-w-[48ch] text-lead leading-[1.6] text-muted-foreground">{service.sourceScope}</p>
          </div>
          {/* What the client brings turns into what gets discussed: two surfaces read in that order. */}
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
            <dl className="rounded-[var(--radius-card)] border border-border bg-card p-6 sm:p-7">
              <dt className="text-ui font-semibold text-muted-foreground">Yang bisa Anda bawa</dt>
              <dd className="mt-3 text-lg leading-[1.5] sm:text-xl">{service.inputs}</dd>
            </dl>
            <Icon aria-hidden="true" className="mx-auto size-6 self-center text-brand-700 max-md:rotate-90" name="arrow-right" />
            <dl className="rounded-[var(--radius-card)] bg-brand-100 p-6 sm:p-7">
              <dt className="text-ui font-semibold text-muted-foreground">Arah output untuk dibahas</dt>
              <dd className="mt-3 text-lg leading-[1.5] sm:text-xl">{service.outputs}</dd>
            </dl>
          </div>
        </section>

        <section aria-labelledby="service-review-title" className="mx-auto max-w-public px-5 pt-24 sm:px-12 sm:pt-32">
          <h2 className={type.heading.className} id="service-review-title">Langkah awal dibuat jelas sebelum ruang lingkup disepakati.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {firstSteps.map((step) => (
              <li className="border-t border-border pt-5" key={step.title}>
                <h3 className="text-xl font-medium tracking-[-0.01em]">{step.title}</h3>
                <p className="mt-2 max-w-[40ch] text-base leading-[1.6] text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="related-projects-title" className="mx-auto max-w-public scroll-mt-24 px-5 pt-24 sm:px-12 sm:pt-32">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2 className={type.heading.className} id="related-projects-title">Proyek terkait</h2>
            <NiuvaLink className="min-h-11" href="/projects" variant="outline">Semua proyek</NiuvaLink>
          </div>
          {relatedProjects.length === 0 ? (
            <p className="mt-8 max-w-2xl text-base leading-[1.6] text-muted-foreground">Detail proyek terkait belum tersedia untuk ditampilkan. Anda dapat melihat semua proyek atau membahas kebutuhan dengan tim melalui WhatsApp.</p>
          ) : (
            <ul className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.slice(0, 3).map((project) => {
                const cover = project.media.find((media) => media.url);
                return (
                  <li className="min-w-0" key={project.id}>
                    <Link className="group block rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/projects/${project.slug}`}>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
                        {cover?.url ? <Image alt={cover.altText} className="object-contain transition-transform duration-500 ease-[var(--ease-emphasis-token)] group-hover:scale-[1.02]" fill quality={90} sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw" src={cover.url} /> : null}
                      </div>
                      <h3 className="mt-5 text-xl font-medium tracking-[-0.01em] transition-colors duration-150 group-hover:text-brand-800"><ProjectTitle qualifierClassName="mt-1 text-ui font-normal tracking-normal" title={project.title} /></h3>
                      <p className="mt-2 line-clamp-3 text-base leading-[1.55] text-muted-foreground">{project.summary}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ClosingPanel id="service-next-title" mascot={mascotRenders.victory} title="Ceritakan kebutuhan proyek Anda.">
          <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-white">Tim Niuva membahas kebutuhan, penawaran, dan kesepakatan proyek bersama Anda melalui WhatsApp.</p>
          <B2BContactLink className="mt-7" service={service.title} variant="onBrand" />
        </ClosingPanel>
      </main>
    </PublicShell>
  );
}
