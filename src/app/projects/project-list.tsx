"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { typographySystemTokens as type } from "@/design/typography";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import type { ProjectPreviewItem, ProjectPreviewMode } from "@/features/frontend-preview/types";
import { ProjectTitle } from "@/features/public/project-title-view";

type ProjectListProps = {
  projects: readonly ProjectPreviewItem[];
  previewMode?: ProjectPreviewMode | null;
};

function ProjectMedia({
  isPreview,
  project,
}: {
  isPreview: boolean;
  project: ProjectPreviewItem;
}) {
  const cover = project.media[0];
  if (cover?.url) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card lg:aspect-auto lg:h-80">
        <Image
          alt={cover.altText}
          className="object-contain transition-transform duration-500 ease-[var(--ease-emphasis-token)] group-hover:scale-[1.02]"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          src={cover.url}
          unoptimized={isPreview}
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted px-5 text-center text-muted-foreground lg:aspect-auto lg:h-80">
      <Icon aria-hidden="true" className="size-7" name="image-off" />
      <span className="text-sm">
        {project.detailReadiness === "card-only"
          ? "Media karya ini belum dikurasi"
          : "Media project belum tersedia"}
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
  const isPreview = previewMode !== null;
  const previewSuffix = previewMode ? `?preview=${previewMode}` : "";

  return (
    <div>
      <fieldset
        aria-label="Filter projects"
        className="grid gap-5 border-y border-border py-6 sm:grid-cols-2"
        disabled={!hydrated}
      >
        <div>
          <label className="mb-4 block text-sm font-medium" htmlFor="project-search">
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
          <label className="mb-4 block text-sm font-medium" htmlFor="project-service">
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

      <p className="py-5 text-right text-sm text-muted-foreground" role="status">
        {filtered.length} project{previewMode === "examples" ? " contoh" : ""}
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
            : "Studi kasus akan ditampilkan setelah materi dan izin publikasinya siap. Anda dapat membahas kebutuhan dengan tim melalui WhatsApp."}
          title={projects.length ? "Tidak ada project yang cocok." : "Cerita di balik proyek sedang disiapkan."}
          tone="info"
        />
      ) : (
        <div className="space-y-16">
          {featuredProjects.length > 0 && (
            <section aria-labelledby="featured-projects-title">
              <div className="mb-8 max-w-2xl">
                <h2 className={type.heading.className} id="featured-projects-title">
                  Cerita proyek utama.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Urutan ini bersifat editorial, bukan kronologis. Detail hanya ditampilkan sejauh bukti yang tersedia.
                </p>
              </div>
              <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-flow-dense lg:grid-cols-12">
                {featuredProjects.map((project, index) => (
                  <article className={`min-w-0 ${index % 4 === 0 || index % 4 === 3 ? "lg:col-span-7" : "lg:col-span-5"}`} key={project.id}>
                    <Link
                      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      href={`/projects/${project.slug}${previewSuffix}`}
                    >
                      <ProjectMedia isPreview={isPreview} project={project} />
                      <h3 className={`${index === 0 ? type.heading.className : type.subheading.className} mt-5 transition-colors duration-150 group-hover:text-brand-800`}>
                        <ProjectTitle title={project.title} qualifierClassName="mt-1 text-lead font-normal tracking-normal" />
                      </h3>
                      <p className="mt-1.5 text-ui text-muted-foreground">{project.serviceLabel}</p>
                      <p className="mt-3 max-w-[60ch] text-base leading-[1.6] text-muted-foreground">{project.summary}</p>
                      <span className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold underline-offset-4 group-hover:underline">
                        Lihat cerita proyek
                        <Icon aria-hidden="true" className="size-5 text-brand-700 transition-transform duration-200 group-hover:translate-x-1" name="arrow-right" />
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
                <h2 className={type.heading.className} id="selected-works-title">
                  Karya lainnya.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Entri ini masih berupa ringkasan kartu. Detail proyek dan media akan ditambahkan hanya setelah bukti pendukungnya siap.
                </p>
              </div>
              <ul className="mt-8 overflow-hidden rounded-[var(--radius-media)] border border-border bg-card">
                {selectedWorks.map(project => (
                  <li className="border-t border-border first:border-t-0" key={project.id}>
                    <article className="grid gap-x-8 gap-y-1.5 px-5 py-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_12rem]">
                      <h3 className="text-lg font-medium tracking-[-0.01em]"><ProjectTitle title={project.title} qualifierClassName="mt-0.5 text-ui font-normal" /></h3>
                      <p className="text-base leading-[1.55] text-muted-foreground">{project.summary}</p>
                      <p className="text-sm text-muted-foreground md:text-right">{project.serviceLabel}</p>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
