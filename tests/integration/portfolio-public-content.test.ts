import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getPrismaClient } from "@/lib/db/prisma";
import { PortfolioRepository } from "@/modules/portfolio/repository";
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

beforeEach(cleanPublicContent);
afterAll(cleanPublicContent);

describe("approved public-content seed", () => {
  it("upserts the approved portfolio and exposes only published records through the repository", async () => {
    await expect(seedApprovedPublicContent(prisma)).resolves.toEqual({
      media: 6,
      projects: 17,
      services: 4,
    });
    await expect(seedApprovedPublicContent(prisma)).resolves.toEqual({
      media: 6,
      projects: 17,
      services: 4,
    });

    await expect(prisma.service.count({ where: { isPublished: true } })).resolves.toBe(4);
    await expect(prisma.portfolioProject.count({ where: { isPublished: true } })).resolves.toBe(17);
    await expect(prisma.portfolioMedia.count()).resolves.toBe(6);

    const repository = new PortfolioRepository(prisma);
    await expect(repository.listPublishedProjects()).resolves.toHaveLength(17);
    await expect(
      repository.findPublishedProjectBySlug("smart-drop-box-pg"),
    ).resolves.toMatchObject({
      clientName: "P&G",
      slug: "smart-drop-box-pg",
    });

  });

  it("keeps the Owner-approved Selected Works cards publishable without media", async () => {
    await seedApprovedPublicContent(prisma);
    const project = await prisma.portfolioProject.findUnique({
      where: { slug: "waste-based-product" },
      select: { id: true },
    });
    expect(project).not.toBeNull();

    const repository = new PortfolioRepository(prisma);
    await expect(repository.replaceMedia(project!.id, [])).resolves.toEqual({
      mediaCount: 0,
      projectId: project!.id,
    });
    await expect(repository.updateProject(project!.id, { isPublished: false })).resolves.toEqual({
      id: project!.id,
    });
    await expect(repository.updateProject(project!.id, { isPublished: true })).resolves.toEqual({
      id: project!.id,
    });
    await expect(
      prisma.portfolioProject.findUnique({
        where: { id: project!.id },
        select: { isPublished: true },
      }),
    ).resolves.toEqual({ isPublished: true });
  });

  it("keeps the media requirement for featured case studies", async () => {
    await seedApprovedPublicContent(prisma);
    const project = await prisma.portfolioProject.findUnique({
      where: { slug: "smart-drop-box-pg" },
      select: { id: true },
    });
    expect(project).not.toBeNull();

    const repository = new PortfolioRepository(prisma);
    await expect(repository.updateProject(project!.id, { isPublished: false })).resolves.toEqual({
      id: project!.id,
    });
    await expect(repository.replaceMedia(project!.id, [])).resolves.toEqual({
      mediaCount: 0,
      projectId: project!.id,
    });
    await expect(repository.updateProject(project!.id, { isPublished: true })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
