import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminQuoteEditor } from "@/features/admin/quote-editor";
import { calculatePreviewQuote } from "@/features/admin/quote-preview-data";

describe("admin quote draft preview", () => {
  it("reuses the Decimal pricing contract for the approved development fixture", () => {
    const calculation = calculatePreviewQuote("NIUVA_STOCK");

    expect(calculation.materialSubtotalRp).toBe("Rp256.800");
    expect(calculation.machineSubtotalRp).toBe("Rp30.000");
    expect(calculation.unroundedTotalRp).toBe("Rp286.800");
    expect(calculation.finalTotalRp).toBe("Rp286.800");
  });

  it("blocks a draft when the active pricing rule is unavailable", async () => {
    render(<AdminQuoteEditor initialScenario="rule-missing" initialSelectedReference="QTE-EX-3028" />);

    expect(await screen.findByText("Pricing rule aktif tidak tersedia")).toBeVisible();
    expect(screen.getByText("Rincian belum tersedia")).toBeVisible();
    expect(screen.getByRole("button", { name: "Kirim quote preview" })).toBeDisabled();
  });

  it("freezes the sent preview snapshot without a network mutation", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<AdminQuoteEditor initialScenario="ready" initialSelectedReference="QTE-EX-3028" />);

    const source = await screen.findByLabelText(/Sumber filament untuk quote/);
    fireEvent.change(source, { target: { value: "COMMUNAL" } });
    fireEvent.change(screen.getByLabelText("Catatan scope quote"), {
      target: { value: "Finishing mengikuti fixture review." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kirim quote preview" }));

    expect(screen.getByText("Snapshot preview sudah terkirim dan tidak dapat diubah")).toBeVisible();
    expect(screen.getByText("15 September 2026, 10.30 WIB")).toBeVisible();
    expect(source).toBeDisabled();
    expect(screen.getByLabelText("Catatan scope quote")).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
