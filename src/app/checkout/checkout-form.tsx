"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { AuLink } from "@/components/ui/AuLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_CART, readCart, type CartSnapshot } from "@/features/cart/cart-state";
import type { PreviewScenario, PublicShopProduct } from "@/features/frontend-preview/types";
import { ShippingOptions, type ShippingOptionsMode, type ShippingPreviewOption, type ShippingPreviewStatus } from "./shipping-options";

export type CheckoutPreviewScenario =
  | "ready"
  | "rates-loading"
  | "rates-unavailable"
  | "rate-stale"
  | "payment-pending"
  | "payment-error";

type CheckoutResult = "idle" | "submitting" | "reviewed" | "payment-pending" | "payment-error";
type CheckoutField =
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "recipientName"
  | "addressPhone"
  | "addressLine"
  | "district"
  | "city"
  | "province"
  | "postalCode"
  | "shippingOption";

const scenarios: readonly CheckoutPreviewScenario[] = [
  "ready",
  "rates-loading",
  "rates-unavailable",
  "rate-stale",
  "payment-pending",
  "payment-error",
];

const scenarioLabels: Record<CheckoutPreviewScenario, string> = {
  ready: "Siap ditinjau",
  "rates-loading": "Tarif masih dimuat",
  "rates-unavailable": "Tarif tidak tersedia",
  "rate-stale": "Tarif kedaluwarsa",
  "payment-pending": "Pembayaran menunggu",
  "payment-error": "Pembayaran gagal",
};

const fieldLabels: Record<CheckoutField, string> = {
  customerName: "Nama pemesan",
  customerEmail: "Email",
  customerPhone: "Nomor WhatsApp pemesan",
  recipientName: "Nama penerima",
  addressPhone: "Nomor WhatsApp penerima",
  addressLine: "Alamat lengkap",
  district: "Kecamatan",
  city: "Kota atau kabupaten",
  province: "Provinsi",
  postalCode: "Kode pos",
  shippingOption: "Opsi pengiriman",
};

const checkoutPreviewSchema = z.object({
  customerName: z.string().trim().min(2),
  customerEmail: z.email(),
  customerPhone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,19}$/),
  recipientName: z.string().trim().min(2),
  addressPhone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,19}$/),
  addressLine: z.string().trim().min(8),
  district: z.string().trim().optional(),
  city: z.string().trim().min(2),
  province: z.string().trim().min(2),
  postalCode: z.string().trim().regex(/^\d{5}$/),
});

const shippingRatesResponseSchema = z.object({
  expiresAt: z.string().min(1),
  options: z.array(z.object({
    courierCode: z.string().min(1),
    courierName: z.string().min(1),
    etaText: z.string().min(1).optional(),
    optionId: z.string().min(1),
    priceRp: z.string().regex(/^\d+$/),
    serviceCode: z.string().min(1),
    serviceName: z.string().min(1),
  })).min(1),
});

const checkoutCreatedResponseSchema = z.object({
  accessToken: z.string().min(1),
  kind: z.literal("CREATED"),
  orderId: z.uuid(),
  orderNumber: z.string().min(1),
  payment: z.object({
    redirectUrl: z.url({ protocol: /^https?$/ }).optional(),
    token: z.string().min(1).optional(),
  }),
  paymentAttemptId: z.uuid(),
  totalRp: z.string().regex(/^\d+$/),
});

const checkoutReplayResponseSchema = z.object({
  grandTotalRp: z.string().regex(/^\d+$/),
  kind: z.literal("REPLAY"),
  orderId: z.uuid(),
  orderNumber: z.string().min(1),
  paymentAttemptId: z.uuid(),
  status: z.literal("PENDING_PAYMENT"),
});

const checkoutResponseSchema = z.discriminatedUnion("kind", [
  checkoutCreatedResponseSchema,
  checkoutReplayResponseSchema,
]);

const previewShippingOptions: readonly ShippingPreviewOption[] = [
  { id: "preview-regular", carrier: "Kurir contoh", service: "Regular", eta: "2 sampai 4 hari", priceRp: "24000" },
  { id: "preview-economy", carrier: "Kurir contoh", service: "Ekonomi", eta: "4 sampai 7 hari", priceRp: "17000" },
];

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const rupiah = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });

class CheckoutClientError extends Error {}

async function readCheckoutResponse<T>(response: Response, schema: z.ZodType<T>, fallbackMessage: string): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CheckoutClientError(fallbackMessage);
  }

  if (!response.ok) throw new CheckoutClientError(fallbackMessage);

  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new CheckoutClientError(fallbackMessage);
  return parsed.data;
}

function resolveScenario(requested: unknown): CheckoutPreviewScenario {
  return typeof requested === "string" && scenarios.includes(requested as CheckoutPreviewScenario)
    ? requested as CheckoutPreviewScenario
    : "ready";
}

function findCartProduct(products: readonly PublicShopProduct[], variantId: string) {
  for (const product of products) {
    const variant = product.variants.find(option => option.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

function validationMessage(field: CheckoutField) {
  if (field === "customerEmail") return "Masukkan alamat email yang valid.";
  if (field === "customerPhone" || field === "addressPhone") return "Masukkan nomor telepon yang dapat dihubungi.";
  if (field === "postalCode") return "Masukkan kode pos 5 digit.";
  return "Lengkapi informasi ini sebelum melanjutkan.";
}

function clearShippingError(current: Partial<Record<CheckoutField, string>>) {
  const next = { ...current };
  delete next.shippingOption;
  return next;
}

export function CheckoutForm({
  catalogStatus,
  demoMode = false,
  initialScenario,
  liveEnabled = false,
  previewEnabled,
  products,
}: {
  catalogStatus: PreviewScenario | null;
  demoMode?: boolean;
  initialScenario?: string | string[];
  liveEnabled?: boolean;
  previewEnabled: boolean;
  products: readonly PublicShopProduct[];
}) {
  const mode: ShippingOptionsMode = liveEnabled
    ? demoMode
      ? "demo"
      : "live"
    : "preview";
  const isLive = liveEnabled;
  const hydrated = useHydrated();
  const [snapshot, setSnapshot] = useState<CartSnapshot>(EMPTY_CART);
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [scenario, setScenario] = useState<CheckoutPreviewScenario>(() => resolveScenario(initialScenario));
  const [shippingStatus, setShippingStatus] = useState<ShippingPreviewStatus>("idle");
  const [shippingOptions, setShippingOptions] = useState<readonly ShippingPreviewOption[]>(previewShippingOptions);
  const [shippingExpiresAt, setShippingExpiresAt] = useState<string>();
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult>("idle");
  const [serverError, setServerError] = useState<string>();
  const [orderNumber, setOrderNumber] = useState<string>();
  const [orderStatusToken, setOrderStatusToken] = useState<string>();
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string>();
  const [reviewingRates, setReviewingRates] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idempotencyKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const cart = readCart(window.localStorage);
      setSnapshot(cart.snapshot);
      setStorageAvailable(cart.storageAvailable);
      setLoadState("ready");
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (Object.keys(errors).length > 0 || result !== "idle" || shippingStatus === "stale") statusRef.current?.focus();
  }, [errors, result, shippingStatus]);

  const resolvedItems = useMemo(() => snapshot.items.map(item => ({ item, match: findCartProduct(products, item.variantId) })), [products, snapshot.items]);
  const hasUnavailableItem = resolvedItems.some(entry => !entry.match || entry.item.quantity > (entry.match?.variant.stockOnHand ?? 0));
  const subtotal = resolvedItems.reduce((sum, entry) => {
    if (!entry.match) return sum;
    return sum + BigInt(entry.match.variant.priceRp) * BigInt(entry.item.quantity);
  }, BigInt(0));
  const selectedShipping = shippingOptions.find(option => option.id === selectedShippingId) ?? null;
  const shippingTotal = BigInt(selectedShipping?.priceRp ?? "0");
  const estimatedTotal = subtotal + shippingTotal;

  function validate(form: HTMLFormElement) {
    const formData = new FormData(form);
    const parsed = checkoutPreviewSchema.safeParse({
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      customerPhone: formData.get("customerPhone"),
      recipientName: formData.get("recipientName"),
      addressPhone: formData.get("addressPhone"),
      addressLine: formData.get("addressLine"),
      district: formData.get("district") || undefined,
      city: formData.get("city"),
      province: formData.get("province"),
      postalCode: formData.get("postalCode"),
    });

    if (parsed.success) {
      setErrors({});
      return true;
    }

    const next: Partial<Record<CheckoutField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as CheckoutField;
      if (!next[field]) next[field] = validationMessage(field);
    }
    setErrors(next);
    setResult("idle");
    return false;
  }

  async function reviewRates(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || !validate(form)) return;
    setResult("idle");
    setServerError(undefined);
    setSelectedShippingId(null);
    setErrors(clearShippingError);
    if (!isLive) {
      if (scenario === "rates-loading") setShippingStatus("loading");
      else if (scenario === "rates-unavailable") setShippingStatus("unavailable");
      else setShippingStatus("ready");
      return;
    }

    const formData = new FormData(form);
    const items = snapshot.items.map((item) => ({
      quantity: item.quantity,
      variantId: item.variantId,
    }));
    setReviewingRates(true);
    setShippingStatus("loading");
    try {
      const response = await fetch("/api/shipping/rates", {
        body: JSON.stringify({
          destination: {
            countryCode: "ID",
            postalCode: String(formData.get("postalCode") ?? ""),
          },
          items,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await readCheckoutResponse(response, shippingRatesResponseSchema, "Opsi pengiriman belum tersedia. Coba lagi.");
      setShippingOptions(payload.options.map((option) => ({
        carrier: option.courierName,
        eta: option.etaText ?? "Estimasi dari provider",
        id: option.optionId,
        priceRp: option.priceRp,
        service: option.serviceName,
      })));
      setShippingExpiresAt(payload.expiresAt);
      setShippingStatus("ready");
    } catch (error) {
      setShippingStatus("unavailable");
      setServerError(error instanceof CheckoutClientError ? error.message : "Opsi pengiriman belum tersedia. Coba lagi.");
    } finally {
      setReviewingRates(false);
    }
  }

  function retryRates() {
    setScenario("ready");
    setSelectedShippingId(null);
    setErrors(clearShippingError);
    setResult("idle");
    setServerError(undefined);
    if (isLive) {
      setShippingOptions([]);
      setShippingExpiresAt(undefined);
      setShippingStatus("idle");
    } else {
      setShippingStatus("ready");
    }
  }

  async function submitLiveCheckout(form: HTMLFormElement) {
    const formData = new FormData(form);
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    const response = await fetch("/api/checkout", {
      body: JSON.stringify({
        address: {
          addressLine: String(formData.get("addressLine") ?? ""),
          city: String(formData.get("city") ?? ""),
          countryCode: "ID",
          district: String(formData.get("district") ?? "").trim() || undefined,
          phone: String(formData.get("addressPhone") ?? ""),
          postalCode: String(formData.get("postalCode") ?? ""),
          province: String(formData.get("province") ?? ""),
          recipientName: String(formData.get("recipientName") ?? ""),
        },
        customerEmail: String(formData.get("customerEmail") ?? ""),
        customerName: String(formData.get("customerName") ?? ""),
        customerPhone: String(formData.get("customerPhone") ?? ""),
        idempotencyKey,
        items: snapshot.items.map((item) => ({
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        shippingOptionId: selectedShippingId,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return readCheckoutResponse(response, checkoutResponseSchema, "Checkout belum dapat dibuat. Periksa data dan coba lagi.");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !validate(event.currentTarget)) return;
    if (!selectedShippingId) {
      setErrors(current => ({ ...current, shippingOption: "Pilih satu opsi pengiriman sebelum melanjutkan." }));
      return;
    }
    if (scenario === "rate-stale") {
      setSelectedShippingId(null);
      setShippingStatus("stale");
      setErrors({ shippingOption: "Muat dan pilih ulang opsi pengiriman yang masih berlaku." });
      return;
    }

    if (isLive && shippingExpiresAt !== undefined && Date.parse(shippingExpiresAt) <= Date.now()) {
      setSelectedShippingId(null);
      setShippingStatus("stale");
      setErrors({ shippingOption: "Muat dan pilih ulang opsi pengiriman yang masih berlaku." });
      return;
    }

    pending.current = true;
    setErrors({});
    setResult("submitting");
    setServerError(undefined);
    if (isLive) {
      void submitLiveCheckout(event.currentTarget)
        .then((response) => {
          pending.current = false;
          if (response.kind === "CREATED") {
            setOrderNumber(response.orderNumber);
            setOrderStatusToken(response.accessToken);
            setPaymentRedirectUrl(response.payment.redirectUrl);
          } else {
            setOrderNumber(response.orderNumber);
            setOrderStatusToken(undefined);
            setPaymentRedirectUrl(undefined);
          }
          setResult("payment-pending");
        })
        .catch((error) => {
          pending.current = false;
          setServerError(error instanceof CheckoutClientError ? error.message : "Checkout belum dapat dibuat. Coba lagi.");
          setResult("payment-error");
        });
      return;
    }

    timer.current = setTimeout(() => {
      pending.current = false;
      if (scenario === "payment-pending") setResult("payment-pending");
      else if (scenario === "payment-error") setResult("payment-error");
      else setResult("reviewed");
    }, 600);
  }

  function resetOutcome() {
    pending.current = false;
    clearTimeout(timer.current);
    setScenario("ready");
    setResult("idle");
    setServerError(undefined);
    setOrderNumber(undefined);
    setOrderStatusToken(undefined);
    setPaymentRedirectUrl(undefined);
    if (isLive) {
      idempotencyKeyRef.current = undefined;
      setSelectedShippingId(null);
      setShippingStatus("idle");
      setShippingOptions([]);
    }
  }

  if (loadState === "loading") {
    return (
      <section aria-label="Memuat checkout" aria-busy="true" role="status" className="grid gap-8 md:grid-cols-12">
        <div className="space-y-4 md:col-span-8"><p className="text-sm text-muted-foreground">Membaca cart lokal…</p><div className="h-80 rounded-xl bg-muted motion-safe:animate-pulse" /></div>
        <div className="h-72 rounded-xl bg-muted motion-safe:animate-pulse md:col-span-4" />
      </section>
    );
  }

  if ((!previewEnabled || catalogStatus !== "examples") && !isLive) {
    return (
      <StatusNotice
        tone="info"
        title="Checkout belum tersedia untuk transaksi."
        description="Produk publik dan koneksi provider belum siap. Tidak ada data checkout, order, reservasi, tarif, atau pembayaran yang dibuat."
        action={<AuLink href="/cart" variant="outline" className="min-h-11">Kembali ke Cart</AuLink>}
      />
    );
  }

  if (!storageAvailable) {
    return <StatusNotice tone="error" title="Cart browser tidak dapat dibaca." description="Izinkan penyimpanan browser, lalu kembali ke Cart sebelum memulai checkout." action={<AuLink href="/cart?preview=examples" variant="outline" className="min-h-11">Kembali ke Cart</AuLink>} />;
  }

  if (snapshot.items.length === 0) {
    return <StatusNotice tone="info" title="Belum ada item untuk checkout." description="Tambahkan varian yang tersedia ke Cart sebelum mengisi kontak dan alamat." action={<AuLink href="/shop?preview=examples" variant="outline" className="min-h-11">Pilih produk contoh</AuLink>} />;
  }

  if (hasUnavailableItem) {
    return <StatusNotice tone="warning" title="Cart perlu ditinjau kembali." description="Ada item yang tidak dikenali atau jumlahnya melebihi stok tampilan. Perbaiki Cart sebelum melanjutkan." action={<AuLink href="/cart?preview=examples" variant="outline" className="min-h-11">Tinjau Cart</AuLink>} />;
  }

  const busy = result === "submitting" || reviewingRates;

  return (
    <form noValidate onSubmit={submit} aria-label="Form checkout tamu" aria-busy={busy} className="grid gap-8 md:grid-cols-12 md:items-start">
      <div className="min-w-0 space-y-8 md:col-span-8">
        {isLive ? (
          <aside aria-label={demoMode ? "Checkout demo lokal" : "Checkout transaksi"} className="rounded-lg border border-success-border bg-success-background p-4 text-success">
            <p className="text-sm font-semibold">{demoMode ? "Checkout demo lokal aktif" : "Checkout transaksi aktif"}</p>
            <p className="mt-2 text-sm leading-6">{demoMode ? "Server akan memuat ulang katalog, stok, ongkir, total, dan membuat order idempotent di database lokal dengan adapter provider deterministik." : "Server akan memuat ulang katalog, stok, ongkir, total, dan membuat satu order idempotent sebelum membuka pembayaran sandbox."}</p>
          </aside>
        ) : (
          <aside aria-label="Kontrol preview checkout" className="rounded-lg border border-info-border bg-info-background p-4 text-info">
            <p className="text-sm font-semibold">Preview lokal · tidak membuat transaksi</p>
            <FormField id="checkout-preview-scenario" label="Skenario checkout" className="mt-3">
              <select
                className={controlClass}
                value={scenario}
                disabled={busy}
                onChange={event => {
                  setScenario(resolveScenario(event.target.value));
                  setShippingStatus("idle");
                  setSelectedShippingId(null);
                  setErrors({});
                  setResult("idle");
                }}
              >
                {scenarios.map(value => <option key={value} value={value}>{scenarioLabels[value]}</option>)}
              </select>
            </FormField>
          </aside>
        )}

        <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {Object.keys(errors).length > 0 ? (
            <div role="alert" className="rounded-lg border border-destructive-border bg-destructive-background p-4 text-destructive">
              <p className="font-semibold">Periksa kembali data checkout.</p>
              <ul className="mt-2 list-inside list-disc text-sm">
                {Object.entries(errors).filter((entry): entry is [CheckoutField, string] => Boolean(entry[1])).map(([field, message]) => (
                  <li key={field}>
                    <a href={`#checkout-${field}`} className="underline underline-offset-4" onClick={event => { event.preventDefault(); document.getElementById(`checkout-${field}`)?.focus(); }}>
                      {fieldLabels[field]}: {message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result === "submitting" ? <p role="status" className="text-sm text-muted-foreground">{isLive ? demoMode ? "Membuat order demo lokal…" : "Membuat order dan membuka pembayaran sandbox…" : "Memeriksa simulasi checkout… Data tidak dikirim."}</p> : null}
          {result === "reviewed" ? <StatusNotice tone="success" title="Preview checkout siap ditinjau." description="Kontak, alamat, dan opsi pengiriman lolos validasi lokal. Belum ada order, reservasi, token pembayaran, atau data yang dikirim." /> : null}
          {result === "payment-pending" && isLive ? (
            <StatusNotice
              action={paymentRedirectUrl ? <a className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={paymentRedirectUrl} rel="noreferrer" target="_blank">{demoMode ? "Buka pembayaran demo" : "Buka pembayaran sandbox"}</a> : orderStatusToken ? <AuLink className="min-h-11" href={`/orders/${orderStatusToken}`} variant="outline">Lihat status order</AuLink> : undefined}
              description={demoMode
                ? orderNumber ? `Order ${orderNumber} tersimpan di database lokal dan menunggu simulasi pembayaran. Tidak ada provider eksternal yang dipanggil.` : "Order demo tersimpan di database lokal dan menunggu simulasi pembayaran."
                : orderNumber ? `Order ${orderNumber} sudah dibuat dan menunggu pembayaran. Status PAID hanya dapat ditetapkan setelah webhook provider diverifikasi server.` : "Order sudah dibuat dan menunggu pembayaran. Status PAID hanya dapat ditetapkan setelah webhook provider diverifikasi server."}
              title={demoMode ? "Order demo tersimpan." : "Checkout tersimpan, pembayaran menunggu."}
              tone="info"
            />
          ) : null}
          {result === "payment-pending" && !isLive ? <StatusNotice tone="info" title="Simulasi pembayaran masih menunggu." description="Browser tidak menyimpulkan status pembayaran. Pada integrasi nyata, status hanya berubah setelah notifikasi provider diverifikasi server." action={<Button type="button" variant="outline" className="min-h-11" onClick={resetOutcome}>Kembali ke ringkasan</Button>} /> : null}
          {result === "payment-error" ? <StatusNotice tone="error" title={isLive ? "Checkout belum dapat dibuat." : "Simulasi pembayaran gagal."} description={isLive ? serverError ?? "Periksa data dan coba lagi." : "Isian checkout tetap tersedia dan tidak ada transaksi nyata. Kembali ke skenario siap untuk mencoba alur pemulihan."} action={<Button type="button" variant="outline" className="min-h-11" onClick={resetOutcome}>{isLive ? "Coba lagi" : "Coba lagi"}</Button>} /> : null}
        </div>

        <fieldset disabled={busy} className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <legend className="px-2 text-lg font-semibold">1. Kontak pemesan</legend>
          <p className="text-sm leading-6 text-muted-foreground">Checkout ini tidak memerlukan akun. Tanda * menunjukkan field wajib.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="checkout-customerName" label="Nama pemesan" required error={errors.customerName} className="sm:col-span-2"><Input name="customerName" autoComplete="name" required className={controlClass} /></FormField>
            <FormField id="checkout-customerEmail" label="Email" required error={errors.customerEmail}><Input name="customerEmail" type="email" autoComplete="email" required className={controlClass} /></FormField>
            <FormField id="checkout-customerPhone" label="Nomor WhatsApp pemesan" required error={errors.customerPhone}><Input name="customerPhone" type="tel" autoComplete="tel" required className={controlClass} /></FormField>
          </div>
        </fieldset>

        <fieldset disabled={busy} className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <legend className="px-2 text-lg font-semibold">2. Alamat penerima</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="checkout-recipientName" label="Nama penerima" required error={errors.recipientName}><Input name="recipientName" autoComplete="shipping name" required className={controlClass} /></FormField>
            <FormField id="checkout-addressPhone" label="Nomor WhatsApp penerima" required error={errors.addressPhone}><Input name="addressPhone" type="tel" autoComplete="shipping tel" required className={controlClass} /></FormField>
            <FormField id="checkout-addressLine" label="Alamat lengkap" required error={errors.addressLine} description="Nama jalan, nomor bangunan, RT/RW, dan detail lokasi yang membantu kurir." className="sm:col-span-2"><textarea name="addressLine" autoComplete="shipping street-address" required rows={3} className={controlClass} /></FormField>
            <FormField id="checkout-district" label="Kecamatan" error={errors.district}><Input name="district" autoComplete="shipping address-level3" className={controlClass} /></FormField>
            <FormField id="checkout-city" label="Kota atau kabupaten" required error={errors.city}><Input name="city" autoComplete="shipping address-level2" required className={controlClass} /></FormField>
            <FormField id="checkout-province" label="Provinsi" required error={errors.province}><Input name="province" autoComplete="shipping address-level1" required className={controlClass} /></FormField>
            <FormField id="checkout-postalCode" label="Kode pos" required error={errors.postalCode}><Input name="postalCode" inputMode="numeric" autoComplete="shipping postal-code" required maxLength={5} className={controlClass} /></FormField>
            <FormField id="checkout-country" label="Negara" variant="readOnly" className="sm:col-span-2"><Input value="Indonesia" readOnly className={controlClass} /></FormField>
          </div>
          <Button type="button" variant="outline" className="min-h-11" disabled={reviewingRates} onClick={reviewRates}>{reviewingRates ? "Memuat opsi pengiriman…" : "Tinjau opsi pengiriman"}</Button>
        </fieldset>

        <ShippingOptions mode={mode} status={shippingStatus} options={shippingOptions} selectedId={selectedShippingId} error={errors.shippingOption} onChange={value => { setSelectedShippingId(value); setErrors(clearShippingError); setResult("idle"); }} onRetry={retryRates} />
      </div>

      <aside aria-labelledby="checkout-summary-title" className="rounded-xl border border-border bg-card p-5 shadow-card md:sticky md:top-6 md:col-span-4 sm:p-6">
        <p className="text-xs font-medium text-brand-700">Authority ledger</p>
        <h2 id="checkout-summary-title" className="mt-2 text-xl font-semibold">Ringkasan untuk validasi server</h2>
        <dl className="mt-6 space-y-4 text-sm">
          {resolvedItems.map(({ item, match }) => match ? (
            <div key={item.variantId} className="border-b border-border pb-4">
              <dt className="font-medium">{match.product.name}</dt>
              <dd className="mt-1 flex justify-between gap-4 text-muted-foreground"><span>{match.variant.name} · {item.quantity} item</span><span className="shrink-0 tabular-nums">{rupiah.format(BigInt(match.variant.priceRp) * BigInt(item.quantity))}</span></dd>
            </div>
          ) : null)}
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Subtotal browser</dt><dd className="font-medium tabular-nums">{rupiah.format(subtotal)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Pengiriman simulasi</dt><dd className="font-medium tabular-nums">{selectedShipping ? rupiah.format(shippingTotal) : "Belum dipilih"}</dd></div>
          <div className="flex justify-between gap-4 border-t border-border pt-4 text-base"><dt className="font-semibold">Estimasi total</dt><dd className="font-semibold tabular-nums">{selectedShipping ? rupiah.format(estimatedTotal) : "Belum lengkap"}</dd></div>
        </dl>

        <div className="mt-6 space-y-3 border-l-2 border-brand-300 pl-4 text-sm leading-6 text-muted-foreground">
          <p><span className="font-medium text-foreground">Browser:</span> mengumpulkan input dan menampilkan estimasi.</p>
          <p><span className="font-medium text-foreground">Server:</span> memuat ulang produk, stok, harga, ongkir, dan total.</p>
          <p><span className="font-medium text-foreground">Provider:</span> {demoMode ? "adapter demo deterministik; tidak ada network call." : isLive ? "dihubungi setelah data server valid; callback tetap diverifikasi." : "baru dihubungi setelah data server valid."}</p>
        </div>

        <Button type="submit" size="lg" disabled={!hydrated || busy || shippingStatus !== "ready" || !selectedShippingId} className="mt-6 min-h-11 w-full">
          {busy ? (isLive ? demoMode ? "Membuat order demo…" : "Membuat order…" : "Memeriksa preview…") : isLive ? demoMode ? "Buat order demo" : "Buat order dan lanjutkan pembayaran" : "Tinjau checkout"}
        </Button>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{demoMode ? "Mode demo: server memvalidasi ulang harga, stok, ongkir, total, dan menulis order ke database lokal. Tidak ada provider eksternal." : isLive ? "Server akan memvalidasi ulang seluruh harga, stok, ongkir, dan total. Jangan anggap pembayaran berhasil dari browser." : "Tombol ini hanya menguji alur frontend. Tidak ada order, reservasi, tarif provider, atau pembayaran yang dibuat."}</p>
        <noscript><p className="mt-3 text-sm text-destructive">Aktifkan JavaScript untuk membaca Cart lokal dan meninjau checkout.</p></noscript>
      </aside>
    </form>
  );
}
