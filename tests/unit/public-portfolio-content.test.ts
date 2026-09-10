import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { publicCompanyProfile, publicServices } from "@/features/public/company-content";
import { curatedFeaturedProjects } from "@/features/frontend-preview/curated-content";
import { getApprovedPortfolioProjects } from "@/modules/portfolio/public-content";
import { seedApprovedPublicContent } from "@/modules/portfolio/seed-approved-public-content";

type UpsertInput = Readonly<{
  create: Record<string, unknown>;
  update: Record<string, unknown>;
  where: Record<string, unknown>;
}>;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("approved public content", () => {
  it("keeps company contact, official service titles, and editorial project coverage together", () => {
    expect(publicCompanyProfile.contact).toMatchObject({
      email: "niuvamakerspace@gmail.com",
      phone: "+62 851-1767-8901",
    });
    expect(publicServices.map((service) => service.title)).toEqual([
      "Research & Development",
      "Consultant & Workshop",
      "Design & Prototyping",
      "Apparel & Merchandise",
    ]);

    const projects = getApprovedPortfolioProjects();
    expect(projects).toHaveLength(17);
    expect(projects.filter((project) => project.isFeatured)).toHaveLength(6);
    expect(projects.filter((project) => project.detailReadiness === "card-only")).toHaveLength(11);
  });

  it("ships byte-identical copies of only the six approved fallback covers", () => {
    for (const project of curatedFeaturedProjects) {
      const source = resolve(process.cwd(), project.cover.internalPath);
      const publicAsset = resolve(process.cwd(), "public", project.cover.publicPath.slice(1));

      expect(existsSync(publicAsset)).toBe(true);
      expect(sha256(publicAsset)).toBe(sha256(source));
    }

    expect(
      existsSync(resolve(process.cwd(), "public/media/portfolio/featured-cover-contact-sheet.png")),
    ).toBe(false);
  });

  it("uses upserts for the approved content seed without deleting unrelated records", async () => {
    const serviceUpserts: UpsertInput[] = [];
    const projectUpserts: UpsertInput[] = [];
    const mediaUpserts: UpsertInput[] = [];

    const transactionClient = {
      portfolioMedia: {
        async upsert(input: UpsertInput) {
          mediaUpserts.push(input);
          return { id: `media-${mediaUpserts.length}` };
        },
      },
      portfolioProject: {
        async upsert(input: UpsertInput) {
          projectUpserts.push(input);
          const slug = input.where.slug;
          if (typeof slug !== "string") {
            throw new Error("Fixture seed menerima slug project yang tidak valid.");
          }
          return { id: `project-${slug}` };
        },
      },
      service: {
        async upsert(input: UpsertInput) {
          serviceUpserts.push(input);
          return { id: `service-${serviceUpserts.length}` };
        },
      },
    };

    const prisma = {
      async $transaction<T>(callback: (client: typeof transactionClient) => Promise<T>) {
        return callback(transactionClient);
      },
    } as unknown as PrismaClient;

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

    expect(serviceUpserts).toHaveLength(8);
    expect(projectUpserts).toHaveLength(34);
    expect(mediaUpserts).toHaveLength(12);
    expect(projectUpserts[0]?.create).toMatchObject({
      isFeatured: true,
      isPublished: true,
      slug: "smart-drop-box-pg",
    });
    expect(mediaUpserts[0]?.create).toMatchObject({
      storageKey: "media/portfolio/cs-01-smart-drop-box.png",
    });
  });
});
