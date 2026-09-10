import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

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
}
