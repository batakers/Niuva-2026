import type { Metadata } from "next";
import type { ProjectPreviewItem } from "@/features/frontend-preview/types";
import { getProjectPreview } from "@/features/frontend-preview/server";
import { buildPageSocialMetadata } from "@/lib/site-metadata";
import { ProjectsIndexView } from "./projects-index-view";

const PROJECTS_TITLE = "Projects · Niuva";
const PROJECTS_DESCRIPTION = "Konteks, proses, dan keputusan di balik pengembangan produk Niuva.";

export const metadata: Metadata = {
  title: PROJECTS_TITLE,
  description: PROJECTS_DESCRIPTION,
  ...buildPageSocialMetadata({
    title: PROJECTS_TITLE,
    description: PROJECTS_DESCRIPTION,
    path: "/projects",
  }),
  robots: { follow: true, index: true },
};

// Time-based revalidation (render-strategy.md, 9.13). Must stay a static
// literal. This page must not read `searchParams` or any other request-time
// API, otherwise it becomes dynamic and `revalidate` has no effect: the
// `?preview=` scenarios are served by `src/app/preview/projects/page.tsx`
// through a rewrite in next.config.ts. `revalidatePath("/projects")` in admin
// actions invalidates this entry.
export const revalidate = 300;

export default async function ProjectsPage() {
  // A database outage must not fail the build or the request; the existing
  // error state is shown and the entry refreshes on the next revalidation.
  const result = await getProjectPreview(undefined).catch(() => null);
  const projects: readonly ProjectPreviewItem[] = result?.projects ?? [];

  return (
    <ProjectsIndexView
      projects={projects}
      retryHref="/projects"
      scenario={result === null ? "error" : null}
    />
  );
}
