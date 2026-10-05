import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectPreviewBySlug } from "@/features/frontend-preview/server";
import { ProjectDetailView } from "./project-detail-view";

// Time-based revalidation (render-strategy.md, 9.13). Must stay a static
// literal. This page must not read `searchParams` or any other request-time
// API: `?preview=` scenarios are served by
// `src/app/preview/projects/[slug]/page.tsx` through a rewrite in
// next.config.ts. Slugs are rendered on first request and cached per slug;
// admin portfolio actions invalidate every entry with
// `revalidatePath("/projects/[slug]", "page")`.
export const revalidate = 300;

// No slug is pre-rendered at build (the build must not need a database). An
// empty list still makes the segment a cacheable, on-demand ISR route;
// `dynamicParams` stays at its default `true`.
export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { project } = await getProjectPreviewBySlug(slug, undefined);

  if (project === null || project.detailReadiness === "card-only") {
    return {
      title: "Project tidak ditemukan · Niuva",
      robots: { follow: false, index: false },
    };
  }

  return {
    title: `${project.title} · Projects · Niuva`,
    description: project.summary,
    robots: { follow: true, index: true },
  };
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { project } = await getProjectPreviewBySlug(slug, undefined);
  if (!project || project.detailReadiness === "card-only") notFound();

  return <ProjectDetailView project={project} scenario={null} />;
}
