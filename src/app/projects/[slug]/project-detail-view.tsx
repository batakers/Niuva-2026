import Image from "next/image";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { ClosingPanel } from "@/components/niuva/closing-panel";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { publicServices } from "@/features/public/company-content";
import { mascotRenders } from "@/features/public/mascot";
import { ProjectTitle } from "@/features/public/project-title-view";
import type { PreviewScenario, ProjectPreviewItem } from "@/features/frontend-preview/types";

type StorySection = Readonly<{ title: string; body: string }>;

/**
 * Detail markup shared by `/projects/[slug]` (production path) and the internal
 * preview route behind `/projects/[slug]?preview=...`. Callers resolve the
 * project and call `notFound()` before rendering this.
 */
export function ProjectDetailView({ project, scenario }: Readonly<{
  project: ProjectPreviewItem;
  scenario: PreviewScenario | null;
}>) {
  const isPreview = scenario !== null;
  const isEvidenceBounded = Boolean(project.evidenceBoundary);
  const previewSuffix = scenario ? `?preview=${scenario}` : "";
  const cover = project.media.find((media) => media.url);
  const serviceSlug = publicServices.find((service) => service.title === project.serviceLabel)?.slug;
  const storySections: StorySection[] = [
    ...(project.challenge ? [{ title: "Konteks dan tantangan", body: project.challenge }] : []),
    ...(project.process ? [{ title: "Proses dan keputusan", body: project.process }] : []),
    ...(project.result ? [{ title: isEvidenceBounded ? "Output yang terdokumentasi" : "Hasil untuk ditinjau", body: project.result }] : []),
    ...(project.evidenceBoundary ? [{ title: "Batas bukti", body: project.evidenceBoundary }] : []),
  ];

  return (
    <PublicShell scope="project-detail" contactService={publicServices.find(service => service.slug === serviceSlug)?.title}>
      <main id="main-content">
        <div className="mx-auto max-w-public px-5 pt-6 sm:px-12 sm:pt-8">
          <NiuvaLink className="min-h-11" href={`/projects${previewSuffix}`} size="sm" variant="outline">
            <Icon aria-hidden="true" className="size-4" name="arrow-left" />
            Semua proyek{scenario === "examples" ? " contoh" : ""}
          </NiuvaLink>

          {isPreview && (
            <p className="mt-8 rounded-lg border border-info-border bg-info-background p-4 text-sm text-info">
              Preview lokal · skenario sintetis untuk review desain. Bukan proyek atau hasil client Niuva.
            </p>
          )}

          <div className="grid gap-8 py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:items-end">
            <div>
              <h1 className={type.display.className}><ProjectTitle qualifierClassName="mt-3 text-2xl tracking-normal" title={project.title} /></h1>
              <p className="mt-3 text-ui text-muted-foreground">{project.serviceLabel}</p>
              {(project.year || project.tags.length > 0) && (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {project.year && <span className="rounded-full border border-border px-3 py-1 text-caption">{project.year}</span>}
                  {project.tags.map(tag => (
                    <span className="rounded-full border border-border px-3 py-1 text-caption" key={tag}>{tag}</span>
                  ))}
                  </div>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                {serviceSlug ? <NiuvaLink className="min-h-11" href={`/services/${serviceSlug}`} variant="outline">Lihat layanan terkait</NiuvaLink> : null}
                <B2BContactLink service={project.serviceLabel ?? undefined} />
              </div>
            </div>
            <p className="max-w-xl text-lg leading-[1.6] sm:text-xl">{project.summary}</p>
          </div>

          {cover?.url ? (
            <figure>
              {/* Covers are 1600 px files cut from PDFs; capping them at 50rem keeps sharp screens from
                  stretching them past the file until original renders or photos replace them. */}
              <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-6 sm:px-8 sm:py-10">
                <div className="relative mx-auto aspect-video w-full max-w-[50rem]">
                  <Image
                    alt={cover.altText}
                    className="object-contain"
                    fill
                    priority
                    quality={90}
                    sizes="(min-width: 56rem) 50rem, 100vw"
                    src={cover.url}
                    unoptimized={isPreview}
                  />
                </div>
              </div>
              <figcaption className="mt-3 text-sm text-muted-foreground">{isPreview ? "Visualisasi sintetis untuk preview lokal; bukan bukti proyek klien." : "Visual proyek yang disetujui untuk ditampilkan. Cakupan pekerjaan dijelaskan sesuai bukti di bawah."}</figcaption>
            </figure>
          ) : (
            <div className="flex aspect-video items-center justify-center gap-3 rounded-xl border border-border bg-muted text-muted-foreground">
              <Icon aria-hidden="true" className="size-6" name="image-off" />
              <p className="text-sm">Media project belum tersedia</p>
            </div>
          )}

          {storySections.length > 0 ? (
            <div className="mt-12 divide-y divide-border border-y border-border">
              {storySections.map(section => (
                <section className="grid gap-5 py-8 md:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] md:gap-12" key={section.title}>
                  <h2 className={type.heading.className}>{section.title}</h2>
                  <p className="max-w-[62ch] text-base leading-[1.7] sm:text-lg">{section.body}</p>
                </section>
              ))}
            </div>
          ) : null}

          {project.detailReadiness !== "full-conservative-draft" && (
            <p className="mt-6 rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-ui leading-[1.55] text-muted-foreground">
              Challenge dan process rinci sengaja tidak ditampilkan karena bukti pendukungnya belum cukup.
            </p>
          )}

        </div>

        <ClosingPanel id="project-next-title" mascot={mascotRenders.victory} title="Mulai dari konteks proyek Anda.">
          <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-white">Setiap kebutuhan membawa batasan yang berbeda. Ceritakan tujuan dan informasi awal yang sudah tersedia.</p>
          <B2BContactLink className="mt-7" service={project.serviceLabel ?? undefined} variant="onBrand" />
        </ClosingPanel>
      </main>
    </PublicShell>
  );
}
