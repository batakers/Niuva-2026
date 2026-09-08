"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type AdminPortfolioScenario = "populated" | "loading" | "empty" | "error";

type PublicationStatus = "draft" | "published-preview";
type ContentReadiness = "ready" | "missing-media" | "missing-permission";

type PreviewPortfolioProject = Readonly<{
  contentReadiness: ContentReadiness;
  id: string;
  lastEditedLabel: string;
  publicationStatus: PublicationStatus;
  serviceLabel: string;
  title: string;
}>;

type PortfolioSelection =
  | Readonly<{ kind: "create" }>
  | Readonly<{ id: string; kind: "existing" }>;

type AdminPortfolioListProps = Readonly<{
  initialScenario: AdminPortfolioScenario;
}>;

const portfolioFixtures: readonly PreviewPortfolioProject[] = [
  {
    id: "PORTFOLIO-EX-MODULAR",
    title: "Fixture internal: sistem penyimpanan modular",
    serviceLabel: "Pengembangan produk",
    publicationStatus: "published-preview",
    contentReadiness: "ready",
    lastEditedLabel: "Contoh waktu edit lokal",
  },
  {
    id: "PORTFOLIO-EX-ENCLOSURE",
    title: "Fixture internal: enclosure elektronik",
    serviceLabel: "Prototyping",
    publicationStatus: "draft",
    contentReadiness: "missing-media",
    lastEditedLabel: "Contoh waktu edit lokal",
  },
  {
    id: "PORTFOLIO-EX-ASSISTIVE",
    title: "Fixture internal: alat bantu perakitan",
    serviceLabel: "Manufacturing support",
    publicationStatus: "draft",
    contentReadiness: "missing-permission",
    lastEditedLabel: "Contoh waktu edit lokal",
  },
];

const publicationOptions: readonly Readonly<{ label: string; value: PublicationStatus | "all" }>[] = [
  { value: "all", label: "Semua status" },
  { value: "draft", label: "Draft" },
  { value: "published-preview", label: "Published preview" },
];

const readinessOptions: readonly Readonly<{ label: string; value: ContentReadiness | "all" }>[] = [
  { value: "all", label: "Semua kelengkapan" },
  { value: "ready", label: "Konten siap" },
  { value: "missing-media", label: "Media belum ada" },
  { value: "missing-permission", label: "Izin belum dikonfirmasi" },
];

function PublicationBadge({ status }: Readonly<{ status: PublicationStatus }>) {
  if (status === "draft") {
    return <Badge className="border-warning-border bg-warning-background text-warning" variant="outline">Draft</Badge>;
  }

  return <Badge className="border-info-border bg-info-background text-info" variant="outline">Published preview</Badge>;
}

function ReadinessBadge({ readiness }: Readonly<{ readiness: ContentReadiness }>) {
  if (readiness === "ready") {
    return <Badge className="border-success-border bg-success-background text-success" variant="outline">Konten siap ditinjau</Badge>;
  }

  if (readiness === "missing-media") {
    return <Badge className="border-warning-border bg-warning-background text-warning" variant="outline">Media belum ada</Badge>;
  }

  return <Badge className="border-warning-border bg-warning-background text-warning" variant="outline">Izin belum dikonfirmasi</Badge>;
}

function PortfolioLoadingState() {
  return (
    <section aria-busy="true" aria-label="Memuat portofolio preview" className="space-y-3" data-admin-portfolio-loading>
      <div className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      <div className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      <div className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    </section>
  );
}

function SelectionPanel({
  controlsDisabled,
  onOpenEditor,
  selection,
}: Readonly<{
  controlsDisabled: boolean;
  onOpenEditor: (projectId: string) => void;
  selection: PortfolioSelection;
}>) {
  const selectedProject = selection.kind === "existing"
    ? portfolioFixtures.find((project) => project.id === selection.id) ?? null
    : null;

  return (
    <aside aria-label="Pilihan portofolio preview" className="space-y-4 xl:sticky xl:top-5">
      <Card className="border-brand-200 bg-brand-50/45 shadow-card">
        <CardHeader>
          <h2 className="text-base leading-snug font-medium">{selection.kind === "create" ? "Draft baru preview" : "Pilihan untuk diedit"}</h2>
          <CardDescription>
            {selection.kind === "create"
              ? "Pemilihan ini belum membuat project, slug, media, atau publikasi."
              : "Pilihan lokal ini meneruskan konteks ke editor FE-26, bukan ke database."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6">
          {selectedProject !== null ? (
            <>
              <div>
                <p className="font-medium text-foreground">{selectedProject.title}</p>
                <p className="mt-1 text-muted-foreground">{selectedProject.serviceLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PublicationBadge status={selectedProject.publicationStatus} />
                <ReadinessBadge readiness={selectedProject.contentReadiness} />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Editor berikutnya akan memulai draft tanpa menyalin contoh client, logo, hasil bisnis, atau media.</p>
          )}
          <StatusNotice
            description="FE-26 akan memeriksa narasi, urutan media, alt text, dan izin sebelum intent publikasi dapat diteruskan ke server."
            size="compact"
            title="Editor belum dihubungkan"
            tone="info"
          />
          <Button className="min-h-11 w-full cursor-pointer" disabled={controlsDisabled} onClick={() => onOpenEditor(selection.kind === "create" ? "new" : selection.id)} type="button" variant="outline">
            Buka editor preview
          </Button>
        </CardContent>
      </Card>
      <StatusNotice
        description="Published preview hanya label fixture untuk menguji hierarchy. Ia tidak muncul pada halaman publik dan tidak mengubah isPublished di server."
        title="Batas publikasi"
        tone="warning"
      />
    </aside>
  );
}

function PortfolioTable({
  controlsDisabled,
  onSelect,
  projects,
}: Readonly<{
  controlsDisabled: boolean;
  onSelect: (projectId: string) => void;
  projects: readonly PreviewPortfolioProject[];
}>) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-left text-sm" data-admin-portfolio-table>
        <thead>
          <tr className="text-xs font-medium text-muted-foreground">
            <th className="border-b border-border px-4 py-3">Project</th>
            <th className="border-b border-border px-4 py-3">Publikasi</th>
            <th className="border-b border-border px-4 py-3">Kelengkapan</th>
            <th className="border-b border-border px-4 py-3">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td className="border-b border-border px-4 py-4 align-top">
                <p className="font-medium text-foreground">{project.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{project.serviceLabel}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{project.lastEditedLabel}</p>
              </td>
              <td className="border-b border-border px-4 py-4 align-top"><PublicationBadge status={project.publicationStatus} /></td>
              <td className="border-b border-border px-4 py-4 align-top"><ReadinessBadge readiness={project.contentReadiness} /></td>
              <td className="border-b border-border px-4 py-4 align-top">
                <Button aria-label={`Pilih untuk edit ${project.title}`} className="min-h-11 cursor-pointer" disabled={controlsDisabled} onClick={() => onSelect(project.id)} type="button" variant="outline">
                  Pilih untuk edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PortfolioCards({
  controlsDisabled,
  onSelect,
  projects,
}: Readonly<{
  controlsDisabled: boolean;
  onSelect: (projectId: string) => void;
  projects: readonly PreviewPortfolioProject[];
}>) {
  return (
    <ol aria-label="Daftar portofolio contoh" className="grid gap-3 lg:hidden" data-admin-portfolio-cards>
      {projects.map((project) => (
        <li key={project.id}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>{project.title}</CardTitle>
              <CardDescription>{project.serviceLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Status publikasi</dt>
                  <dd className="mt-2"><PublicationBadge status={project.publicationStatus} /></dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Kelengkapan konten</dt>
                  <dd className="mt-2"><ReadinessBadge readiness={project.contentReadiness} /></dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Riwayat</dt>
                  <dd className="mt-1 text-muted-foreground">{project.lastEditedLabel}</dd>
                </div>
              </dl>
              <Button aria-label={`Pilih untuk edit ${project.title}`} className="mt-5 min-h-11 w-full cursor-pointer" disabled={controlsDisabled} onClick={() => onSelect(project.id)} type="button" variant="outline">
                Pilih untuk edit
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}

export function AdminPortfolioList({ initialScenario }: AdminPortfolioListProps) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [scenario, setScenario] = useState<AdminPortfolioScenario>(initialScenario);
  const [publicationFilter, setPublicationFilter] = useState<PublicationStatus | "all">("all");
  const [readinessFilter, setReadinessFilter] = useState<ContentReadiness | "all">("all");
  const [selection, setSelection] = useState<PortfolioSelection>({ kind: "existing", id: portfolioFixtures[0].id });

  const visibleProjects = useMemo(() => {
    if (scenario !== "populated") return [];

    return portfolioFixtures.filter((project) => (
      (publicationFilter === "all" || project.publicationStatus === publicationFilter)
      && (readinessFilter === "all" || project.contentReadiness === readinessFilter)
    ));
  }, [publicationFilter, readinessFilter, scenario]);

  const controlsDisabled = !hydrated || scenario === "loading" || scenario === "error";
  const hasAppliedFilters = publicationFilter !== "all" || readinessFilter !== "all";

  function resetFilters() {
    setPublicationFilter("all");
    setReadinessFilter("all");
  }

  function openEditor(projectId: string) {
    router.push(`/auis/proofs/frontend/admin?preview=examples&state=ready&module=portfolio&view=editor&project=${encodeURIComponent(projectId)}`);
  }

  return (
    <main className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10" data-admin-portfolio="preview" data-portfolio-scenario={scenario} id="main-content">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-brand-700">Target /admin/portfolio</p>
              <Badge className="border-border bg-background text-muted-foreground" variant="outline">Development-only preview</Badge>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Publikasi perlu bukti yang lengkap.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Tinjau status, kelengkapan konten, dan izin secara terpisah sebelum project dapat muncul sebagai bukti publik.
            </p>
          </header>

          <section aria-labelledby="portfolio-filter-heading" className="border-b border-border py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold" id="portfolio-filter-heading">Status yang perlu ditinjau</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Filter dan pemilihan ini hanya mengubah fixture lokal. Tidak ada project, media, nama client, atau publikasi nyata yang dimuat.</p>
              </div>
              <Button className="min-h-11 cursor-pointer" disabled={controlsDisabled} onClick={() => setSelection({ kind: "create" })} type="button">
                Buat portofolio preview
              </Button>
            </div>
            <div className="mt-5 grid gap-5">
              <fieldset disabled={controlsDisabled}>
                <legend className="text-sm font-medium">Publikasi</legend>
                <div className="mt-2 flex flex-wrap gap-2" role="group">
                  {publicationOptions.map((option) => (
                    <Button aria-pressed={publicationFilter === option.value} className="min-h-11 cursor-pointer" key={option.value} onClick={() => setPublicationFilter(option.value)} type="button" variant={publicationFilter === option.value ? "default" : "outline"}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={controlsDisabled}>
                <legend className="text-sm font-medium">Kelengkapan konten</legend>
                <div className="mt-2 flex flex-wrap gap-2" role="group">
                  {readinessOptions.map((option) => (
                    <Button aria-pressed={readinessFilter === option.value} className="min-h-11 cursor-pointer" key={option.value} onClick={() => setReadinessFilter(option.value)} type="button" variant={readinessFilter === option.value ? "default" : "outline"}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              {hasAppliedFilters ? <div><Button className="min-h-11 cursor-pointer" disabled={controlsDisabled} onClick={resetFilters} type="button" variant="outline">Reset filter</Button></div> : null}
            </div>
          </section>

          <section aria-labelledby="portfolio-list-heading" className="pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold" id="portfolio-list-heading">Daftar portofolio</h2>
              {scenario !== "loading" && scenario !== "error" ? <p className="text-sm text-muted-foreground" role="status">{visibleProjects.length} contoh ditampilkan</p> : null}
            </div>
            <div className="mt-4">
              {scenario === "loading" ? <PortfolioLoadingState /> : null}
              {scenario === "empty" ? <StatusNotice description="Keadaan ini hanya skenario preview. Jangan menyimpulkan portofolio produksi benar-benar kosong." title="Tidak ada portofolio contoh" tone="info" /> : null}
              {scenario === "error" ? <StatusNotice action={<Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setScenario("populated")} type="button" variant="outline">Coba lagi</Button>} description="Tidak ada data portfolio, media, atau izin server yang dibaca. Tombol hanya memulihkan fixture lokal." title="Daftar portofolio preview belum dapat dimuat" tone="error" /> : null}
              {scenario === "populated" && visibleProjects.length === 0 ? <StatusNotice action={<Button className="min-h-11 cursor-pointer" onClick={resetFilters} type="button" variant="outline">Reset filter</Button>} description="Ubah atau reset filter untuk meninjau fixture portofolio lain. Tidak ada query portofolio nyata yang dilakukan." title="Filter tidak menemukan portofolio contoh" tone="info" /> : null}
              {scenario === "populated" && visibleProjects.length > 0 ? <><PortfolioTable controlsDisabled={controlsDisabled} onSelect={(id) => setSelection({ kind: "existing", id })} projects={visibleProjects} /><PortfolioCards controlsDisabled={controlsDisabled} onSelect={(id) => setSelection({ kind: "existing", id })} projects={visibleProjects} /></> : null}
            </div>
          </section>
        </div>

        <SelectionPanel controlsDisabled={controlsDisabled} onOpenEditor={openEditor} selection={selection} />
      </div>
    </main>
  );
}
