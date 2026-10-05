import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // Pass-through so each call reads PostgreSQL (no per-request memoization).
  return { ...actual, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn };
});

import { getProjectPreview, getProjectPreviewBySlug } from "@/features/frontend-preview/server";
import { getPrismaClient } from "@/lib/db/prisma";
import { getApprovedPortfolioProjects } from "@/modules/portfolio/public-content";
import { resolvePublicContentSource } from "@/modules/portfolio/public-source";
import { seedApprovedPublicContent } from "@/modules/portfolio/seed-approved-public-content";

// Req 15.3: `/` and `/projects` read through getProjectPreview, and
// `/projects/[slug]` through getProjectPreviewBySlug. The production tier must
// select the database source, so these calls are exercised with the tier set to
// production against PostgreSQL.

const prisma = getPrismaClient();
const PUBLISHED_SLUG = "db-only-published";
const DRAFT_SLUG = "db-only-draft";

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

async function seedDatabase(): Promise<void> {
  await seedApprovedPublicContent(prisma);
  await prisma.portfolioProject.create({ data: projectData(PUBLISHED_SLUG, true) });
  await prisma.portfolioProject.create({ data: projectData(DRAFT_SLUG, false) });
}

beforeEach(async () => {
  await cleanPublicContent();
  vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
});
afterEach(() => {
  vi.unstubAllEnvs();
});
afterAll(cleanPublicContent);

describe("public content production path against PostgreSQL", () => {
  it("selects the database source in production even when a preview parameter is sent", () => {
    expect(resolvePublicContentSource(undefined)).toBe("database");
    expect(resolvePublicContentSource("examples")).toBe("database");
  });

  it("lists published database records for `/` and `/projects` without a scenario", async () => {
    await seedDatabase();
    const approvedSlugs = getApprovedPortfolioProjects().map((project) => project.slug);

    const { projects, scenario } = await getProjectPreview(undefined);

    expect(scenario).toBeNull();
    expect(projects.map((project) => project.slug)).toEqual([...approvedSlugs, PUBLISHED_SLUG]);
    expect(projects.map((project) => project.slug)).not.toContain(DRAFT_SLUG);
  });

  it("does not fall back to local content when the database holds no published project", async () => {
    await expect(getProjectPreview(undefined)).resolves.toEqual({ projects: [], scenario: null });
    await expect(getProjectPreviewBySlug(approvedSlug(), undefined)).resolves.toEqual({
      project: null,
      scenario: null,
    });
  });

  it("ignores `?preview=` fixtures in production", async () => {
    await seedDatabase();

    const list = await getProjectPreview("examples");
    const detail = await getProjectPreviewBySlug(PUBLISHED_SLUG, "examples");

    expect(list.scenario).toBeNull();
    expect(list.projects.map((project) => project.slug)).toContain(PUBLISHED_SLUG);
    expect(detail.scenario).toBeNull();
    expect(detail.project?.slug).toBe(PUBLISHED_SLUG);
  });

  it("resolves `/projects/[slug]` for a published slug and null for draft or unknown slugs", async () => {
    await seedDatabase();

    const published = await getProjectPreviewBySlug(PUBLISHED_SLUG, undefined);
    expect(published.scenario).toBeNull();
    expect(published.project).toMatchObject({
      slug: PUBLISHED_SLUG,
      title: `Proyek ${PUBLISHED_SLUG}`,
    });

    await expect(getProjectPreviewBySlug(DRAFT_SLUG, undefined)).resolves.toEqual({
      project: null,
      scenario: null,
    });
    await expect(getProjectPreviewBySlug("tidak-ada", undefined)).resolves.toEqual({
      project: null,
      scenario: null,
    });
  });

  it("does not change the result when only NODE_ENV changes", async () => {
    await seedDatabase();
    vi.stubEnv("NODE_ENV", "production");
    const underProduction = (await getProjectPreview(undefined)).projects.map((p) => p.slug);
    vi.stubEnv("NODE_ENV", "test");
    const underTest = (await getProjectPreview(undefined)).projects.map((p) => p.slug);

    expect(underTest).toEqual(underProduction);
    expect(underTest).toContain(PUBLISHED_SLUG);
  });
});

function approvedSlug(): string {
  return getApprovedPortfolioProjects()[0]!.slug;
}
