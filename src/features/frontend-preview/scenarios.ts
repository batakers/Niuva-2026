import type { PreviewScenario } from "./types";

const previewScenarios = ["examples", "empty", "loading", "error"] as const;

/** Narrow a query value to a known scenario; grants no access by itself. */
export function parsePreviewScenario(requested: unknown): PreviewScenario | null {
  return previewScenarios.includes(requested as PreviewScenario)
    ? requested as PreviewScenario
    : null;
}

export function resolvePreviewScenario(runtime: string | undefined, requested: unknown): PreviewScenario | null {
  if (runtime !== "development") return null;
  return previewScenarios.includes(requested as PreviewScenario)
    ? requested as PreviewScenario
    : null;
}

/** Recognize preview query values even in production so they remain noindex. */
export function isPreviewParameter(requested: unknown): boolean {
  return previewScenarios.includes(requested as PreviewScenario);
}
