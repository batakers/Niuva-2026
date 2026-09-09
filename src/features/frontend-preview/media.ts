import { curatedFeaturedProjects } from "./curated-content";

export function resolveCuratedMediaPath(
  runtime: string | undefined,
  requestedId: unknown,
): string | null {
  if (runtime !== "development" || typeof requestedId !== "string") return null;
  const project = curatedFeaturedProjects.find(item => item.id.toLowerCase() === requestedId);
  return project?.cover.internalPath ?? null;
}
