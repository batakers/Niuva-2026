import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";
import { StatusNotice } from "@/components/niuva/status-notice";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { getProjectPreview } from "@/features/frontend-preview/server";
import { ProjectList } from "./project-list";

export const metadata: Metadata = { title: "Projects · Niuva", description: "Konteks, proses, dan keputusan di balik pengembangan produk." };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { scenario, projects } = await getProjectPreview((await searchParams).preview);
  return (
    <PublicShell scope="projects">
      <main id="main-content" className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16">
        <section className="grid gap-6 pb-12 md:grid-cols-2 md:items-end">
          <div><p className="text-sm font-medium text-brand-700">Projects / Case studies</p><h1 className={`${type.display.className} mt-4`}>Bentuk akhirnya punya cerita.</h1></div>
          <p className="max-w-lg text-lg leading-8 text-muted-foreground md:pl-8">Dari konteks awal, pilihan yang dipertimbangkan, hingga hasil yang bisa ditinjau. Kenali cara kami mendekati sebuah proyek.</p>
        </section>
        {process.env.NODE_ENV === "development" && <aside aria-label="Preview frontend" className="mb-8 rounded-lg border border-info-border bg-info-background p-4 text-info">
          <p className="text-sm font-semibold">Preview lokal · data sintetis, bukan portfolio client</p>
          <div className="mt-3 flex flex-wrap gap-2">{[["examples","Contoh"],["empty","Kosong"],["loading","Memuat"],["error","Gagal"]].map(([value,label]) => <AuLink className="min-h-11" key={value} href={`/projects?preview=${value}`} variant="outline" size="sm" aria-current={scenario === value ? "page" : undefined}>{label}</AuLink>)}</div>
        </aside>}
        {scenario === "loading" ? <div role="status" className="space-y-5 py-8"><p>Memuat daftar project… (preview)</p><div className="h-40 rounded-lg bg-muted motion-safe:animate-pulse" /></div> :
          scenario === "error" ? <StatusNotice tone="error" title="Daftar project belum dapat dimuat." description="Coba muat kembali. Informasi yang Anda masukkan tidak berubah." action={<AuLink className="min-h-11" href="/projects?preview=examples" variant="outline">Coba lagi</AuLink>} /> :
          <ProjectList projects={projects} preview={scenario === "examples"} />}
        <section className="mt-16 flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className={type.subheading.className}>Punya konteks yang ingin dibahas?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Mulai dari tujuan, bukan dari jawaban yang sudah lengkap.</p></div><AuLink className="min-h-11" href="/project-brief">Diskusikan Proyek</AuLink>
        </section>
      </main>
    </PublicShell>
  );
}
