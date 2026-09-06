import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";
import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { getProjectPreview } from "@/features/frontend-preview/server";

export const metadata: Metadata = { title: "Detail project · Niuva", robots: { index: false, follow: false } };

export default async function ProjectDetail({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { projects } = await getProjectPreview((await searchParams).preview);
  const project = projects.find(item => item.slug === slug);
  if (!project) notFound();
  return (
    <PublicShell scope="project-detail">
      <main id="main-content" className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16">
        <AuLink className="min-h-11" href="/projects?preview=examples" variant="outline" size="sm">← Semua projects contoh</AuLink>
        <p className="mt-8 rounded-lg border border-info-border bg-info-background p-4 text-sm text-info">Preview lokal · skenario sintetis untuk review desain. Bukan proyek atau hasil client Niuva.</p>
        <div className="grid gap-6 py-10 md:grid-cols-2 md:items-end">
          <div><p className="text-sm text-brand-700">{project.serviceLabel}</p><h1 className={`${type.display.className} mt-4`}>{project.title}</h1></div>
          <p className="text-lg leading-8 text-muted-foreground md:pl-8">{project.summary}</p>
        </div>
        <div className="flex aspect-video items-center justify-center gap-3 rounded-xl border border-border bg-muted text-muted-foreground"><ImageOff aria-hidden="true" className="size-6" /><p className="text-sm">Media contoh belum disertakan</p></div>
        <div className="mt-12 divide-y divide-border border-y border-border">
          {[["Konteks dan tantangan",project.challenge],["Proses dan keputusan",project.process],["Hasil untuk ditinjau",project.result]].map(([title,body]) => <section key={title} className="grid gap-5 py-8 md:grid-cols-2"><h2 className={type.heading.className}>{title}</h2><p className="max-w-xl text-base leading-8 text-muted-foreground">{body}</p></section>)}
        </div>
        <section className="grid gap-6 py-12 md:grid-cols-2"><h2 className={type.heading.className}>Mulai dari konteks proyek Anda.</h2><div><p className="mb-6 text-base leading-7 text-muted-foreground">Setiap kebutuhan membawa batasan yang berbeda. Ceritakan tujuan dan informasi awal yang sudah tersedia.</p><AuLink className="min-h-11" href="/project-brief">Buat project brief</AuLink></div></section>
      </main>
    </PublicShell>
  );
}
