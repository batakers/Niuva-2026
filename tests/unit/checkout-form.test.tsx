import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutForm, type CheckoutPreviewScenario } from "@/app/checkout/checkout-form";
import { CART_STORAGE_KEY } from "@/features/cart/cart-state";
import { exampleShopProducts } from "@/features/frontend-preview/fixtures";

function seedCart() {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
    version: 1,
    items: [{ variantId: "example-dock-grey", quantity: 2 }],
  }));
}

function fillCheckout() {
  const values: Record<string, string> = {
    customerName: "Pemesan Contoh",
    customerEmail: "pemesan@example.test",
    customerPhone: "+6281234567890",
    recipientName: "Penerima Contoh",
    addressPhone: "+6281234567890",
    addressLine: "Jalan Contoh Nomor 12, RT 01 RW 02",
    district: "Coblong",
    city: "Bandung",
    province: "Jawa Barat",
    postalCode: "40132",
  };
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(document.querySelector(`[name="${name}"]`)!, { target: { value } });
  }
}

async function renderCheckout(initialScenario: CheckoutPreviewScenario = "ready") {
  render(
    <CheckoutForm
      catalogStatus="examples"
      initialScenario={initialScenario}
      previewEnabled
      products={exampleShopProducts}
    />,
  );
  return screen.findByRole("form", { name: "Form checkout tamu" });
}

beforeEach(() => {
  window.localStorage.clear();
  seedCart();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkout frontend preview", () => {
  it("reports missing fields, focuses the error summary, and keeps district optional", async () => {
    await renderCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));

    const summary = screen.getByText("Periksa kembali data checkout.").closest("[tabindex]");
    expect(summary).toHaveFocus();
    expect(screen.getByLabelText(/Nama pemesan/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Kecamatan")).not.toBeRequired();
    expect(screen.getByLabelText(/Kode pos/)).toBeRequired();
  });

  it("reviews a complete checkout without calling shipping or checkout boundaries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const form = await renderCheckout();
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));
    fireEvent.click(screen.getByRole("radio", { name: /Regular/ }));

    vi.useFakeTimers();
    fireEvent.submit(form);
    expect(screen.getByRole("button", { name: "Memeriksa preview…" })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(600); });

    expect(screen.getByText("Preview checkout siap ditinjau.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain("example-dock-grey");
  });

  it("recovers unavailable shipping options without losing the address", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderCheckout("rates-unavailable");
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));

    expect(screen.getByText("Opsi pengiriman belum tersedia.")).toBeVisible();
    expect(screen.getByLabelText(/Alamat lengkap/)).toHaveValue("Jalan Contoh Nomor 12, RT 01 RW 02");
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(screen.getByRole("radio", { name: /Regular/ })).toBeVisible();
    expect(screen.getByLabelText(/Alamat lengkap/)).toHaveValue("Jalan Contoh Nomor 12, RT 01 RW 02");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders a shaped shipping loading state with a retry path", async () => {
    await renderCheckout("rates-loading");
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));

    expect(screen.getByRole("status", { name: "" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Memuat simulasi opsi pengiriman…")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(screen.getByRole("radio", { name: /Regular/ })).toBeVisible();
  });

  it("clears an expired rate and requires a fresh selection", async () => {
    const form = await renderCheckout("rate-stale");
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));
    fireEvent.click(screen.getByRole("radio", { name: /Regular/ }));
    fireEvent.submit(form);

    expect(screen.getByText("Pilihan pengiriman sudah kedaluwarsa.")).toBeVisible();
    expect(screen.queryByRole("radio", { name: /Regular/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Muat opsi terbaru" }));
    expect(screen.getByRole("radio", { name: /Regular/ })).not.toBeChecked();
  });

  it.each([
    ["payment-pending", "Simulasi pembayaran masih menunggu."],
    ["payment-error", "Simulasi pembayaran gagal."],
  ] as const)("renders and recovers the %s state without a provider call", async (scenario, expected) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const form = await renderCheckout(scenario);
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));
    fireEvent.click(screen.getByRole("radio", { name: /Regular/ }));

    vi.useFakeTimers();
    fireEvent.submit(form);
    await act(async () => { vi.advanceTimersByTime(600); });

    expect(screen.getByText(expected)).toBeVisible();
    expect(screen.getByLabelText(/Nama pemesan/)).toHaveValue("Pemesan Contoh");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed when development preview authority is absent", async () => {
    render(<CheckoutForm catalogStatus={null} previewEnabled={false} products={[]} />);
    expect(await screen.findByText("Checkout belum tersedia untuk transaksi.")).toBeVisible();
    expect(screen.queryByRole("form", { name: "Form checkout tamu" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Skenario checkout")).not.toBeInTheDocument();
  });
});
