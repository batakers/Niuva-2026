import {
  curatedFeaturedProjects,
  curatedSelectedWorks,
  type CuratedCoverProof,
  type DetailReadiness,
} from "../../features/frontend-preview/curated-content";
import { curatedProjectDocumentation } from "../../features/frontend-preview/curated-documentation";

export type ApprovedPortfolioMedia = Readonly<{
  altText: string;
  /** Source pixels; known only for approved documentation, never for admin uploads. */
  height?: number;
  publicPath: string;
  sortOrder: number;
  storageKey: string;
  width?: number;
}>;

export type ApprovedPortfolioProject = Readonly<{
  challenge?: string;
  clientName: string | null;
  detailReadiness: DetailReadiness;
  evidenceBoundary?: string;
  id: string;
  isFeatured: boolean;
  media: readonly ApprovedPortfolioMedia[];
  process?: string;
  result?: string;
  serviceLabel: string;
  slug: string;
  summary: string;
  tags: readonly string[];
  title: string;
  year: number | null;
}>;

function toStorageKey(publicPath: string): string {
  return publicPath.replace(/^\//, "");
}

/** The approved cover stays at sort order 0; documentation follows in the reviewed order. */
function approvedMedia(id: string, cover: CuratedCoverProof): readonly ApprovedPortfolioMedia[] {
  const documentation = curatedProjectDocumentation[id] ?? [];
  return [
    { altText: cover.altText, publicPath: cover.publicPath, sortOrder: 0, storageKey: toStorageKey(cover.publicPath) },
    ...documentation.map((item, index) => ({
      altText: item.altText,
      height: item.height,
      publicPath: item.publicPath,
      sortOrder: index + 1,
      storageKey: toStorageKey(item.publicPath),
      width: item.width,
    })),
  ];
}

/**
 * Produces the owner-approved public projection in editorial order. It is used
 * both by the development reference render and the idempotent Prisma seed.
 */
export function getApprovedPortfolioProjects(): readonly ApprovedPortfolioProject[] {
  const featured = curatedFeaturedProjects.map((project): ApprovedPortfolioProject => ({
    challenge: "challenge" in project.story ? project.story.challenge : undefined,
    clientName: project.clientOrPartnerLabel,
    detailReadiness: project.detailReadiness,
    evidenceBoundary: project.story.evidenceBoundary,
    id: project.id,
    isFeatured: true,
    media: approvedMedia(project.id, project.cover),
    process: "process" in project.story ? project.story.process : undefined,
    result: project.story.output,
    serviceLabel: project.service,
    slug: project.slug,
    summary: project.summary,
    tags: project.tags,
    title: project.title,
    year: project.year,
  }));

  const selected = curatedSelectedWorks.map((work): ApprovedPortfolioProject => ({
    clientName: null,
    detailReadiness: work.detailReadiness,
    id: work.id,
    isFeatured: false,
    media: approvedMedia(work.id, work.cover),
    serviceLabel: work.service,
    slug: work.slug,
    summary: work.summary,
    tags: work.tags,
    title: work.title,
    year: null,
  }));

  return [...featured, ...selected];
}

export function getApprovedPortfolioProjectBySlug(
  slug: string,
): ApprovedPortfolioProject | null {
  return getApprovedPortfolioProjects().find((project) => project.slug === slug) ?? null;
}

/**
 * Selected Works are intentionally publishable as summary cards without
 * production media. Keep the exception tied to the Owner-approved curation
 * and to the non-featured presentation mode so an arbitrary project cannot
 * bypass the normal case-study media gate.
 */
export function isApprovedCardOnlyPortfolioProject(
  input: Readonly<{ isFeatured: boolean; slug: string }>,
): boolean {
  if (input.isFeatured) return false;
  return getApprovedPortfolioProjectBySlug(input.slug)?.detailReadiness === "card-only";
}
