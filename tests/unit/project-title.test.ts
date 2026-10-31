import { describe, expect, it } from "vitest";
import { projectTitleText, splitProjectTitle } from "@/features/public/project-title";

describe("project titles without the em dash", () => {
  it("splits the work from its client or qualifier", () => {
    expect(splitProjectTitle("Smart Drop Box — P&G")).toEqual({ name: "Smart Drop Box", qualifier: "P&G" });
    expect(splitProjectTitle("Simulator Keselamatan Berkendara — Agate / PT DENSO")).toEqual({ name: "Simulator Keselamatan Berkendara", qualifier: "Agate / PT DENSO" });
  });

  it("keeps a title without a dash whole", () => {
    expect(splitProjectTitle("Elips Tandem Bike")).toEqual({ name: "Elips Tandem Bike", qualifier: null });
  });

  it("joins the parts with a comma for plain text", () => {
    expect(projectTitleText("Mock-up Model Militer Skala 1:10 — PT Pindad")).toBe("Mock-up Model Militer Skala 1:10, PT Pindad");
    expect(projectTitleText("A — B — C")).toBe("A, B, C");
    expect(projectTitleText("Waste-Based Product")).toBe("Waste-Based Product");
  });
});
