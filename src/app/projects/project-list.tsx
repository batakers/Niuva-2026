"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import type { PublicProject } from "@/features/frontend-preview/types";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";

export function ProjectList({ projects, preview = false }: { projects: readonly PublicProject[]; preview?: boolean }) {
  const hydrated = useHydrated();
  const [query, setQuery] = useState("");
  const [service, setService] = useState("");
  const filtered = projects.filter(project => (!service || project.serviceLabel === service)
    && (project.title + " " + project.summary).toLocaleLowerCase("id").includes(query.toLocaleLowerCase("id").trim()));
  return (
    <div>
      <fieldset disabled={!hydrated} aria-label="Filter projects" className="grid gap-5 border-y border-border py-6 sm:grid-cols-2">
        <div><label htmlFor="project-search" className="mb-2 block text-sm font-medium">Cari project</label><Input id="project-search" type="search" className="h-11 bg-background" placeholder="Cari berdasarkan konteks atau judul" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div><label htmlFor="project-service" className="mb-2 block text-sm font-medium">Layanan</label><select id="project-service" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" value={service} onChange={event => setService(event.target.value)}>
          <option value="">Semua layanan</option>{[...new Set(projects.map(project => project.serviceLabel))].map(label => <option key={label}>{label}</option>)}
        </select></div>
      </fieldset>
      <p className="py-5 text-sm text-muted-foreground" role="status">{filtered.length} project{preview ? " contoh" : ""}</p>
      {filtered.length === 0 ? <StatusNotice tone="info" title={projects.length ? "Tidak ada project yang cocok." : "Cerita di balik proyek sedang disiapkan."}
        description={projects.length ? "Ubah pencarian atau hapus filter untuk melihat pilihan lainnya." : "Studi kasus akan ditampilkan setelah materi dan izin publikasinya siap. Anda tetap dapat memulai diskusi melalui project brief."}
        action={projects.length ? <Button variant="outline" onClick={() => { setQuery(""); setService(""); }}>Hapus filter</Button> : undefined} /> :
        <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
          {filtered.map(project => (
            <article key={project.id} className="min-w-0">
              <Link href={`/projects/${project.slug}${preview ? "?preview=examples" : ""}`} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted text-muted-foreground">
                  <ImageOff aria-hidden="true" className="size-7" /><span className="text-sm">Media contoh belum disertakan</span>
                </div>
                <p className="mt-5 text-sm text-brand-700">{project.serviceLabel}</p>
                <h2 className={`${type.subheading.className} mt-2 flex items-start justify-between gap-4`}>{project.title}<ArrowUpRight aria-hidden="true" className="mt-1 size-5 shrink-0" /></h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.summary}</p>
                <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Lihat cerita project</span>
              </Link>
            </article>
          ))}
        </div>}
    </div>
  );
}
