import { describe, expect, it } from "vitest";
import { resolvePreviewScenario } from "@/features/frontend-preview/scenarios";

describe("frontend preview boundary", () => {
  it.each(["production", "test", undefined, ""])("rejects fixture access in %s", runtime => {
    for (const value of ["examples", "empty", "loading", "error"]) expect(resolvePreviewScenario(runtime, value)).toBeNull();
  });
  it("accepts only known scenarios in development", () => {
    expect(resolvePreviewScenario("development", "examples")).toBe("examples");
    for (const value of ["unknown", ["examples"], { preview: "examples" }, null]) expect(resolvePreviewScenario("development", value)).toBeNull();
  });
});
