import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectPreviewBySlug } from "@/features/frontend-preview/server";
import { ProjectDetailView } from "@/app/projects/[slug]/project-detail-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

// Internal target of the `/projects/[slug]?preview=...` rewrite in
// next.config.ts. It reads `searchParams`, so it is always dynamic and never
// cached; the public detail route stays free of request-time APIs. The content
// source is still chosen by `resolvePublicContentSource`. Always `noindex`.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const { project } = await getProjectPreviewBySlug(slug, preview);

  if (project === null || project.detailReadiness === "card-only") {
    return {
      title: "Project tidak ditemukan · Niuva",
      robots: { follow: false, index: false },
    };
  }

  return {
    title: `${project.title} · Projects · Niuva`,
    description: project.summary,
    robots: { follow: false, index: false },
  };
}

export default async function ProjectDetailPreview({ params, searchParams }: Props) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const { project, scenario } = await getProjectPreviewBySlug(slug, preview);
  if (!project || project.detailReadiness === "card-only") notFound();

  return <ProjectDetailView project={project} scenario={scenario} />;
}
