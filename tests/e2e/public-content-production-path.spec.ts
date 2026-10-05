import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import { PrismaClient } from "../../src/generated/prisma/client";

// Req 15.3 / 15.8: `/`, `/projects`, and `/projects/[slug]` on the production
// content path (database source). The default dev server runs the local-test
// tier and serves the local reference, so this spec only runs against a server
// started with NIUVA_DEPLOYMENT_TIER=production:
//
//   NIUVA_DEPLOYMENT_TIER=production NIUVA_E2E_PORT=3101 \
//     corepack pnpm exec playwright test tests/e2e/public-content-production-path.spec.ts
//
// The DB-only project below exists only in PostgreSQL, so seeing it proves the
// pages read the database rather than the local reference.
const productionTier = process.env.NIUVA_DEPLOYMENT_TIER?.trim().toLowerCase() === "production";
const PUBLISHED_SLUG = "e2e-db-only-published";
const DRAFT_SLUG = "e2e-db-only-draft";

function connectionString(): string {
  const localEnvPath = resolve(".env.test.local");
  if (!process.env.TEST_DATABASE_URL && existsSync(localEnvPath)) process.loadEnvFile(localEnvPath);
  const value = process.env.TEST_DATABASE_URL ??
    (process.env.CI ? "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public" : "");
  const url = new URL(value);
  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/(^|[-_])test([-_]|$)/i.test(databaseName)) {
    throw new Error("Spec ini hanya boleh memakai PostgreSQL test di loopback.");
  }
  return value;
}

function projectData(slug: string, isPublished: boolean) {
  return {
    challenge: "Tantangan E2E.",
    isFeatured: true,
    isPublished,
    process: "Proses E2E.",
    publishedAt: isPublished ? new Date("2026-09-10T00:00:00.000Z") : null,
    result: "Hasil E2E.",
    serviceLabel: "Prototyping",
    slug,
    summary: "Ringkasan khusus database.",
    title: `Proyek ${slug}`,
  };
}

test.describe("public content production path", () => {
  test.skip(!productionTier, "Butuh server dengan NIUVA_DEPLOYMENT_TIER=production.");

  let prisma: PrismaClient;

  test.beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString(), max: 1 }) });
    await prisma.portfolioProject.deleteMany({ where: { slug: { in: [PUBLISHED_SLUG, DRAFT_SLUG] } } });
    await prisma.portfolioProject.create({ data: projectData(PUBLISHED_SLUG, true) });
    await prisma.portfolioProject.create({ data: projectData(DRAFT_SLUG, false) });
  });

  test.afterAll(async () => {
    await prisma.portfolioProject.deleteMany({ where: { slug: { in: [PUBLISHED_SLUG, DRAFT_SLUG] } } });
    await prisma.$disconnect();
  });

  test("/projects lists database records and hides drafts", async ({ page }) => {
    const response = await page.goto("/projects");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(`a[href="/projects/${PUBLISHED_SLUG}"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="/projects/${DRAFT_SLUG}"]`)).toHaveCount(0);
  });

  test("/projects ignores ?preview= fixtures", async ({ page }) => {
    await page.goto("/projects?preview=examples");
    // Fixture mode would link detail pages with ?preview=examples.
    await expect(page.locator('a[href*="/projects/"][href*="preview="]')).toHaveCount(0);
    await expect(page.locator(`a[href="/projects/${PUBLISHED_SLUG}"]`).first()).toBeVisible();
  });

  test("/projects/[slug] renders a published database project", async ({ page }) => {
    const response = await page.goto(`/projects/${PUBLISHED_SLUG}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: `Proyek ${PUBLISHED_SLUG}` })).toBeVisible();
    await expect(page.getByText("Ringkasan khusus database.")).toBeVisible();
  });

  test("/projects/[slug] returns 404 for draft and unknown slugs", async ({ page }) => {
    for (const slug of [DRAFT_SLUG, "tidak-ada-e2e"]) {
      const response = await page.goto(`/projects/${slug}`);
      expect(response?.status()).toBe(404);
    }
  });

  test("/ renders the company narrative with database-backed project proof", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[data-home-section="project-proof"]')).toBeVisible();
    await expect(page.locator('[data-home-section="project-proof"] a[href^="/projects/"]').first()).toBeVisible();
  });
});
