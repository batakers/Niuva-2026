import type { PrismaClient } from "@/generated/prisma/client";
import { publicServices } from "../../features/public/company-content";
import { getApprovedPortfolioProjects } from "./public-content";

const CONTENT_APPROVAL_DATE = new Date("2026-09-10T00:00:00.000Z");

export type ApprovedPublicContentSeedResult = Readonly<{
  media: number;
  projects: number;
  services: number;
}>;

/**
 * Upserts only owner-approved public content. It intentionally does not
 * delete unrelated admin-managed records or activate any commerce data.
 */
export async function seedApprovedPublicContent(
  prisma: PrismaClient,
): Promise<ApprovedPublicContentSeedResult> {
  return prisma.$transaction(async (tx) => {
    for (const [sortOrder, service] of publicServices.entries()) {
      await tx.service.upsert({
        where: { slug: service.slug },
        create: {
          body: service.websiteFraming,
          isPublished: true,
          slug: service.slug,
          sortOrder,
          summary: service.sourceScope,
          title: service.title,
        },
        update: {
          body: service.websiteFraming,
          isPublished: true,
          sortOrder,
          summary: service.sourceScope,
          title: service.title,
        },
      });
    }

    const projects = getApprovedPortfolioProjects();
    let media = 0;

    for (const project of projects) {
      const persisted = await tx.portfolioProject.upsert({
        where: { slug: project.slug },
        create: {
          challenge: project.challenge ?? "",
          clientName: project.clientName,
          isFeatured: project.isFeatured,
          isPublished: true,
          process: project.process ?? "",
          publishedAt: CONTENT_APPROVAL_DATE,
          result: project.result ?? project.summary,
          serviceLabel: project.serviceLabel,
          slug: project.slug,
          summary: project.summary,
          title: project.title,
        },
        update: {
          challenge: project.challenge ?? "",
          clientName: project.clientName,
          isFeatured: project.isFeatured,
          isPublished: true,
          process: project.process ?? "",
          publishedAt: CONTENT_APPROVAL_DATE,
          result: project.result ?? project.summary,
          serviceLabel: project.serviceLabel,
          summary: project.summary,
          title: project.title,
        },
      });

      for (const item of project.media) {
        await tx.portfolioMedia.upsert({
          where: {
            projectId_sortOrder: {
              projectId: persisted.id,
              sortOrder: item.sortOrder,
            },
          },
          create: {
            altText: item.altText,
            projectId: persisted.id,
            sortOrder: item.sortOrder,
            storageKey: item.storageKey,
          },
          update: {
            altText: item.altText,
            storageKey: item.storageKey,
          },
        });
        media += 1;
      }
    }

    return {
      media,
      projects: projects.length,
      services: publicServices.length,
    };
  });
}
