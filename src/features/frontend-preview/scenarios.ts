import type { PreviewScenario } from "./types";

export function resolvePreviewScenario(runtime: string | undefined, requested: unknown): PreviewScenario | null {
  if (runtime !== "development") return null;
  return requested === "examples" || requested === "empty" || requested === "loading" || requested === "error"
    ? requested : null;
}

export function isCuratedPreview(runtime: string | undefined, requested: unknown): boolean {
  return runtime === "development" && requested === "curated";
}
