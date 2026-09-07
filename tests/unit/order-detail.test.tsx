import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AdminOrderDetail,
  isPreviewTransitionAllowed,
} from "@/features/admin/order-detail";
import { getPreviewOrder, type AdminPreviewRole } from "@/features/admin/order-preview-data";

function renderOrderDetail(reference: string, role: AdminPreviewRole = "OWNER") {
  const order = getPreviewOrder(reference);

  if (order === null) throw new Error(`Missing fixture ${reference}`);

  return render(<AdminOrderDetail onClose={() => undefined} order={order} role={role} />);
}

describe("admin order fulfillment preview", () => {
  it("keeps the preview transition map explicit and rejects invalid edges", () => {
    expect(isPreviewTransitionAllowed("PAID", "PROCESSING")).toBe(true);
    expect(isPreviewTransitionAllowed("FINISHING_QC", "WAITING_SHIPPING_PAYMENT")).toBe(true);
    expect(isPreviewTransitionAllowed("PAID", "READY_TO_SHIP")).toBe(false);
    expect(isPreviewTransitionAllowed("COMPLETED", "PROCESSING")).toBe(false);
  });

  it("requires final package measurements before a custom shipping preview can advance", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderOrderDetail("ORD-EX-4265");

    expect(await screen.findByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan QC preview" }));
    expect(screen.getByRole("heading", { name: "Pengukuran paket akhir" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Validasi pengukuran preview" }));
    expect(screen.getByText("Pengukuran paket belum lengkap")).toBeVisible();
    expect(screen.getByRole("button", { name: "Siapkan pembayaran pengiriman preview" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Panjang akhir (cm)"), { target: { value: "12.5" } });
    fireEvent.change(screen.getByLabelText("Lebar akhir (cm)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Tinggi akhir (cm)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Berat akhir (g)"), { target: { value: "235" } });
    fireEvent.click(screen.getByRole("button", { name: "Validasi pengukuran preview" }));

    expect(screen.getByText("Pengukuran preview valid")).toBeVisible();
    const shippingAction = screen.getByRole("button", { name: "Siapkan pembayaran pengiriman preview" });
    expect(shippingAction).toBeEnabled();
    fireEvent.click(shippingAction);
    expect(screen.getAllByText("Menunggu pembayaran pengiriman", { exact: true })[0]).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps paid cancellation and full refund review Owner-only", async () => {
    renderOrderDetail("ORD-EX-4072", "ADMIN");

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText("Tindakan ini hanya dapat diminta oleh Owner")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Tinjau refund penuh preview" })).not.toBeInTheDocument();
  });
});
