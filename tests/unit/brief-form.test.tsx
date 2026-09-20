import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BriefForm } from "@/app/project-brief/brief-form";

function response(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

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
  it("allows an idea-stage brief without a reference link", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ accessToken: "opaque-access-token", referenceNumber: "INQ-20260913-IDEA1234" }),
    );
    render(<BriefForm />);
    fill();
    fireEvent.change(document.querySelector('[name="currentStage"]')!, { target: { value: "IDEA" } });
    fireEvent.change(document.querySelector('[name="referenceLink"]')!, { target: { value: "" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(await screen.findByText("Brief tersimpan.")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
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

  it("persists a validated brief, shows its reference, and offers WhatsApp follow-up", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ accessToken: "opaque-access-token", referenceNumber: "INQ-20260913-ABCDEFGH" }),
    );
    render(<BriefForm />);
    fill();
    fireEvent.submit(screen.getByRole("form"));

    expect(await screen.findByText("Brief tersimpan.")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/project-brief");
    expect(init).toMatchObject({ method: "POST" });
    const body = JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      name: "Kontak contoh",
      email: "example@example.test",
      projectGoal: "Meninjau prototype",
      confidentialityAck: true,
    });
    expect(screen.getByRole("link", { name: "Lanjutkan lewat WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/6285117678901"),
    );
    expect(screen.getByRole("link", { name: "Lanjutkan lewat WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("INQ-20260913-ABCDEFGH")),
    );
    expect(screen.queryByText("opaque-access-token")).not.toBeInTheDocument();
  });

  it("keeps the form available when the persistence boundary fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ code: "DATABASE_UNAVAILABLE", error: "Temporary failure" }, 503),
    );
    render(<BriefForm />);
    fill();
    fireEvent.submit(screen.getByRole("form"));

    expect(await screen.findByText("Project brief belum terkirim.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Kirim project brief" })).toBeEnabled();
    expect(document.querySelector('[name="projectGoal"]')).toHaveValue("Meninjau prototype");
  });

  it("uses the API submission path on the public form", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ accessToken: "opaque-access-token", referenceNumber: "INQ-20260913-ABCDE123" }),
    );
    render(<BriefForm />);
    expect(screen.queryByLabelText("Hasil simulasi")).not.toBeInTheDocument();
    fill();
    fireEvent.submit(screen.getByRole("form"));
    expect(await screen.findByText("Brief tersimpan.")).toBeVisible();
  });
});
