import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import type {
  ReplacePortfolioMediaInput,
  UpdatePortfolioProjectInput,
} from "./schema";

export class PortfolioRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async listPublishedProjects() {
    return this.prisma.portfolioProject.findMany({
      where: { isPublished: true },
      orderBy: [
        { isFeatured: "desc" },
        { publishedAt: "desc" },
        { title: "asc" },
      ],
      select: {
        challenge: true,
        clientName: true,
        id: true,
        isFeatured: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: {
            altText: true,
            sortOrder: true,
            storageKey: true,
          },
        },
        process: true,
        result: true,
        serviceLabel: true,
        slug: true,
        summary: true,
        title: true,
      },
    });
  }

  async findPublishedProjectBySlug(slug: string) {
    return this.prisma.portfolioProject.findFirst({
      where: {
        isPublished: true,
        slug,
      },
      select: {
        challenge: true,
        clientName: true,
        id: true,
        isFeatured: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: {
            altText: true,
            sortOrder: true,
            storageKey: true,
          },
        },
        process: true,
        result: true,
        serviceLabel: true,
        slug: true,
        summary: true,
        title: true,
      },
    });
  }

  async listPublishedServices() {
    return this.prisma.service.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        slug: true,
        summary: true,
        title: true,
      },
    });
  }

  async findAdminProjectById(projectId: string) {
    return this.prisma.portfolioProject.findUnique({
      where: { id: projectId },
      select: {
        challenge: true,
        clientName: true,
        id: true,
        isFeatured: true,
        isPublished: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: { altText: true, sortOrder: true, storageKey: true },
        },
        process: true,
        result: true,
        serviceLabel: true,
        slug: true,
        summary: true,
        title: true,
      },
    });
  }

  async updateProject(projectId: string, input: UpdatePortfolioProjectInput) {
    const data = {
      ...input,
      ...(input.isPublished === true ? { publishedAt: new Date() } : {}),
      ...(input.isPublished === false ? { publishedAt: null } : {}),
    };
    return this.prisma.portfolioProject.update({
      where: { id: projectId },
      data,
      select: { id: true },
    });
  }

  async replaceMedia(
    projectId: string,
    items: ReplacePortfolioMediaInput["items"],
  ): Promise<Readonly<{ projectId: string; mediaCount: number }>> {
    return this.prisma.$transaction(async (transaction) => {
      const project = await transaction.portfolioProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (project === null) {
        throw appError("NOT_FOUND");
      }
      await transaction.portfolioMedia.deleteMany({ where: { projectId } });
      if (items.length > 0) {
        await transaction.portfolioMedia.createMany({
          data: items.map((item) => ({
            altText: item.altText,
            projectId,
            sortOrder: item.sortOrder,
            storageKey: item.storageKey,
          })),
        });
      }
      return { projectId: project.id, mediaCount: items.length };
    });
  }
}
