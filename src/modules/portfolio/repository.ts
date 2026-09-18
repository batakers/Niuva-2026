import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import type {
  ReplacePortfolioMediaInput,
  UpdatePortfolioProjectInput,
} from "./schema";
import { isApprovedCardOnlyPortfolioProject } from "./public-content";

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
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.portfolioProject.findUnique({
        where: { id: projectId },
        select: {
          _count: { select: { media: true } },
          challenge: true,
          id: true,
          isFeatured: true,
          isPublished: true,
          process: true,
          publishedAt: true,
          result: true,
          serviceLabel: true,
          slug: true,
          summary: true,
          title: true,
        },
      });

      if (current === null) {
        throw appError("NOT_FOUND");
      }

      const candidate = { ...current, ...input };
      if (candidate.isPublished) {
        assertPublishable(
          candidate,
          current._count.media,
          isApprovedCardOnlyPortfolioProject(candidate),
        );
      }

      const data = {
        ...input,
        ...(input.isPublished === false
          ? { publishedAt: null }
          : input.isPublished === true && !current.isPublished
            ? { publishedAt: new Date() }
            : {}),
      };
      return transaction.portfolioProject.update({
        where: { id: projectId },
        data,
        select: { id: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async replaceMedia(
    projectId: string,
    items: ReplacePortfolioMediaInput["items"],
  ): Promise<Readonly<{ projectId: string; mediaCount: number }>> {
    return this.prisma.$transaction(async (transaction) => {
      const project = await transaction.portfolioProject.findUnique({
        where: { id: projectId },
        select: { id: true, isFeatured: true, isPublished: true, slug: true },
      });
      if (project === null) {
        throw appError("NOT_FOUND");
      }
      if (
        project.isPublished &&
        items.length === 0 &&
        !isApprovedCardOnlyPortfolioProject(project)
      ) {
        throw appError("VALIDATION_ERROR", {
          details: { items: "Portfolio terbit harus memiliki minimal satu media." },
        });
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

function assertPublishable(
  project: Readonly<{
    challenge: string;
    process: string;
    result: string;
    serviceLabel: string;
    slug: string;
    summary: string;
    title: string;
  }>,
  mediaCount: number,
  cardOnly: boolean,
): void {
  const requiredFields: readonly [
    "title" | "slug" | "summary" | "challenge" | "process" | "result" | "serviceLabel",
    string,
  ][] = cardOnly
    ? [
        ["title", "Judul"],
        ["slug", "Slug"],
        ["summary", "Ringkasan"],
        ["serviceLabel", "Layanan"],
      ]
    : [
        ["title", "Judul"],
        ["slug", "Slug"],
        ["summary", "Ringkasan"],
        ["challenge", "Tantangan"],
        ["process", "Proses"],
        ["result", "Hasil"],
        ["serviceLabel", "Layanan"],
      ];
  const missing = requiredFields
    .filter(([key]) => project[key].trim() === "")
    .map(([, label]) => label);
  if (missing.length > 0 || (!cardOnly && mediaCount === 0)) {
    throw appError("VALIDATION_ERROR", {
      details: {
        publish: missing.length > 0
          ? `Lengkapi ${missing.join(", ")} sebelum publish.`
          : "Tambahkan minimal satu media sebelum publish.",
      },
    });
  }
}
