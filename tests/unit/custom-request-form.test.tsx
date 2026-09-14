import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("custom request live private upload", () => {
  it("uploads directly to the private URL, confirms metadata, then submits only the file ID", async () => {
    const calls: Array<{ body?: BodyInit | null; headers?: HeadersInit; method?: string; url: string }> = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ body: init?.body, headers: init?.headers, method: init?.method, url });

      if (url.endsWith("/api/uploads/intents")) {
        return Response.json({
          expiresAt: "2026-09-14T01:00:00.000Z",
          fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
          requiredHeaders: { "content-type": "model/stl" },
          uploadToken: "upload-token-that-never-renders",
          uploadUrl: "https://r2.example.test/private/upload",
        }, { status: 201 });
      }

      if (url === "https://r2.example.test/private/upload") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/api/uploads/confirm")) {
        return Response.json({
          fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
          status: "UPLOADED",
        });
      }

      if (url.endsWith("/api/custom-print/requests")) {
        return Response.json({
          accessToken: "request-token-that-never-renders",
          referenceNumber: "CPR-20260914-ABCDEFGH",
        }, { status: 201 });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<RequestForm liveEnabled />);
    chooseFile();

    await waitFor(() => expect(document.querySelector("[data-component='file-upload-field']"))?.toHaveAttribute("data-status", "accepted"));
    fillRequiredFields();
    fireEvent.submit(screen.getByRole("form", { name: "Form request custom print" }));

    await waitFor(() => expect(screen.getByText("Request tersimpan untuk review operator.")).toBeVisible());
    expect(screen.getByRole("link", { name: "Lanjutkan melalui WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
    expect(screen.queryByText("request-token-that-never-renders")).not.toBeInTheDocument();
    expect(screen.queryByText("upload-token-that-never-renders")).not.toBeInTheDocument();

    expect(calls.map(({ method, url }) => `${method ?? "GET"} ${url}`)).toEqual([
      "POST /api/uploads/intents",
      "PUT https://r2.example.test/private/upload",
      "POST /api/uploads/confirm",
      "POST /api/custom-print/requests",
    ]);
    const submitCall = calls[3];
    expect(JSON.parse(String(submitCall?.body))).toMatchObject({
      fileIds: ["2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4"],
      materialRequested: "PLA",
      quantity: 2,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("keeps the request blocked when the direct private upload fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({
      expiresAt: "2026-09-14T01:00:00.000Z",
      fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      requiredHeaders: { "content-type": "model/stl" },
      uploadToken: "upload-token",
      uploadUrl: "https://r2.example.test/private/upload",
    }, { status: 201 })).mockResolvedValueOnce(new Response(null, { status: 503 }));

    render(<RequestForm liveEnabled />);
    chooseFile();

    await waitFor(() => expect(document.querySelector("[data-component='file-upload-field']"))?.toHaveAttribute("data-status", "failed"));
    expect(screen.getByText("Coba upload kembali.")).toBeVisible();
    expect(screen.queryByText("Request tersimpan untuk review operator.")).not.toBeInTheDocument();
  });
});
