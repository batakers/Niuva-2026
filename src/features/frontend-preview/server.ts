import "server-only";
import { resolvePreviewScenario } from "./scenarios";
import type { PublicProject, PublicShopProduct } from "./types";

export async function getProjectPreview(requested: unknown) {
  const scenario = resolvePreviewScenario(process.env.NODE_ENV, requested);
  const projects: readonly PublicProject[] = scenario === "examples"
    ? (await import("./fixtures")).exampleProjects : [];
  return { scenario, projects };
}

export async function getShopPreview(requested: unknown) {
  const scenario = resolvePreviewScenario(process.env.NODE_ENV, requested);
  const products: readonly PublicShopProduct[] = scenario === "examples"
    ? (await import("./fixtures")).exampleShopProducts : [];
  return { scenario, products };
}
