import type { Metadata } from "next";
import { getProjectPreview } from "@/features/frontend-preview/server";
import { ProjectsIndexView } from "@/app/projects/projects-index-view";

type SearchParams = Promise<{ preview?: string }>;

// Internal target of the `/projects?preview=...` rewrite in next.config.ts. It
// reads `searchParams`, so it is always dynamic and never cached; the public
// `/projects` route stays free of request-time APIs. The source is still chosen
// by `resolvePublicContentSource`, so this route grants no access of its own.
// Anything reaching it is `noindex`.
export const metadata: Metadata = {
  title: "Projects · Niuva",
  description: "Konteks, proses, dan keputusan di balik pengembangan produk Niuva.",
  robots: { follow: false, index: false },
};

export default async function ProjectsPreviewPage({ searchParams }: { searchParams: SearchParams }) {
  const { scenario, projects } = await getProjectPreview((await searchParams).preview);

  return <ProjectsIndexView projects={projects} retryHref="/projects?preview=examples" scenario={scenario} />;
}
