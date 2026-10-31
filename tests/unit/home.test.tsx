import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
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
import { StartingPoints, type StartingPath } from "@/app/home-starting-points";
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
  const projectLinks = (container: HTMLElement) => container.querySelectorAll('[data-home-section="project-proof"] a[href^="/projects/"]');

  it("lists no project links when no published detail is available", async () => {
    const { container } = render(await Home());
    expect(projectLinks(container)).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Lihat semua proyek" })).toHaveAttribute("href", "/projects");
  });

  it("lists projects from the published collection rather than a fixed slug", async () => {
    vi.mocked(getProjectPreview).mockResolvedValue({ projects: [published], scenario: null });
    const { container } = render(await Home());
    const links = projectLinks(container);
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", `/projects/${published.slug}`);
    expect(links[0]).toHaveTextContent(published.title);
  });

  it("sets a dashed project title as the work and its client on two lines, without the em dash", async () => {
    vi.mocked(getProjectPreview).mockResolvedValue({ projects: [{ ...published, title: "Smart Drop Box — P&G" }], scenario: null });
    const { container } = render(await Home());
    const [link] = projectLinks(container);
    expect(link).toHaveTextContent("Smart Drop Box");
    expect(link).toHaveTextContent("P&G");
    expect(link.textContent).not.toContain("—");
  });

  it("does not link card-only projects", async () => {
    vi.mocked(getProjectPreview).mockResolvedValue({ projects: [{ ...published, detailReadiness: "card-only" }], scenario: null });
    const { container } = render(await Home());
    expect(projectLinks(container)).toHaveLength(0);
  });

  it("keeps project photos off the homepage hero (Owner, 31 Oct 2026)", async () => {
    vi.mocked(getProjectPreview).mockResolvedValue({ projects: [published], scenario: null });
    const { container } = render(await Home());
    expect(container.querySelector('[data-home-section="hero"] a[href^="/projects/"]')).toBeNull();
  });

  it("uses time-based revalidation and no request-time connection() (Req 16.1)", async () => {
    render(await Home());
    expect(homeModule.revalidate).toBe(300);
    expect(connection).not.toHaveBeenCalled();
  });

  it("renders Niuva positioning, entry paths, starting points, process, and capabilities", async () => {
    render(await Home());

    expect(screen.getByRole("heading", { level: 1, name: "Mitra pengembangan produk dari riset hingga prototipe." })).toBeInTheDocument();
    expect(screen.getAllByText(/melalui riset, konsultasi, desain, dan prototyping/i).length).toBeGreaterThan(0);
    const entryPaths = screen.getByRole("navigation", { name: "Titik mulai" });
    expect(entryPaths.querySelectorAll("a")).toHaveLength(3);
    expect(entryPaths.querySelector('a[href="/services"]')).not.toBeNull();
    expect(entryPaths.querySelector('a[href="/custom-print"]')).not.toBeNull();
    expect(entryPaths.querySelector('a[href="/shop"]')).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Punya ide atau proyek?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dari ide menjadi produk nyata." })).toBeInTheDocument();
    for (const stage of ["Ide", "Desain", "Prototipe", "Produk jadi"]) {
      expect(screen.getByRole("heading", { level: 3, name: stage })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Empat layanan untuk setiap tahap proyek." })).toBeInTheDocument();
    expect(screen.getAllByText("Estimasi awal, bukan harga final", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Hubungi Kami" }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-homepage] .font-mono")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .font-technical")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .uppercase")).toHaveLength(0);
  });

  it("switches one starting point at a time with pressed option chips", async () => {
    render(await Home());
    const chooser = screen.getByRole("group", { name: "Pilih titik mulai" });
    const chip = (name: string) => within(chooser).getByRole("button", { name });
    expect(chip("Ide atau proyek")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Sudah punya model 3D?" })).toBeNull();

    fireEvent.click(chip("Model 3D"));
    expect(chip("Model 3D")).toHaveAttribute("aria-pressed", "true");
    expect(chip("Ide atau proyek")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { name: "Sudah punya model 3D?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Punya ide atau proyek?" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ajukan untuk Review" })).toHaveAttribute("href", "/custom-print");

    fireEvent.click(chip("Produk siap pakai"));
    expect(screen.getByRole("heading", { name: "Cari produk siap pakai?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat Toko" })).toHaveAttribute("href", "/shop");
  });

  it("lists every starting point and hides the chips before hydration or without JavaScript", () => {
    const paths: StartingPath[] = ["Satu", "Dua", "Tiga"].map((title) => ({
      id: title, label: title, title: `${title}?`, description: `Uraian ${title}`,
      action: <a href={`/${title}`}>Buka {title}</a>, image: "/assets/mascot/niuva-mascot-halo.webp", alt: `Maskot ${title}`, notes: null,
    }));
    const markup = new DOMParser().parseFromString(renderToString(<StartingPoints paths={paths} />), "text/html");
    expect(markup.querySelector('[role="group"]')?.hasAttribute("hidden")).toBe(true);
    expect([...markup.querySelectorAll("h3")].map((heading) => heading.textContent)).toEqual(["Satu?", "Dua?", "Tiga?"]);
    expect(markup.querySelectorAll("h3[hidden], div[hidden] > h3")).toHaveLength(0);
  });
});
