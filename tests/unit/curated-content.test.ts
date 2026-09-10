import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  curatedCompanyProfile,
  curatedFeaturedProjects,
  curatedPreviewMetadata,
  curatedSelectedWorks,
  curatedServices,
} from "@/features/frontend-preview/curated-content";

describe("approved public content source", () => {
  it("records the Owner approval while keeping the reference preview separate", () => {
    expect(curatedPreviewMetadata).toMatchObject({
      environment: "development-reference-preview",
      publicIntegrationApproved: true,
      productionPublicationApproved: true,
    });
    expect(curatedCompanyProfile.publication).toEqual({
      contentVersion: "2026-09-10",
      publicIntegrationApproved: true,
      productionPublicationApproved: true,
    });

    for (const item of [...curatedFeaturedProjects, ...curatedSelectedWorks, ...curatedServices]) {
      expect(item.publication.publicIntegrationApproved).toBe(true);
      expect(item.publication.productionPublicationApproved).toBe(true);
    }
  });

  it("preserves the approved featured editorial order without changing stable case IDs", () => {
    expect(curatedFeaturedProjects.map(project => project.id)).toEqual([
      "CS-01",
      "CS-02",
      "CS-05",
      "CS-03",
      "CS-06",
      "CS-04",
    ]);
    expect(new Set(curatedFeaturedProjects.map(project => project.slug)).size).toBe(6);
    expect(curatedFeaturedProjects.filter(project => project.year !== null)).toEqual([
      expect.objectContaining({ id: "CS-01", year: 2018 }),
    ]);
  });

  it("references only reviewed cover proofs approved as production fallbacks", () => {
    for (const project of curatedFeaturedProjects) {
      expect(project.cover.internalPath).toContain(`/featured-covers/${project.id.toLowerCase()}-`);
      expect(project.cover.reviewStatus).toBe("owner-approved-proof");
      expect(project.cover.productionReady).toBe(true);
      expect(existsSync(resolve(process.cwd(), project.cover.internalPath))).toBe(true);
      expect(project.cover.publicPath).toMatch(/^\/media\/portfolio\/cs-0\d-/);
    }
  });

  it("does not invent full challenge and process stories for summary-only cases", () => {
    const completeDraft = curatedFeaturedProjects.find(project => project.id === "CS-01");
    expect(completeDraft?.detailReadiness).toBe("full-conservative-draft");
    expect(completeDraft?.story).toHaveProperty("challenge");
    expect(completeDraft?.story).toHaveProperty("process");

    const summaryOnly = curatedFeaturedProjects.filter(project => project.id !== "CS-01");
    for (const project of summaryOnly) {
      expect(project.detailReadiness).toBe("summary-only");
      expect(project.story).not.toHaveProperty("challenge");
      expect(project.story).not.toHaveProperty("process");
    }
  });

  it("contains four owner-approved preview services and eleven approved card-only works", () => {
    expect(curatedServices).toHaveLength(4);
    expect(curatedServices.every(service => service.reviewStatus === "owner-approved")).toBe(true);
    expect(curatedSelectedWorks.map(work => work.id)).toEqual(
      Array.from({ length: 11 }, (_, index) => `SW-${String(index + 1).padStart(2, "0")}`),
    );
    expect(curatedSelectedWorks.every(work => work.detailReadiness === "card-only")).toBe(true);
    expect(new Set(curatedSelectedWorks.map(work => work.slug)).size).toBe(11);
  });
});
