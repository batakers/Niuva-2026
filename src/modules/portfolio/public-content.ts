import {
  curatedFeaturedProjects,
  curatedSelectedWorks,
  type DetailReadiness,
} from "../../features/frontend-preview/curated-content";

export type ApprovedPortfolioMedia = Readonly<{
  altText: string;
  publicPath: string;
  sortOrder: number;
  storageKey: string;
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
    media: [{
      altText: project.cover.altText,
      publicPath: project.cover.publicPath,
      sortOrder: 0,
      storageKey: toStorageKey(project.cover.publicPath),
    }],
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
    media: [],
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
