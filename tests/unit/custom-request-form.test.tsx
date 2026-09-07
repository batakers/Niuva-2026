import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RequestForm } from "@/app/custom-print/request/request-form";

function chooseFile(name = "contoh-part.stl") {
  const input = screen.getByLabelText("File model 3D *");
  const file = new File(["mesh preview"], name, { type: "application/octet-stream" });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: "PLA" } });
  fireEvent.change(screen.getByLabelText(/^Jumlah/), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText(/^Unit atau skala/), { target: { value: "MILLIMETER_CONFIRMED" } });
  fireEvent.change(screen.getByLabelText(/^Nama/), { target: { value: "Kontak contoh" } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "example@example.test" } });
  fireEvent.change(screen.getByLabelText(/^Nomor WhatsApp/), { target: { value: "+628000000000" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("custom request frontend preview", () => {
  it("fails closed when private upload is not enabled", () => {
    render(<RequestForm />);

    expect(screen.getByText("Pengiriman privat belum tersedia.")).toBeVisible();
    expect(screen.getByLabelText("File model 3D *")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pengiriman belum tersedia" })).toBeDisabled();
    expect(screen.queryByLabelText("Hasil simulasi file")).not.toBeInTheDocument();
  });

  it("reports required fields and focuses the error summary", () => {
    render(<RequestForm previewEnabled />);
    fireEvent.submit(screen.getByRole("form", { name: "Form request custom print" }));

    const summary = screen.getByText("Periksa kembali request Anda.");
    expect(summary).toBeVisible();
    expect(document.querySelector("#custom-customerName")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Pilih satu file model untuk melengkapi preview request.")).toBeVisible();
    expect(summary.closest("[tabindex]"))?.toHaveFocus();
  });

  it("rejects unsupported file metadata without reading or uploading the file", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RequestForm previewEnabled />);
    chooseFile("catatan.pdf");

    expect(screen.getByText("Gunakan STL, 3MF, OBJ, STEP, atau STP untuk preview ini.")).toBeVisible();
    expect(document.querySelector("[data-component='file-upload-field']")).toHaveAttribute("data-status", "invalid");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows progress and recovers from a simulated upload failure", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RequestForm previewEnabled />);
    fireEvent.change(screen.getByLabelText("Hasil simulasi file"), { target: { value: "failed" } });
    chooseFile();

    expect(screen.getByRole("progressbar", { name: "Progress preview berkas" })).toHaveValue(12);
    await act(async () => vi.advanceTimersByTime(600));
    expect(document.querySelector("[data-component='file-upload-field']")).toHaveAttribute("data-status", "failed");

    fireEvent.change(screen.getByLabelText("Hasil simulasi file"), { target: { value: "accepted" } });
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    await act(async () => vi.advanceTimersByTime(700));
    expect(document.querySelector("[data-component='file-upload-field']")).toHaveAttribute("data-status", "accepted");
    expect(screen.getAllByText("Metadata lolos preview lokal. Berkas belum diunggah atau disimpan.").length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates a complete request locally without creating a request", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RequestForm previewEnabled />);
    chooseFile();
    await act(async () => vi.advanceTimersByTime(600));
    fillRequiredFields();

    fireEvent.submit(screen.getByRole("form", { name: "Form request custom print" }));
    expect(screen.getByRole("button", { name: "Memeriksa preview" })).toBeDisabled();
    await act(async () => vi.advanceTimersByTime(600));

    expect(screen.getByText("Preview request siap ditinjau.")).toBeVisible();
    expect(screen.getByText(/Tidak ada file, request, nomor referensi, atau pesan yang dikirim/)).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
