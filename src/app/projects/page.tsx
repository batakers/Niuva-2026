import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { StatusNotice } from "@/components/niuva/status-notice";
import { typographySystemTokens as type } from "@/design/typography";
import { isPreviewParameter } from "@/features/frontend-preview/scenarios";
import { getProjectPreview } from "@/features/frontend-preview/server";
import { ProjectList } from "./project-list";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { preview } = await searchParams;
  const isPreview = isPreviewParameter(preview);

  return {
    title: "Projects · Niuva",
    description: "Konteks, proses, dan keputusan di balik pengembangan produk Niuva.",
    robots: isPreview ? { follow: false, index: false } : { follow: true, index: true },
  };
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { scenario, projects } = await getProjectPreview((await searchParams).preview);
  return (
    <PublicShell scope="projects">
      <main id="main-content" className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
        <section className="grid gap-6 border-b border-border pb-9 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] md:items-end">
          <div><p className="text-sm font-medium text-brand-700">Projects / Case studies</p><h1 className={`${type.display.className} mt-4`}>Bentuk akhirnya punya cerita.</h1></div>
          <p className="max-w-lg text-lg leading-8 text-muted-foreground md:pl-8">Lihat konteks, keputusan yang tercatat, dan output yang dapat ditinjau. Setiap cerita berhenti pada batas bukti yang tersedia.</p>
        </section>
        {scenario === "loading" ? <div role="status" className="space-y-5 py-8"><p>Memuat daftar project… (preview)</p><div className="h-40 rounded-lg bg-muted motion-safe:animate-pulse" /></div> :
          scenario === "error" ? <StatusNotice tone="error" title="Daftar project belum dapat dimuat." description="Coba muat kembali. Informasi yang Anda masukkan tidak berubah." action={<NiuvaLink className="min-h-11" href="/projects?preview=examples" variant="outline">Coba lagi</NiuvaLink>} /> :
          <ProjectList projects={projects} previewMode={scenario} />}
        {process.env.NODE_ENV === "development" && <aside aria-label="Preview frontend" className="mt-12 rounded-lg border border-info-border bg-info-background p-4 text-info">
          <p className="text-sm font-semibold">Preview lokal · mode pembanding</p>
          <p className="mt-1 text-sm">Rute normal memakai sumber konten yang disetujui untuk verifikasi lokal; runtime produksi membaca record Prisma yang telah di-seed.</p>
          <div className="mt-3 flex flex-wrap gap-2">{[["examples","Contoh sintetis"],["empty","Kosong"],["loading","Memuat"],["error","Gagal"]].map(([value,label]) => <NiuvaLink className="min-h-11" key={value} href={`/projects?preview=${value}`} variant="outline" size="sm" aria-current={scenario === value ? "page" : undefined}>{label}</NiuvaLink>)}</div>
        </aside>}
        <section className="mt-16 flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className={type.subheading.className}>Punya konteks yang ingin dibahas?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Mulai dari tujuan, bukan dari jawaban yang sudah lengkap.</p></div><NiuvaLink className="min-h-11" href="/project-brief">Diskusikan Proyek</NiuvaLink>
        </section>
      </main>
    </PublicShell>
  );
}
