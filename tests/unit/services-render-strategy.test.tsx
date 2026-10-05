import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectPreviewItem } from "@/features/frontend-preview/types";

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  revalidatePath: vi.fn(),
  replaceMedia: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/components/niuva/public-shell", () => ({
  PublicShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/modules/portfolio/public-service", () => ({
  listPublishedPortfolioProjects: mocks.listProjects,
}));
vi.mock("@/modules/portfolio/service", () => ({
  PortfolioService: class {
    updateProject = mocks.updateProject;
    replaceMedia = mocks.replaceMedia;
  },
}));

import * as serviceModule from "@/app/services/[slug]/page";
import { replacePortfolioMediaAction, updatePortfolioAction } from "@/app/admin/actions";
import { publicServices } from "@/features/public/company-content";

const service = publicServices[0];
if (!service) throw new Error("Expected a public service fixture");

function project(overrides: Partial<ProjectPreviewItem> = {}): ProjectPreviewItem {
  return {
    id: "related-project",
    slug: "related-project",
    title: "Related project fixture",
    summary: "Fixture for service portfolio filtering",
    serviceLabel: service.title,
    clientName: null,
    year: null,
    tags: [],
    detailReadiness: "summary-only",
    media: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listProjects.mockResolvedValue([]);
  mocks.updateProject.mockResolvedValue(undefined);
  mocks.replaceMedia.mockResolvedValue(undefined);
});

describe("/services/[slug] ISR strategy (RK-16; Req 16.1, 16.8)", () => {
  it("uses revalidate 300 and prerenders every known service slug", () => {
    expect(serviceModule.revalidate).toBe(300);
    expect(serviceModule.generateStaticParams()).toEqual(
      publicServices.map(({ slug }) => ({ slug })),
    );
    expect(serviceModule.generateStaticParams().length).toBeGreaterThan(0);
  });

  it("does not read request-time APIs in the public route", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/services/[slug]/page.tsx"), "utf8")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/searchParams|connection\s*\(|cookies\s*\(|headers\s*\(/);
  });

  it("keeps service content available when the portfolio database fails", async () => {
    mocks.listProjects.mockRejectedValueOnce(new Error("db unavailable fixture"));
    render(await serviceModule.default({ params: Promise.resolve({ slug: service.slug }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(service.title);
    expect(screen.getByText(/Detail project terkait belum tersedia/)).toBeInTheDocument();
    expect(screen.queryByText("db unavailable fixture")).not.toBeInTheDocument();
    expect(mocks.listProjects).toHaveBeenCalledTimes(1);
  });

  it("only links detail-ready projects from the matching service and caps the list at three", async () => {
    mocks.listProjects.mockResolvedValueOnce([
      project(),
      project({ slug: "card-only", id: "card-only", detailReadiness: "card-only" }),
      project({ slug: "other-service", id: "other-service", serviceLabel: "Other service" }),
      ...[2, 3, 4].map((number) => project({ slug: `related-${number}`, id: `related-${number}` })),
    ]);
    render(await serviceModule.default({ params: Promise.resolve({ slug: service.slug }) }));
    const links = screen.getAllByRole("link", { name: "Lihat project" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/projects/related-project", "/projects/related-2", "/projects/related-3",
    ]);
    expect(screen.queryByText(/Detail project terkait belum tersedia/)).not.toBeInTheDocument();
  });

  it("calls notFound for unknown slugs before reading portfolio data", async () => {
    await expect(serviceModule.default({ params: Promise.resolve({ slug: "unknown-service-fixture" }) }))
      .rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
    expect(mocks.listProjects).not.toHaveBeenCalled();
    expect(await serviceModule.generateMetadata({ params: Promise.resolve({ slug: "unknown-service-fixture" }) }))
      .toMatchObject({ robots: { index: false, follow: false } });
  });
});

describe("portfolio Server Actions invalidate service ISR alongside project pages (Req 16.2)", () => {
  it.each(["update", "media"] as const)("invalidates service pages after a successful %s action", async (kind) => {
    const data = new FormData();
    data.set("projectId", "project-fixture");
    data.set("mediaJson", "[]");
    const action = kind === "update" ? updatePortfolioAction : replacePortfolioMediaAction;
    expect(await action({ status: "idle" }, data)).toMatchObject({ status: "success" });
    expect(kind === "update" ? mocks.updateProject : mocks.replaceMedia).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/projects");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/projects/[slug]", "page");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/services/[slug]", "page");
  });

  it.each(["update", "media"] as const)("does not invalidate pages when the %s action fails", async (kind) => {
    const data = new FormData();
    data.set("projectId", "project-fixture");
    data.set("mediaJson", "[]");
    const operation = kind === "update" ? mocks.updateProject : mocks.replaceMedia;
    operation.mockRejectedValueOnce(new Error("mutation failed fixture"));
    const action = kind === "update" ? updatePortfolioAction : replacePortfolioMediaAction;
    expect(await action({ status: "idle" }, data)).toMatchObject({ status: "error" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
