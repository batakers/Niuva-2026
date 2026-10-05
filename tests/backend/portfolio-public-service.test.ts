import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  findPublishedProjectBySlug: vi.fn(),
  listPublishedProjects: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // Pass-through so every call reaches the mocked repository (no memoization).
  return { ...actual, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn };
});
vi.mock("@/modules/portfolio/repository", () => ({
  PortfolioRepository: class {
    findPublishedProjectBySlug = repositoryMocks.findPublishedProjectBySlug;
    listPublishedProjects = repositoryMocks.listPublishedProjects;
  },
}));

import {
  findPublishedPortfolioProjectBySlug,
  listPublishedPortfolioProjects,
} from "@/modules/portfolio/public-service";
import { getApprovedPortfolioProjects } from "@/modules/portfolio/public-content";

type Row = {
  challenge: string;
  clientName: string | null;
  id: string;
  isFeatured: boolean;
  media: { altText: string; sortOrder: number; storageKey: string }[];
  process: string;
  result: string;
  serviceLabel: string;
  slug: string;
  summary: string;
  title: string;
};

function row(overrides: Partial<Row> = {}): Row {
  return {
    challenge: "",
    clientName: null,
    id: "project-1",
    isFeatured: false,
    media: [],
    process: "",
    result: "",
    serviceLabel: "Prototyping",
    slug: "unknown-db-only-project",
    summary: "Ringkasan.",
    title: "Proyek DB",
    ...overrides,
  };
}

beforeEach(() => {
  repositoryMocks.listPublishedProjects.mockReset();
  repositoryMocks.findPublishedProjectBySlug.mockReset();
});

describe("listPublishedPortfolioProjects", () => {
  it("returns only the records the repository reports as published", async () => {
    repositoryMocks.listPublishedProjects.mockResolvedValue([
      row({ id: "a", slug: "proyek-a", title: "A" }),
      row({ id: "b", slug: "proyek-b", title: "B" }),
    ]);

    const result = await listPublishedPortfolioProjects();

    expect(repositoryMocks.listPublishedProjects).toHaveBeenCalledTimes(1);
    expect(result.map((project) => project.slug).sort()).toEqual(["proyek-a", "proyek-b"]);
  });

  it("returns an empty list when nothing is published", async () => {
    repositoryMocks.listPublishedProjects.mockResolvedValue([]);
    await expect(listPublishedPortfolioProjects()).resolves.toEqual([]);
  });

  it("does not inject approved curated projects that the repository did not return", async () => {
    const curatedSlug = getApprovedPortfolioProjects()[0].slug;
    repositoryMocks.listPublishedProjects.mockResolvedValue([row({ slug: "only-this" })]);

    const result = await listPublishedPortfolioProjects();

    expect(result.map((project) => project.slug)).toEqual(["only-this"]);
    expect(result.map((project) => project.slug)).not.toContain(curatedSlug);
  });

  it("orders approved projects by editorial order and unknown ones last", async () => {
    const [first, second] = getApprovedPortfolioProjects();
    repositoryMocks.listPublishedProjects.mockResolvedValue([
      row({ id: "x", slug: "unknown-last" }),
      row({ id: "s", slug: second.slug }),
      row({ id: "f", slug: first.slug }),
    ]);

    const result = await listPublishedPortfolioProjects();

    expect(result.map((project) => project.slug)).toEqual([
      first.slug,
      second.slug,
      "unknown-last",
    ]);
  });

  it("never exposes private storage keys in the public projection", async () => {
    repositoryMocks.listPublishedProjects.mockResolvedValue([
      row({
        media: [
          { altText: "ok", sortOrder: 0, storageKey: "media/portfolio/cover-a.webp" },
          { altText: "private", sortOrder: 1, storageKey: "private/customer-files/secret.stl" },
          { altText: "traversal", sortOrder: 2, storageKey: "media/portfolio/../secret.png" },
        ],
      }),
    ]);

    const [project] = await listPublishedPortfolioProjects();

    expect(project.media.map((media) => media.url)).toEqual([
      "/media/portfolio/cover-a.webp",
      undefined,
      undefined,
    ]);
    const serialized = JSON.stringify(project);
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("private/customer-files");
    expect(serialized).not.toContain("secret");
  });

  it("omits blank challenge, process and result copy", async () => {
    repositoryMocks.listPublishedProjects.mockResolvedValue([
      row({ challenge: "   ", process: "", result: "\n" }),
    ]);

    const [project] = await listPublishedPortfolioProjects();

    expect(project.challenge).toBeUndefined();
    expect(project.process).toBeUndefined();
    expect(project.result).toBeUndefined();
  });
});

describe("findPublishedPortfolioProjectBySlug", () => {
  it("returns null when the slug is not published", async () => {
    repositoryMocks.findPublishedProjectBySlug.mockResolvedValue(null);

    await expect(findPublishedPortfolioProjectBySlug("tidak-ada")).resolves.toBeNull();
    expect(repositoryMocks.findPublishedProjectBySlug).toHaveBeenCalledWith("tidak-ada");
  });

  it("returns null even for an approved curated slug the repository does not publish", async () => {
    const curatedSlug = getApprovedPortfolioProjects()[0].slug;
    repositoryMocks.findPublishedProjectBySlug.mockResolvedValue(null);

    await expect(findPublishedPortfolioProjectBySlug(curatedSlug)).resolves.toBeNull();
  });

  it("maps a published record to the public projection without storage keys", async () => {
    repositoryMocks.findPublishedProjectBySlug.mockResolvedValue(
      row({
        id: "p1",
        isFeatured: true,
        media: [{ altText: "Cover", sortOrder: 0, storageKey: "media/portfolio/cover.png" }],
        slug: "db-only",
        title: "Proyek",
      }),
    );

    const result = await findPublishedPortfolioProjectBySlug("db-only");

    expect(result).toMatchObject({
      id: "p1",
      slug: "db-only",
      title: "Proyek",
      detailReadiness: "summary-only",
      media: [{ altText: "Cover", sortOrder: 0, url: "/media/portfolio/cover.png" }],
    });
    expect(JSON.stringify(result)).not.toContain("storageKey");
  });
});
