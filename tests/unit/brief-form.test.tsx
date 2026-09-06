import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BriefForm } from "@/app/project-brief/brief-form";

function fill() {
  for (const [name,value] of Object.entries({ name: "Kontak contoh", email: "example@example.test", phone: "+628000000000", projectGoal: "Meninjau prototype", currentStage: "SKETCH", description: "Contoh kebutuhan dan batasan.", targetQuantity: "1 prototype", targetDeadline: "2026-10-01", referenceLink: "https://example.test/reference" })) {
    fireEvent.change(document.querySelector(`[name="${name}"]`)!, { target: { value } });
  }
  fireEvent.click(screen.getByRole("checkbox"));
}
afterEach(() => { vi.useRealTimers(); });

describe("brief frontend", () => {
  it("reports missing fields, focuses the summary, and keeps company optional", () => {
    render(<BriefForm previewEnabled />);
    fireEvent.submit(screen.getByRole("form"));
    expect(screen.getByText("Periksa kembali brief Anda.")).toBeInTheDocument();
    expect(document.querySelector("#brief-name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Perusahaan atau tim/)).not.toBeRequired();
    expect(screen.getByLabelText(/Nomor WhatsApp/)).toBeRequired();
    expect(screen.getByText("Periksa kembali brief Anda.").closest("[tabindex]")).toHaveFocus();
  });
  it("validates a reference and consent instead of treating unavailable upload as proof", () => {
    render(<BriefForm previewEnabled />);
    fill();
    fireEvent.change(document.querySelector('[name="referenceLink"]')!, { target: { value: "" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(screen.getByRole("form"));
    expect(document.querySelector("#brief-referenceLink")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  });
  it("preserves input through simulated failure/retry, prevents duplicate submission and makes no fetch", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<BriefForm previewEnabled />);
    fill();
    fireEvent.change(screen.getByLabelText("Hasil simulasi"), { target: { value: "error" } });
    fireEvent.submit(screen.getByRole("form"));
    fireEvent.submit(screen.getByRole("form"));
    expect(screen.getByRole("button", { name: "Memproses simulasi…" })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(screen.getByText("Simulasi pengiriman gagal.")).toBeVisible();
    expect(document.querySelector('[name="projectGoal"]')).toHaveValue("Meninjau prototype");
    fireEvent.change(screen.getByLabelText("Hasil simulasi"), { target: { value: "success" } });
    fireEvent.submit(screen.getByRole("form"));
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(screen.getByText("Simulasi brief berhasil.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("does not enable simulated success on the public form", () => {
    render(<BriefForm />);
    expect(screen.queryByLabelText("Hasil simulasi")).not.toBeInTheDocument();
    fill();
    fireEvent.submit(screen.getByRole("form"));
    expect(screen.getByText("Brief sudah lengkap, pengiriman belum tersedia.")).toBeVisible();
  });
});
