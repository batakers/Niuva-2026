import "server-only";
import { isCuratedPreview, resolvePreviewScenario } from "./scenarios";
import type { ProjectPreviewItem, PublicShopProduct } from "./types";

async function getCuratedProjects(): Promise<readonly ProjectPreviewItem[]> {
  const { curatedFeaturedProjects, curatedSelectedWorks } = await import("./curated-content");
  const featured: readonly ProjectPreviewItem[] = curatedFeaturedProjects.map(project => ({
    challenge: "challenge" in project.story ? project.story.challenge : undefined,
    clientName: project.clientOrPartnerLabel,
    detailReadiness: project.detailReadiness,
    evidenceBoundary: project.story.evidenceBoundary,
    id: project.id,
    media: [{
      altText: project.cover.altText,
      previewUrl: `/api/frontend-preview/media/${project.id.toLowerCase()}`,
      sortOrder: 0,
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
  const selected: readonly ProjectPreviewItem[] = curatedSelectedWorks.map(work => ({
    clientName: null,
    detailReadiness: work.detailReadiness,
    id: work.id,
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

export async function getProjectPreview(requested: unknown) {
  if (isCuratedPreview(process.env.NODE_ENV, requested)) {
    return { scenario: "curated" as const, projects: await getCuratedProjects() };
  }
  const scenario = resolvePreviewScenario(process.env.NODE_ENV, requested);
  const projects: readonly ProjectPreviewItem[] = scenario === "examples"
    ? (await import("./fixtures")).exampleProjects : [];
  return { scenario, projects };
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
