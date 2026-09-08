import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminPortfolioEditor } from "@/features/admin/portfolio-editor";

describe("admin portfolio editor preview", () => {
  it("keeps publication intent disabled until all local permission confirmations are complete", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<AdminPortfolioEditor initialScenario="ready" initialSelectedProject="PORTFOLIO-EX-MODULAR" />);

    const publication = await screen.findByRole("button", { name: "Uji intent publikasi" });
    expect(publication).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: "Izin penggunaan nama client telah diverifikasi" }));
    fireEvent.click(screen.getByRole("switch", { name: "Izin penggunaan logo client telah diverifikasi" }));
    fireEvent.click(screen.getByRole("switch", { name: "Bukti hasil faktual telah diverifikasi" }));
    expect(publication).toBeEnabled();
    fireEvent.click(publication);

    expect(screen.getByText("Intent publikasi preview dicatat lokal")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
