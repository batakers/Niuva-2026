import Image from "next/image";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { publicServices } from "@/features/public/company-content";
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
  const briefHref = serviceSlug ? `/project-brief?service=${encodeURIComponent(serviceSlug)}` : "/project-brief";
  const storySections: StorySection[] = [
    ...(project.challenge ? [{ title: "Konteks dan tantangan", body: project.challenge }] : []),
    ...(project.process ? [{ title: "Proses dan keputusan", body: project.process }] : []),
    ...(project.result ? [{ title: isEvidenceBounded ? "Output yang terdokumentasi" : "Hasil untuk ditinjau", body: project.result }] : []),
    ...(project.evidenceBoundary ? [{ title: "Batas bukti", body: project.evidenceBoundary }] : []),
  ];

  return (
    <PublicShell scope="project-detail" headerAction={{ href: briefHref, label: "Diskusikan Proyek" }}>
      <main className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14" id="main-content">
        <NiuvaLink className="min-h-11" href={`/projects${previewSuffix}`} size="sm" variant="outline">
          ← Semua projects{scenario === "examples" ? " contoh" : ""}
        </NiuvaLink>

        {isPreview && (
          <p className="mt-8 rounded-lg border border-info-border bg-info-background p-4 text-sm text-info">
            Preview lokal · skenario sintetis untuk review desain. Bukan proyek atau hasil client Niuva.
          </p>
        )}

        <div className="grid gap-8 py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:items-end">
          <div>
            <p className="text-sm text-brand-700">{project.serviceLabel}</p>
            <h1 className={`${type.display.className} mt-4`}>{project.title}</h1>
            {(project.year || project.tags.length > 0) && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {project.year && <span className="rounded-md border border-border px-2 py-1">{project.year}</span>}
                {project.tags.map(tag => (
                  <span className="rounded-md border border-border px-2 py-1" key={tag}>{tag}</span>
                ))}
                </div>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              {serviceSlug ? <NiuvaLink className="min-h-11" href={`/services/${serviceSlug}`} variant="outline">Lihat layanan terkait</NiuvaLink> : null}
              <NiuvaLink className="min-h-11" href={briefHref}>Diskusikan kebutuhan Anda</NiuvaLink>
            </div>
          </div>
          <p className="max-w-xl border-l-2 border-brand-300 pl-5 text-lg leading-8 text-muted-foreground">{project.summary}</p>
        </div>

        {cover?.url ? (
          <figure>
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-card">
              <Image
                alt={cover.altText}
                className="object-contain"
                fill
                priority
                sizes="(min-width: 1280px) 1152px, 100vw"
                src={cover.url}
                unoptimized={isPreview}
              />
            </div>
            <figcaption className="mt-3 text-sm text-muted-foreground">{isPreview ? "Visualisasi sintetis untuk preview lokal; bukan bukti proyek klien." : "Visual proyek yang disetujui untuk ditampilkan. Cakupan pekerjaan dijelaskan sesuai bukti di bawah."}</figcaption>
          </figure>
        ) : (
          <div className="flex aspect-video items-center justify-center gap-3 rounded-xl border border-border bg-muted text-muted-foreground">
            <Icon aria-hidden="true" className="size-6" name="image-off" />
            <p className="text-sm">Media project belum tersedia</p>
          </div>
        )}

        <div className="mt-12 divide-y divide-border border-y border-border">
          {storySections.map(section => (
            <section className="grid gap-5 py-8 md:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] md:gap-12" key={section.title}>
              <h2 className={type.heading.className}>{section.title}</h2>
              <p className="max-w-xl text-base leading-8 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>

        {project.detailReadiness === "summary-only" && (
          <p className="mt-6 border-l-2 border-brand-300 pl-4 text-sm leading-6 text-muted-foreground">
            Challenge dan process rinci sengaja tidak ditampilkan karena bukti pendukungnya belum cukup.
          </p>
        )}

        <section className="grid gap-6 py-12 md:grid-cols-2">
          <h2 className={type.heading.className}>Mulai dari konteks proyek Anda.</h2>
          <div>
            <p className="mb-6 text-base leading-7 text-muted-foreground">
              Setiap kebutuhan membawa batasan yang berbeda. Ceritakan tujuan dan informasi awal yang sudah tersedia.
            </p>
            <NiuvaLink className="min-h-11" href={briefHref}>Buat project brief</NiuvaLink>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
