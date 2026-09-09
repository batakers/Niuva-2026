"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectPreviewItem, ProjectPreviewMode } from "@/features/frontend-preview/types";

type ProjectListProps = {
  projects: readonly ProjectPreviewItem[];
  previewMode?: ProjectPreviewMode | null;
};

function ProjectMedia({ project }: { project: ProjectPreviewItem }) {
  const cover = project.media[0];
  if (cover?.previewUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        <Image
          alt={cover.altText}
          className="object-cover"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          src={cover.previewUrl}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted px-5 text-center text-muted-foreground">
      <ImageOff aria-hidden="true" className="size-7" />
      <span className="text-sm">
        {project.detailReadiness === "card-only"
          ? "Media Selected Works belum dikurasi"
          : "Media contoh belum disertakan"}
      </span>
    </div>
  );
}

export function ProjectList({ projects, previewMode = null }: ProjectListProps) {
  const hydrated = useHydrated();
  const [query, setQuery] = useState("");
  const [service, setService] = useState("");
  const normalizedQuery = query.toLocaleLowerCase("id").trim();
  const filtered = projects.filter(project => {
    const matchesService = !service || project.serviceLabel === service;
    const searchableText = [project.title, project.summary, ...project.tags]
      .join(" ")
      .toLocaleLowerCase("id");
    return matchesService && searchableText.includes(normalizedQuery);
  });
  const featuredProjects = filtered.filter(project => project.detailReadiness !== "card-only");
  const selectedWorks = filtered.filter(project => project.detailReadiness === "card-only");
  const isCurated = previewMode === "curated";
  const previewSuffix = previewMode ? `?preview=${previewMode}` : "";

  return (
    <div>
      <fieldset
        aria-label="Filter projects"
        className="grid gap-5 border-y border-border py-6 sm:grid-cols-2"
        disabled={!hydrated}
      >
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="project-search">
            Cari project
          </label>
          <Input
            className="h-11 bg-background"
            id="project-search"
            onChange={event => setQuery(event.target.value)}
            placeholder="Cari berdasarkan konteks atau judul"
            type="search"
            value={query}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="project-service">
            Layanan
          </label>
          <select
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            id="project-service"
            onChange={event => setService(event.target.value)}
            value={service}
          >
            <option value="">Semua layanan</option>
            {[...new Set(projects.map(project => project.serviceLabel))].map(label => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </div>
      </fieldset>

      <p className="py-5 text-sm text-muted-foreground" role="status">
        {filtered.length} project{previewMode === "examples" ? " contoh" : isCurated ? " terkurasi" : ""}
      </p>

      {filtered.length === 0 ? (
        <StatusNotice
          action={projects.length ? (
            <Button
              onClick={() => {
                setQuery("");
                setService("");
              }}
              variant="outline"
            >
              Hapus filter
            </Button>
          ) : undefined}
          description={projects.length
            ? "Ubah pencarian atau hapus filter untuk melihat pilihan lainnya."
            : "Studi kasus akan ditampilkan setelah materi dan izin publikasinya siap. Anda tetap dapat memulai diskusi melalui project brief."}
          title={projects.length ? "Tidak ada project yang cocok." : "Cerita di balik proyek sedang disiapkan."}
          tone="info"
        />
      ) : (
        <div className="space-y-16">
          {featuredProjects.length > 0 && (
            <section aria-labelledby="featured-projects-title">
              {isCurated ? (
                <div className="mb-8 max-w-2xl">
                  <p className="text-sm font-medium text-brand-700">Featured case studies</p>
                  <h2 className={`${type.heading.className} mt-3`} id="featured-projects-title">
                    Enam cerita utama untuk ditinjau.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Urutan ini bersifat editorial, bukan kronologis. Detail hanya ditampilkan sejauh bukti yang tersedia.
                  </p>
                </div>
              ) : (
                <h2 className="sr-only" id="featured-projects-title">Daftar project</h2>
              )}
              <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
                {featuredProjects.map(project => (
                  <article className="min-w-0" key={project.id}>
                    <Link
                      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      href={`/projects/${project.slug}${previewSuffix}`}
                    >
                      <ProjectMedia project={project} />
                      <p className="mt-5 text-sm text-brand-700">{project.serviceLabel}</p>
                      <h3 className={`${type.subheading.className} mt-2 flex items-start justify-between gap-4`}>
                        {project.title}
                        <ArrowUpRight aria-hidden="true" className="mt-1 size-5 shrink-0" />
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.summary}</p>
                      <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                        Lihat cerita project
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {selectedWorks.length > 0 && (
            <section aria-labelledby="selected-works-title" className="border-t border-border pt-12">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-brand-700">Selected Works</p>
                <h2 className={`${type.heading.className} mt-3`} id="selected-works-title">
                  Dokumentasi lain yang menunjukkan keluasan karya.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Entri ini masih berupa ringkasan kartu. Detail proyek dan media akan ditambahkan hanya setelah bukti pendukungnya siap.
                </p>
              </div>
              <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                {selectedWorks.map(project => (
                  <article className="border-t border-border pt-5" key={project.id}>
                    <p className="text-xs font-medium text-brand-700">{project.serviceLabel}</p>
                    <h3 className="mt-3 font-display text-xl font-semibold leading-tight">{project.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.summary}</p>
                    <ul aria-label={`Tag ${project.title}`} className="mt-4 flex flex-wrap gap-2">
                      {project.tags.map(tag => (
                        <li className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground" key={tag}>
                          {tag}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
