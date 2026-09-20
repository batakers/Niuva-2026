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

const liveVariantId = "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4";
const liveProducts = [{
  id: "8f5a9a1c-5e2b-4a6c-9b6d-4f7d5f8a3c10",
  name: "Dock produksi",
  slug: "dock-produksi",
  description: "Produk ready-made untuk smoke checkout.",
  category: { name: "Workspace", slug: "workspace" },
  media: [],
  variants: [{
    id: liveVariantId,
    name: "Biru",
    priceRp: "185000",
    sku: "NIUVA-DOCK-BLUE",
    stockOnHand: 8,
    weightGrams: "240",
  }],
}] as const;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
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

describe("checkout live server flow", () => {
  it("loads real rates, creates an idempotent pending order, and never shows the payment token", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [{ variantId: liveVariantId, quantity: 2 }],
    }));
    const calls: Array<{ body?: BodyInit | null; method?: string; url: string }> = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ body: init?.body, method: init?.method, url });
      if (url.endsWith("/api/shipping/rates")) {
        return Response.json({
          expiresAt: "2099-09-14T01:00:00.000Z",
          options: [{
            courierCode: "JNE",
            courierName: "Jalur Express",
            etaText: "1-2 hari",
            optionId: "rate-jne-reg",
            priceRp: "24000",
            serviceCode: "REG",
            serviceName: "Regular",
          }],
        });
      }
      if (url.endsWith("/api/checkout")) {
        return Response.json({
          accessToken: "order-status-token",
          kind: "CREATED",
          orderId: "7d2ce4a7-409b-4eb2-a2d5-15f2a7c0d090",
          orderNumber: "ORD-20260914-ABCDEFGH",
          payment: { token: "snap-token-that-never-renders" },
          paymentAttemptId: "f8414be7-c1c6-45a2-b1cf-8cf7f2b6f4c0",
          totalRp: "394000",
        }, { status: 201 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<CheckoutForm catalogStatus={null} liveEnabled products={liveProducts} previewEnabled={false} />);
    const form = await screen.findByRole("form", { name: "Form checkout tamu" });
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));
    await screen.findByRole("radio", { name: /Jalur Express/ });
    fireEvent.click(screen.getByRole("radio", { name: /Jalur Express/ }));
    fireEvent.submit(form);

    await screen.findByText("Checkout tersimpan, pembayaran menunggu.");
    expect(screen.getByText(/Order ORD-20260914-ABCDEFGH/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Lihat status order" })).toHaveAttribute("href", "/orders/order-status-token");
    expect(screen.queryByText("snap-token-that-never-renders")).not.toBeInTheDocument();
    expect(calls.map(({ method, url }) => `${method ?? "GET"} ${url}`)).toEqual([
      "POST /api/shipping/rates",
      "POST /api/checkout",
    ]);
    expect(JSON.parse(String(calls[0]?.body))).toMatchObject({
      destination: { countryCode: "ID", postalCode: "40132" },
      items: [{ quantity: 2, variantId: liveVariantId }],
    });
    expect(JSON.parse(String(calls[1]?.body))).toMatchObject({
      address: { city: "Bandung", countryCode: "ID", phone: "+6281234567890", postalCode: "40132" },
      items: [{ quantity: 2, variantId: liveVariantId }],
      shippingOptionId: "rate-jne-reg",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("replays the order token and pending payment handoff together", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [{ variantId: liveVariantId, quantity: 1 }],
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/api/shipping/rates")) {
        return Response.json({
          expiresAt: "2099-09-14T01:00:00.000Z",
          options: [{
            courierCode: "JNE",
            courierName: "Jalur Express",
            etaText: "1-2 hari",
            optionId: "rate-jne-reg",
            priceRp: "24000",
            serviceCode: "REG",
            serviceName: "Regular",
          }],
        });
      }
      if (url.endsWith("/api/checkout")) {
        return Response.json({
          accessToken: "recovered-order-status-token",
          kind: "REPLAY",
          orderId: "7d2ce4a7-409b-4eb2-a2d5-15f2a7c0d090",
          orderNumber: "ORD-20260914-REPLAYED",
          payment: { redirectUrl: "https://payment.example.test/retry" },
          paymentAttemptId: "f8414be7-c1c6-45a2-b1cf-8cf7f2b6f4c0",
          status: "PENDING_PAYMENT",
          totalRp: "209000",
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<CheckoutForm catalogStatus={null} liveEnabled products={liveProducts} previewEnabled={false} />);
    const form = await screen.findByRole("form", { name: "Form checkout tamu" });
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));
    await screen.findByRole("radio", { name: /Jalur Express/ });
    fireEvent.click(screen.getByRole("radio", { name: /Jalur Express/ }));
    fireEvent.submit(form);

    await screen.findByText("Checkout tersimpan, pembayaran menunggu.");
    expect(screen.getByRole("link", { name: "Buka pembayaran sandbox" })).toHaveAttribute(
      "href",
      "https://payment.example.test/retry",
    );
    expect(screen.getByRole("link", { name: "Lihat status order" })).toHaveAttribute(
      "href",
      "/orders/recovered-order-status-token",
    );
  });

  it("keeps the live checkout recoverable when rates fail", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [{ variantId: liveVariantId, quantity: 1 }],
    }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));

    render(<CheckoutForm catalogStatus={null} liveEnabled products={liveProducts} previewEnabled={false} />);
    await screen.findByRole("form", { name: "Form checkout tamu" });
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));

    await screen.findByText("Opsi pengiriman belum tersedia.");
    expect(screen.getByLabelText(/Alamat lengkap/)).toHaveValue("Jalan Contoh Nomor 12, RT 01 RW 02");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("rejects a non-http payment handoff without rendering provider data", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [{ variantId: liveVariantId, quantity: 1 }],
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/api/shipping/rates")) {
        return Response.json({
          expiresAt: "2099-09-14T01:00:00.000Z",
          options: [{
            courierCode: "JNE",
            courierName: "Jalur Express",
            etaText: "1-2 hari",
            optionId: "rate-jne-reg",
            priceRp: "24000",
            serviceCode: "REG",
            serviceName: "Regular",
          }],
        });
      }
      if (url.endsWith("/api/checkout")) {
        return Response.json({
          accessToken: "order-status-token",
          kind: "CREATED",
          orderId: "7d2ce4a7-409b-4eb2-a2d5-15f2a7c0d090",
          orderNumber: "ORD-20260914-ABCDEFGH",
          payment: { redirectUrl: "javascript:alert(1)", token: "provider-token" },
          paymentAttemptId: "f8414be7-c1c6-45a2-b1cf-8cf7f2b6f4c0",
          totalRp: "209000",
        }, { status: 201 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<CheckoutForm catalogStatus={null} liveEnabled products={liveProducts} previewEnabled={false} />);
    const form = await screen.findByRole("form", { name: "Form checkout tamu" });
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Tinjau opsi pengiriman" }));
    await screen.findByRole("radio", { name: /Jalur Express/ });
    fireEvent.click(screen.getByRole("radio", { name: /Jalur Express/ }));
    fireEvent.submit(form);

    await screen.findByText("Checkout belum dapat dibuat.");
    expect(screen.queryByText("provider-token")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buka pembayaran sandbox" })).not.toBeInTheDocument();
  });
});
