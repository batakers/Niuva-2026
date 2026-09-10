import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";
import { isPreviewParameter } from "@/features/frontend-preview/scenarios";
import { getProjectPreviewBySlug } from "@/features/frontend-preview/server";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const { project } = await getProjectPreviewBySlug(slug, preview);
  const isPreview = isPreviewParameter(preview);

  if (project === null || project.detailReadiness === "card-only") {
    return {
      title: "Project tidak ditemukan · Niuva",
      robots: { follow: false, index: false },
    };
  }

  return {
    title: `${project.title} · Projects · Niuva`,
    description: project.summary,
    robots: isPreview ? { follow: false, index: false } : { follow: true, index: true },
  };
}

type StorySection = Readonly<{ title: string; body: string }>;

export default async function ProjectDetail({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const { project, scenario } = await getProjectPreviewBySlug(slug, preview);
  if (!project || project.detailReadiness === "card-only") notFound();

  const isPreview = scenario !== null;
  const isEvidenceBounded = Boolean(project.evidenceBoundary);
  const previewSuffix = scenario ? `?preview=${scenario}` : "";
  const cover = project.media[0];
  const storySections: StorySection[] = [
    ...(project.challenge ? [{ title: "Konteks dan tantangan", body: project.challenge }] : []),
    ...(project.process ? [{ title: "Proses dan keputusan", body: project.process }] : []),
    ...(project.result ? [{ title: isEvidenceBounded ? "Output yang terdokumentasi" : "Hasil untuk ditinjau", body: project.result }] : []),
    ...(project.evidenceBoundary ? [{ title: "Batas bukti", body: project.evidenceBoundary }] : []),
  ];

  return (
    <PublicShell scope="project-detail">
      <main className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16" id="main-content">
        <AuLink className="min-h-11" href={`/projects${previewSuffix}`} size="sm" variant="outline">
          ← Semua projects{scenario === "examples" ? " contoh" : ""}
        </AuLink>

        {isPreview && (
          <p className="mt-8 rounded-lg border border-info-border bg-info-background p-4 text-sm text-info">
            Preview lokal · skenario sintetis untuk review desain. Bukan proyek atau hasil client Niuva.
          </p>
        )}

        <div className="grid gap-6 py-10 md:grid-cols-2 md:items-end">
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
          </div>
          <p className="text-lg leading-8 text-muted-foreground md:pl-8">{project.summary}</p>
        </div>

        {cover?.url ? (
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              alt={cover.altText}
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1280px) 1152px, 100vw"
              src={cover.url}
              unoptimized={isPreview}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center gap-3 rounded-xl border border-border bg-muted text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-6" />
            <p className="text-sm">Media project belum tersedia</p>
          </div>
        )}

        <div className="mt-12 divide-y divide-border border-y border-border">
          {storySections.map(section => (
            <section className="grid gap-5 py-8 md:grid-cols-2" key={section.title}>
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
            <AuLink className="min-h-11" href="/project-brief">Buat project brief</AuLink>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
