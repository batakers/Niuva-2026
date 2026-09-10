import "server-only";

import { cache } from "react";

import type { ProjectPreviewItem } from "@/features/frontend-preview/types";
import { PortfolioRepository } from "@/modules/portfolio/repository";
import {
  getApprovedPortfolioProjectBySlug,
  getApprovedPortfolioProjects,
  type ApprovedPortfolioProject,
} from "@/modules/portfolio/public-content";

type PublishedPortfolioProject = Awaited<
  ReturnType<PortfolioRepository["listPublishedProjects"]>
>[number];

function asOptionalCopy(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolvePublicMediaUrl(storageKey: string): string | undefined {
  if (!/^media\/portfolio\/[a-z0-9][a-z0-9-]*\.png$/i.test(storageKey)) {
    return undefined;
  }

  return `/${storageKey}`;
}

function resolveDetailReadiness(
  project: PublishedPortfolioProject,
  approved: ApprovedPortfolioProject | null,
): ProjectPreviewItem["detailReadiness"] {
  if (approved !== null) {
    return approved.detailReadiness;
  }

  if (!project.isFeatured) {
    return "card-only";
  }

  return asOptionalCopy(project.challenge) || asOptionalCopy(project.process)
    ? "full-conservative-draft"
    : "summary-only";
}

function toPublicProject(
  project: PublishedPortfolioProject,
): ProjectPreviewItem {
  const approved = getApprovedPortfolioProjectBySlug(project.slug);

  return {
    challenge: asOptionalCopy(project.challenge),
    clientName: project.clientName,
    detailReadiness: resolveDetailReadiness(project, approved),
    evidenceBoundary: approved?.evidenceBoundary,
    id: project.id,
    media: approved
      ? approved.media.map((media) => ({
          altText: media.altText,
          sortOrder: media.sortOrder,
          url: media.publicPath,
        }))
      : project.media.map((media) => ({
          altText: media.altText,
          sortOrder: media.sortOrder,
          url: resolvePublicMediaUrl(media.storageKey),
        })),
    process: asOptionalCopy(project.process),
    result: asOptionalCopy(project.result),
    serviceLabel: project.serviceLabel,
    slug: project.slug,
    summary: project.summary,
    tags: approved?.tags ?? [],
    title: project.title,
    year: approved?.year ?? null,
  };
}

function compareEditorialOrder(
  left: ProjectPreviewItem,
  right: ProjectPreviewItem,
): number {
  const approvedProjects = getApprovedPortfolioProjects();
  const leftIndex = approvedProjects.findIndex((project) => project.slug === left.slug);
  const rightIndex = approvedProjects.findIndex((project) => project.slug === right.slug);
  const unknownIndex = Number.MAX_SAFE_INTEGER;

  return (leftIndex < 0 ? unknownIndex : leftIndex) -
    (rightIndex < 0 ? unknownIndex : rightIndex);
}

/** Normal production read: only database records marked as published are exposed. */
export const listPublishedPortfolioProjects = cache(async (): Promise<
  readonly ProjectPreviewItem[]
> => {
  const projects = await new PortfolioRepository().listPublishedProjects();
  return projects.map(toPublicProject).sort(compareEditorialOrder);
});

/** Normal production detail read: private/unpublished records remain invisible. */
export const findPublishedPortfolioProjectBySlug = cache(
  async (slug: string): Promise<ProjectPreviewItem | null> => {
    const project = await new PortfolioRepository().findPublishedProjectBySlug(slug);
    return project === null ? null : toPublicProject(project);
  },
);
