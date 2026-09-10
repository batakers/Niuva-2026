import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

import Home from "@/app/page";

describe("public homepage", () => {
  it("renders Niuva positioning, entry paths, capabilities, and process", async () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: /mitra pengembangan produk dari riset hingga prototipe/i })).toBeInTheDocument();
    expect(screen.getAllByText(/melalui riset, konsultasi, desain, dan prototyping/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Punya ide atau project?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sudah punya model 3D?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mau produk siap beli?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kompetensi yang menghubungkan ide dengan bentuk." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Satu alur kerja untuk keputusan yang lebih jelas." })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Diskusikan Proyek/ }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-homepage] .font-mono")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .font-technical")).toHaveLength(0);
    expect(document.querySelectorAll("[data-homepage] .uppercase")).toHaveLength(0);
  });
});
