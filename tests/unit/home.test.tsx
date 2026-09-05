import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

import Home from "@/app/page";

describe("public homepage", () => {
  it("renders Niuva positioning, entry paths, capabilities, and process", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: /dari ide menjadi produk nyata/i })).toBeInTheDocument();
    expect(screen.getByText(/mitra inovasi dan pengembangan produk end-to-end/i)).toBeInTheDocument();
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
