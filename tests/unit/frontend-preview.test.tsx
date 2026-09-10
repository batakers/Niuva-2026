import { describe, expect, it } from "vitest";
import { resolveCuratedMediaPath } from "@/features/frontend-preview/media";
import {
  isPreviewParameter,
  resolvePreviewScenario,
} from "@/features/frontend-preview/scenarios";

describe("frontend preview boundary", () => {
  it.each(["production", "test", undefined, ""])("rejects fixture access in %s", runtime => {
    for (const value of ["examples", "empty", "loading", "error"]) expect(resolvePreviewScenario(runtime, value)).toBeNull();
  });
  it("accepts only known scenarios in development", () => {
    expect(resolvePreviewScenario("development", "examples")).toBe("examples");
    for (const value of ["unknown", ["examples"], { preview: "examples" }, null]) expect(resolvePreviewScenario("development", value)).toBeNull();
  });

  it("marks known preview query values noindex regardless of runtime", () => {
    for (const value of ["examples", "empty", "loading", "error"]) {
      expect(isPreviewParameter(value)).toBe(true);
    }
    for (const value of ["unknown", "curated", ["curated"], { preview: "curated" }, null]) {
      expect(isPreviewParameter(value)).toBe(false);
    }
  });

  it("resolves only allowlisted curated proof media in development", () => {
    expect(resolveCuratedMediaPath("development", "cs-01")).toBe(
      "docs/content/media-proofs/featured-covers/cs-01-smart-drop-box.png",
    );
    expect(resolveCuratedMediaPath("development", "../../.env")).toBeNull();
    expect(resolveCuratedMediaPath("production", "cs-01")).toBeNull();
  });
});
