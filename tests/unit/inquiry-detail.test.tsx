import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { AdminInquiryDetail } from "@/features/admin/inquiry-detail";

function renderInquiryDetail() {
  return render(
    <AdminInquiryDetail trigger={<Button type="button">Buka brief preview</Button>} />,
  );
}

describe("admin inquiry detail preview", () => {
  it("shows only a safe synthetic projection when opened", async () => {
    renderInquiryDetail();
    fireEvent.click(screen.getByRole("button", { name: "Buka brief preview" }));

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText("BRF-EX-1049")).toBeVisible();
    expect(screen.getByText("Tidak dicantumkan")).toBeVisible();
    expect(screen.getByText("Disembunyikan di preview")).toBeVisible();
    expect(screen.getByText("Tidak tersedia di preview")).toBeVisible();
    expect(screen.getByText("Data sintetis")).toBeVisible();
  });

  it("records only local transition and follow-up preview state", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderInquiryDetail();
    fireEvent.click(screen.getByRole("button", { name: "Buka brief preview" }));

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Tandai sudah dihubungi" }));
    expect(screen.getByText("Sudah dihubungi")).toBeVisible();
    expect(screen.getByText("Status preview berubah dari NEW ke CONTACTED. Tidak ada audit atau mutasi server dibuat.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Lanjutkan kualifikasi" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Siapkan follow-up preview" }));
    expect(screen.getByText("Follow-up preview siap ditinjau")).toBeVisible();
    expect(screen.getByText("Tidak ada email, WhatsApp, API, atau data pelanggan yang dikirim atau disimpan.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
