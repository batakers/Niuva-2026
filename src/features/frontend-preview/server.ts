import "server-only";

import {
  getApprovedPortfolioProjectBySlug,
  getApprovedPortfolioProjects,
  type ApprovedPortfolioProject,
} from "@/modules/portfolio/public-content";
import {
  findPublishedPortfolioProjectBySlug,
  listPublishedPortfolioProjects,
} from "@/modules/portfolio/public-service";

import { resolvePreviewScenario } from "./scenarios";
import type { ProjectPreviewItem, PublicShopProduct } from "./types";

function toProjectPreviewItem(project: ApprovedPortfolioProject): ProjectPreviewItem {
  return {
    challenge: project.challenge,
    clientName: project.clientName,
    detailReadiness: project.detailReadiness,
    evidenceBoundary: project.evidenceBoundary,
    id: project.id,
    media: project.media.map((media) => ({
      altText: media.altText,
      sortOrder: media.sortOrder,
      url: media.publicPath,
    })),
    process: project.process,
    result: project.result,
    serviceLabel: project.serviceLabel,
    slug: project.slug,
    summary: project.summary,
    tags: project.tags,
    title: project.title,
    year: project.year,
  };
}

function getApprovedProjectReference(): readonly ProjectPreviewItem[] {
  return getApprovedPortfolioProjects().map(toProjectPreviewItem);
}

function getApprovedProjectReferenceBySlug(slug: string): ProjectPreviewItem | null {
  const project = getApprovedPortfolioProjectBySlug(slug);
  return project === null ? null : toProjectPreviewItem(project);
}

export async function getProjectPreview(requested: unknown) {
  const scenario = resolvePreviewScenario(process.env.NODE_ENV, requested);
  if (scenario !== null) {
    const projects: readonly ProjectPreviewItem[] = scenario === "examples"
      ? (await import("./fixtures")).exampleProjects
      : [];
    return { scenario, projects };
  }

  // The local reference lets visual and browser checks exercise the normal
  // public route without making a development server depend on a live DB.
  if (process.env.NODE_ENV === "development") {
    return { scenario: null, projects: getApprovedProjectReference() };
  }

  return { scenario: null, projects: await listPublishedPortfolioProjects() };
}

export async function getProjectPreviewBySlug(slug: string, requested: unknown) {
  const scenario = resolvePreviewScenario(process.env.NODE_ENV, requested);
  if (scenario !== null) {
    const project = scenario === "examples"
      ? (await import("./fixtures")).exampleProjects.find((item) => item.slug === slug) ?? null
      : null;
    return { project, scenario };
  }

  if (process.env.NODE_ENV === "development") {
    return { project: getApprovedProjectReferenceBySlug(slug), scenario: null };
  }

  return {
    project: await findPublishedPortfolioProjectBySlug(slug),
    scenario: null,
  };
}

export async function getShopPreview(requested: unknown) {
  const scenario = resolvePreviewScenario(process.env.NODE_ENV, requested);
  const products: readonly PublicShopProduct[] = scenario === "examples"
    ? (await import("./fixtures")).exampleShopProducts : [];
  return { scenario, products };
}

export async function getShopProductPreview(slug: string, requested: unknown) {
  const scenario = resolvePreviewScenario(process.env.NODE_ENV, requested);
  const product = scenario === "examples"
    ? (await import("./fixtures")).exampleShopProducts.find(item => item.slug === slug) ?? null
    : null;
  return { product, scenario };
}
