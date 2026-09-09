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

describe("curated non-production content", () => {
  it("keeps the dataset fail-closed for public and production integration", () => {
    expect(curatedPreviewMetadata).toMatchObject({
      environment: "development-preview",
      publicIntegrationApproved: false,
      productionPublicationApproved: false,
    });
    expect(curatedCompanyProfile.publication).toEqual({
      environment: "development-preview",
      publicIntegrationApproved: false,
      productionPublicationApproved: false,
    });

    for (const item of [...curatedFeaturedProjects, ...curatedSelectedWorks]) {
      expect(item.publication.publicIntegrationApproved).toBe(false);
      expect(item.publication.productionPublicationApproved).toBe(false);
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

  it("references only reviewed internal cover proofs and keeps them non-production", () => {
    for (const project of curatedFeaturedProjects) {
      expect(project.cover.internalPath).toContain(`/featured-covers/${project.id.toLowerCase()}-`);
      expect(project.cover.reviewStatus).toBe("owner-approved-proof");
      expect(project.cover.productionReady).toBe(false);
      expect(existsSync(resolve(process.cwd(), project.cover.internalPath))).toBe(true);
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

  it("contains four service candidates and eleven approved card-only works", () => {
    expect(curatedServices).toHaveLength(4);
    expect(curatedServices.every(service => service.reviewStatus === "candidate")).toBe(true);
    expect(curatedSelectedWorks.map(work => work.id)).toEqual(
      Array.from({ length: 11 }, (_, index) => `SW-${String(index + 1).padStart(2, "0")}`),
    );
    expect(curatedSelectedWorks.every(work => work.detailReadiness === "card-only")).toBe(true);
    expect(new Set(curatedSelectedWorks.map(work => work.slug)).size).toBe(11);
  });
});
