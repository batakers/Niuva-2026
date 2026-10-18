import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/features/frontend-preview/server", () => ({
  getProjectPreview: vi.fn(async () => ({ projects: [], scenario: null })),
}));

import { connection } from "next/server";
vi.mock("@/modules/site-information/public-reader", async () => ({ getPublicSiteInformation: async () => (await import("@/modules/site-information/defaults")).defaultSiteInformation }));
import Home, * as homeModule from "@/app/page";
import { getProjectPreview } from "@/features/frontend-preview/server";
import type { ProjectPreviewItem } from "@/features/frontend-preview/types";

beforeEach(() => vi.mocked(getProjectPreview).mockResolvedValue({ projects: [], scenario: null }));

const published: ProjectPreviewItem = {
  id: "project-test", slug: "proyek-yang-terbit", title: "Proyek yang terbit",
  summary: "Ringkasan bukti proyek", serviceLabel: "Design & Prototyping",
  clientName: null, year: null, tags: [], detailReadiness: "summary-only",
  media: [{ altText: "Artefak proyek yang terbit", sortOrder: 0, url: "/media/portfolio/published.png" }],
};

describe("public homepage", () => {
  it("does not keep a hero project link when no published detail is available", async () => {
    const { container } = render(await Home());
    expect(container.querySelector('[data-home-section="hero"] a[href^="/projects/"]')).toBeNull();
  });

  it("selects the hero from the published collection rather than a fixed slug", async () => {
    vi.mocked(getProjectPreview).mockResolvedValue({ projects: [published], scenario: null });
    const { container } = render(await Home());
    const link = container.querySelector('[data-home-section="hero"] a[href^="/projects/"]');
    expect(link).toHaveAttribute("href", `/projects/${published.slug}`);
    expect(link).toHaveTextContent(published.title);
  });

  it("does not link card-only projects from the hero", async () => {
    vi.mocked(getProjectPreview).mockResolvedValue({ projects: [{ ...published, detailReadiness: "card-only" }], scenario: null });
    const { container } = render(await Home());
    expect(container.querySelector('[data-home-section="hero"] a[href^="/projects/"]')).toBeNull();
  });
  it("uses time-based revalidation and no request-time connection() (Req 16.1)", async () => {
    render(await Home());
    expect(homeModule.revalidate).toBe(300);
    expect(connection).not.toHaveBeenCalled();
  });

  it("renders Niuva positioning, entry paths, capabilities, and process", async () => {
    render(await Home());

    expect(screen.getByRole("heading", { level: 1, name: /mitra pengembangan produk dari riset hingga prototipe/i })).toBeInTheDocument();
    expect(screen.getAllByText(/melalui riset, konsultasi, desain, dan prototyping/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Punya ide atau project?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ingin membuat dari model atau referensi?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mau produk siap beli?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kompetensi yang menghubungkan ide dengan bentuk." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Satu alur kerja untuk keputusan yang lebih jelas." })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Hubungi Kami" }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-homepage] .font-mono")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .font-technical")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .uppercase")).toHaveLength(0);
  });
});
