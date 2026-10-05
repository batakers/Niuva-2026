import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // Pass-through so each call reads PostgreSQL (no per-request memoization).
  return { ...actual, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn };
});

import { getPrismaClient } from "@/lib/db/prisma";
import {
  findPublishedPortfolioProjectBySlug,
  listPublishedPortfolioProjects,
} from "@/modules/portfolio/public-service";
import { getApprovedPortfolioProjects } from "@/modules/portfolio/public-content";
import { seedApprovedPublicContent } from "@/modules/portfolio/seed-approved-public-content";

const prisma = getPrismaClient();

async function cleanPublicContent(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "portfolio_media",
      "portfolio_projects",
      "services"
    RESTART IDENTITY CASCADE
  `;
}

function projectData(slug: string, isPublished: boolean) {
  return {
    challenge: "",
    isPublished,
    process: "",
    publishedAt: isPublished ? new Date("2026-09-10T00:00:00.000Z") : null,
    result: "",
    serviceLabel: "Prototyping",
    slug,
    summary: "Ringkasan.",
    title: `Proyek ${slug}`,
  };
}

beforeEach(cleanPublicContent);
afterAll(cleanPublicContent);

describe("portfolio public service against PostgreSQL", () => {
  it("lists only published records in approved editorial order", async () => {
    await seedApprovedPublicContent(prisma);
    await prisma.portfolioProject.create({ data: projectData("db-only-published", true) });
    await prisma.portfolioProject.create({ data: projectData("db-only-draft", false) });

    const result = await listPublishedPortfolioProjects();
    const slugs = result.map((project) => project.slug);
    const approvedSlugs = getApprovedPortfolioProjects().map((project) => project.slug);

    expect(slugs).toHaveLength(approvedSlugs.length + 1);
    expect(slugs).not.toContain("db-only-draft");
    expect(slugs.at(-1)).toBe("db-only-published");
    expect(slugs.slice(0, approvedSlugs.length)).toEqual(approvedSlugs);
  });

  it("does not inject approved curated projects that the database does not hold", async () => {
    await expect(listPublishedPortfolioProjects()).resolves.toEqual([]);
  });

  it("returns null for unknown and unpublished slugs, and the projection for a published slug", async () => {
    await prisma.portfolioProject.create({ data: projectData("db-only-draft", false) });
    await prisma.portfolioProject.create({ data: projectData("db-only-published", true) });

    await expect(findPublishedPortfolioProjectBySlug("tidak-ada")).resolves.toBeNull();
    await expect(findPublishedPortfolioProjectBySlug("db-only-draft")).resolves.toBeNull();
    await expect(findPublishedPortfolioProjectBySlug("db-only-published")).resolves.toMatchObject({
      slug: "db-only-published",
      title: "Proyek db-only-published",
    });
  });

  it("never exposes private storage keys in the public projection", async () => {
    const project = await prisma.portfolioProject.create({
      data: projectData("db-media", true),
    });
    await prisma.portfolioMedia.createMany({
      data: [
        { altText: "ok", projectId: project.id, sortOrder: 0, storageKey: "media/portfolio/cover-a.webp" },
        { altText: "private", projectId: project.id, sortOrder: 1, storageKey: "private/customer-files/secret.stl" },
      ],
    });

    const result = await findPublishedPortfolioProjectBySlug("db-media");

    expect(result?.media.map((media) => media.url)).toEqual([
      "/media/portfolio/cover-a.webp",
      undefined,
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("private/customer-files");
  });
});
