import { PublicShell } from "@/components/niuva/public-shell";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { ClosingPanel } from "@/components/niuva/closing-panel";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { StatusNotice } from "@/components/niuva/status-notice";
import { typographySystemTokens as type } from "@/design/typography";
import type { PreviewScenario, ProjectPreviewItem } from "@/features/frontend-preview/types";
import { mascotRenders } from "@/features/public/mascot";
import { ProjectList } from "./project-list";

type ProjectsIndexViewProps = Readonly<{
  projects: readonly ProjectPreviewItem[];
  /** Target of the "Coba lagi" action in the error state. */
  retryHref: string;
  scenario: PreviewScenario | null;
}>;

/**
 * Markup shared by `/projects` (production path, no request-time API) and the
 * internal preview route that serves `/projects?preview=...`. It takes data as
 * props so neither caller needs anything beyond its own data fetch.
 */
export function ProjectsIndexView({ projects, retryHref, scenario }: ProjectsIndexViewProps) {
  return (
    <PublicShell scope="projects">
      <main id="main-content">
        <div className="mx-auto max-w-public px-5 pt-14 sm:px-12 sm:pt-20">
          <section aria-labelledby="projects-title" className="pb-10">
            <h1 className={type.display.className} id="projects-title">Bentuk akhirnya punya cerita.</h1>
            <p className="mt-5 max-w-[56ch] text-lead leading-[1.6] text-muted-foreground sm:text-lg">Lihat konteks, keputusan yang tercatat, dan output yang dapat ditinjau. Setiap cerita berhenti pada batas bukti yang tersedia.</p>
          </section>
          {scenario === "loading" ? <div role="status" className="space-y-5 py-8"><p>Memuat daftar project… (preview)</p><div className="h-40 rounded-lg bg-muted motion-safe:animate-pulse" /></div> :
            scenario === "error" ? <StatusNotice tone="error" title="Daftar project belum dapat dimuat." description="Coba muat kembali. Informasi yang Anda masukkan tidak berubah." action={<NiuvaLink className="min-h-11" href={retryHref} variant="outline">Coba lagi</NiuvaLink>} /> :
            <ProjectList projects={projects} previewMode={scenario} />}
          {process.env.NODE_ENV === "development" && <StatusNotice aria-label="Preview frontend" className="mt-12" description="Rute normal memakai sumber konten yang disetujui untuk verifikasi lokal; runtime produksi membaca record Prisma yang telah di-seed." role="note" size="compact" title="Preview lokal · mode pembanding" tone="info">
            <div className="flex flex-wrap gap-2 pt-1">{[["examples","Contoh sintetis"],["empty","Kosong"],["loading","Memuat"],["error","Gagal"]].map(([value,label]) => <NiuvaLink className="min-h-11" key={value} href={`/projects?preview=${value}`} variant="outline" size="sm" aria-current={scenario === value ? "page" : undefined}>{label}</NiuvaLink>)}</div>
          </StatusNotice>}
        </div>
        <ClosingPanel id="projects-next-title" mascot={mascotRenders.victory} title="Punya proyek yang ingin dibahas?">
          <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-white">Ceritakan kebutuhan proyek Anda kepada tim Niuva.</p>
          <B2BContactLink className="mt-7" variant="onBrand" />
        </ClosingPanel>
      </main>
    </PublicShell>
  );
}
