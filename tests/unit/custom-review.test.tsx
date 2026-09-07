import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AdminCustomReview,
  isPreviewCustomReviewTransitionAllowed,
} from "@/features/admin/custom-review";
import { getPreviewCustomRequest } from "@/features/admin/custom-review-preview-data";

function renderCustomReview(reference = "CPR-EX-2093") {
  const request = getPreviewCustomRequest(reference);

  if (request === null) throw new Error(`Missing fixture ${reference}`);

  return render(<AdminCustomReview onClose={() => undefined} request={request} />);
}

describe("admin custom print review preview", () => {
  it("keeps the visual review transition map explicit and rejects invalid edges", () => {
    expect(isPreviewCustomReviewTransitionAllowed("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(isPreviewCustomReviewTransitionAllowed("UNDER_REVIEW", "QUOTE_READY")).toBe(true);
    expect(isPreviewCustomReviewTransitionAllowed("SUBMITTED", "QUOTE_READY")).toBe(false);
    expect(isPreviewCustomReviewTransitionAllowed("QUOTE_READY", "UNDER_REVIEW")).toBe(false);
  });

  it("shows missing slicer inputs, then completes only a local review preview", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderCustomReview();

    expect(await screen.findByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Simpan review preview" }));

    expect(screen.getByText("Input review belum valid")).toBeVisible();
    expect(screen.getByText("Masukkan kode material yang diverifikasi operator.")).toBeVisible();
    expect(screen.getByText("Berat slicer harus berupa angka desimal nonnegatif hingga enam digit pecahan.")).toBeVisible();
    expect(screen.getByText("Durasi cetak harus berupa integer detik nonnegatif.")).toBeVisible();

    fireEvent.change(screen.getByLabelText(/Kode material/), { target: { value: "PLA-NATURAL" } });
    fireEvent.change(screen.getByLabelText(/Berat slicer \(g\)/), { target: { value: "42.125" } });
    fireEvent.change(screen.getByLabelText(/Durasi cetak \(detik\)/), { target: { value: "10800" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan review preview" }));

    expect(screen.getByText("Review preview siap untuk handoff draft quote")).toBeVisible();
    expect(screen.getAllByText("Siap untuk draft quote", { exact: true })[0]).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("exposes the private-file boundary without a fake file link", async () => {
    renderCustomReview();

    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelector("[data-private-file-access=unavailable] a")).toBeNull();
    expect(screen.getByText("File privat tidak tersedia di preview")).toBeVisible();
    expect(screen.getByText(/Tidak ada tautan file pada preview ini/)).toBeVisible();
  });
});
