import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("public homepage", () => {
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
    expect(screen.getAllByRole("link", { name: /Diskusikan Proyek/ }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-homepage] .font-mono")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .font-technical")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .uppercase")).toHaveLength(0);
  });
});
