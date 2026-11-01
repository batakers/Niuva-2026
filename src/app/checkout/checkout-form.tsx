"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cartStorageKey, EMPTY_CART, readCart, type CartSnapshot } from "@/features/cart/cart-state";
import type { PreviewScenario, PublicShopProduct } from "@/features/frontend-preview/types";
import { getShopDisplayCopy } from "@/features/public/shop-display-copy";
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

const checkoutOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "WAITING_FOR_APPROVAL",
  "WAITING_PAYMENT",
  "IN_PRODUCTION",
  "FINISHING_QC",
  "WAITING_SHIPPING_PAYMENT",
]);

type CheckoutOrderStatus = z.infer<typeof checkoutOrderStatusSchema>;

const checkoutPaymentResponseSchema = z.object({
  provider: z.string().min(1).optional(),
  redirectUrl: z.url({ protocol: /^https?$/ }).optional(),
  token: z.string().min(1).optional(),
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
  payment: checkoutPaymentResponseSchema,
  paymentAttemptId: z.uuid(),
  totalRp: z.string().regex(/^\d+$/),
});

const checkoutReplayResponseSchema = z.object({
  accessToken: z.string().min(1),
  kind: z.literal("REPLAY"),
  orderId: z.uuid(),
  orderNumber: z.string().min(1),
  payment: checkoutPaymentResponseSchema,
  paymentAttemptId: z.uuid(),
  status: checkoutOrderStatusSchema,
  totalRp: z.string().regex(/^\d+$/),
});

const checkoutResponseSchema = z.discriminatedUnion("kind", [
  checkoutCreatedResponseSchema,
  checkoutReplayResponseSchema,
]);

const checkoutIdempotencyKeySchema = z.string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._~-]+$/);

const checkoutRecoveryStorageSchema = z.object({
  orderNumber: z.string().min(1),
  orderStatusToken: z.string().min(1),
  paymentRedirectUrl: z.url({ protocol: /^https?$/ }).optional(),
  status: checkoutOrderStatusSchema,
});

const previewShippingOptions: readonly ShippingPreviewOption[] = [
  { id: "preview-regular", carrier: "Kurir contoh", service: "Regular", eta: "2 sampai 4 hari", priceRp: "24000" },
  { id: "preview-economy", carrier: "Kurir contoh", service: "Ekonomi", eta: "4 sampai 7 hari", priceRp: "17000" },
];

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors read-only:border-border read-only:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const stepClass = "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7";
const legendClass = "mb-5 flex items-center gap-3 text-xl font-medium tracking-[-0.015em]";

function StepNumber({ value }: { value: number }) {
  return <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-ui font-semibold text-brand-800 tabular-nums">{value}</span>;
}
const rupiah = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });
const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "niuva.checkout.idempotency-key";
const CHECKOUT_RECOVERY_STORAGE_KEY = "niuva.checkout.recovery";

const orderStatusLabels: Record<CheckoutOrderStatus, string> = {
  CANCELLED: "dibatalkan",
  COMPLETED: "selesai",
  FINISHING_QC: "finishing dan quality control",
  IN_PRODUCTION: "dalam produksi",
  PAID: "pembayaran terverifikasi",
  PENDING_PAYMENT: "menunggu pembayaran",
  PROCESSING: "sedang diproses",
  READY_TO_SHIP: "siap dikirim",
  SHIPPED: "dikirim",
  SUBMITTED: "diajukan",
  UNDER_REVIEW: "sedang ditinjau",
  WAITING_FOR_APPROVAL: "menunggu persetujuan",
  WAITING_PAYMENT: "menunggu pembayaran",
  WAITING_SHIPPING_PAYMENT: "menunggu pembayaran pengiriman",
};

class CheckoutClientError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "CheckoutClientError";
  }
}

const checkoutApiErrorSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
}).partial();

function checkoutApiErrorMessage(code: string | undefined, fallback: string): string {
  if (code === "OUT_OF_STOCK") return "Stok berubah saat checkout. Periksa keranjang, lalu coba lagi.";
  if (code === "SHIPPING_PROVIDER_UNAVAILABLE") return "Tarif pengiriman sudah tidak tersedia. Muat ulang opsi pengiriman, lalu coba lagi.";
  if (code === "PROVIDER_UNAVAILABLE") return "Layanan pembayaran belum tersedia. Coba lagi sebentar lagi.";
  if (code === "CONFLICT") return "Data checkout berubah. Periksa keranjang, lalu coba lagi.";
  return fallback;
}

async function readCheckoutResponse<T>(response: Response, schema: z.ZodType<T>, fallbackMessage: string): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CheckoutClientError(fallbackMessage);
  }

  if (!response.ok) {
    const parsedError = checkoutApiErrorSchema.safeParse(payload);
    throw new CheckoutClientError(
      parsedError.success
        ? checkoutApiErrorMessage(parsedError.data.code, parsedError.data.error ?? fallbackMessage)
        : fallbackMessage,
      parsedError.success ? parsedError.data.code : undefined,
    );
  }

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
  customer,
  demoMode = false,
  initialScenario,
  liveCatalogError = false,
  liveEnabled = false,
  previewEnabled,
  products,
}: {
  catalogStatus: PreviewScenario | null;
  customer?: Readonly<{
    displayName: string | null;
    email: string;
  }>;
  demoMode?: boolean;
  initialScenario?: string | string[];
  liveCatalogError?: boolean;
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
  const [serverErrorCode, setServerErrorCode] = useState<string>();
  const [orderNumber, setOrderNumber] = useState<string>();
  const [orderStatus, setOrderStatus] = useState<CheckoutOrderStatus>("PENDING_PAYMENT");
  const [orderStatusToken, setOrderStatusToken] = useState<string>();
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string>();
  const [reviewingRates, setReviewingRates] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idempotencyKeyRef = useRef<string | undefined>(undefined);

  // A `?preview=` scenario checks out the example cart, never the real one.
  const storageKey = cartStorageKey(catalogStatus !== null);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const cart = readCart(window.localStorage, storageKey);
      setSnapshot(cart.snapshot);
      setStorageAvailable(cart.storageAvailable);
      if (isLive) {
        const storedIdempotencyKey = checkoutIdempotencyKeySchema.safeParse(
          window.sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY),
        );
        if (storedIdempotencyKey.success) {
          idempotencyKeyRef.current = storedIdempotencyKey.data;
        }

        const storedRecovery = window.sessionStorage.getItem(CHECKOUT_RECOVERY_STORAGE_KEY);
        if (storedRecovery !== null) {
          try {
            const parsedRecovery = checkoutRecoveryStorageSchema.safeParse(
              JSON.parse(storedRecovery) as unknown,
            );
            if (parsedRecovery.success) {
              setOrderNumber(parsedRecovery.data.orderNumber);
              setOrderStatusToken(parsedRecovery.data.orderStatusToken);
              setPaymentRedirectUrl(parsedRecovery.data.paymentRedirectUrl);
              setOrderStatus(parsedRecovery.data.status);
              setResult("payment-pending");
            }
          } catch {
            window.sessionStorage.removeItem(CHECKOUT_RECOVERY_STORAGE_KEY);
          }
        }
      }
      setLoadState("ready");
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [isLive, storageKey]);

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
    setServerErrorCode(undefined);
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
      setServerErrorCode(error instanceof CheckoutClientError ? error.code : undefined);
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
    setServerErrorCode(undefined);
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
    try {
      window.sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, idempotencyKey);
    } catch {
      // Checkout still remains server-idempotent for this page lifetime.
    }
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
    setServerErrorCode(undefined);
    if (isLive) {
      void submitLiveCheckout(event.currentTarget)
        .then((response) => {
          pending.current = false;
          if (response.kind === "CREATED") {
            setOrderNumber(response.orderNumber);
            setOrderStatusToken(response.accessToken);
            setPaymentRedirectUrl(response.payment.redirectUrl);
            setOrderStatus("PENDING_PAYMENT");
          } else {
            setOrderNumber(response.orderNumber);
            setOrderStatusToken(response.accessToken);
            setPaymentRedirectUrl(response.payment.redirectUrl);
            setOrderStatus(response.status);
          }
          try {
            window.sessionStorage.setItem(CHECKOUT_RECOVERY_STORAGE_KEY, JSON.stringify({
              orderNumber: response.orderNumber,
              orderStatusToken: response.accessToken,
              ...(response.payment.redirectUrl === undefined
                ? {}
                : { paymentRedirectUrl: response.payment.redirectUrl }),
              status: response.kind === "CREATED" ? "PENDING_PAYMENT" : response.status,
            }));
          } catch {
            // The server response remains usable even when session storage is blocked.
          }
          setResult("payment-pending");
        })
        .catch((error) => {
          pending.current = false;
          setServerError(error instanceof CheckoutClientError ? error.message : "Checkout belum dapat dibuat. Coba lagi.");
          setServerErrorCode(error instanceof CheckoutClientError ? error.code : undefined);
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
    setServerErrorCode(undefined);
    setOrderNumber(undefined);
    setOrderStatus("PENDING_PAYMENT");
    setOrderStatusToken(undefined);
    setPaymentRedirectUrl(undefined);
    if (isLive) {
      idempotencyKeyRef.current = undefined;
      try {
        window.sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
        window.sessionStorage.removeItem(CHECKOUT_RECOVERY_STORAGE_KEY);
      } catch {
        // Nothing else is required to reset the in-memory checkout state.
      }
      setSelectedShippingId(null);
      setShippingStatus("idle");
      setShippingOptions([]);
    }
  }

  const cartHref = previewEnabled ? "/cart?preview=examples" : "/cart";
  const shopHref = previewEnabled ? "/shop?preview=examples" : "/shop";

  if (loadState === "loading") {
    return (
      <section aria-label="Memuat checkout" aria-busy="true" role="status" className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <div className="space-y-4"><p className="text-ui text-muted-foreground">Membaca isi keranjang…</p><div className="h-80 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" /></div>
        <div className="h-72 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
      </section>
    );
  }

  if ((!previewEnabled || catalogStatus !== "examples") && !isLive) {
    if (liveCatalogError) {
      return (
        <StatusNotice
          action={<NiuvaLink href="/checkout" variant="outline" className="min-h-11">Muat ulang checkout</NiuvaLink>}
          description="Katalog atau layanan pembayaran sedang tidak dapat dijangkau. Belum ada pesanan atau pembayaran yang dibuat."
          title="Checkout belum dapat dimuat."
          tone="error"
        />
      );
    }
    return (
      <StatusNotice
        tone="info"
        title="Checkout belum tersedia untuk transaksi."
        description="Produk atau layanan pembayaran belum siap. Isi keranjang tetap tersimpan, dan belum ada pesanan yang dibuat."
        action={<NiuvaLink href="/cart" variant="outline" className="min-h-11">Kembali ke keranjang</NiuvaLink>}
      />
    );
  }

  if (!storageAvailable) {
    return <StatusNotice tone="error" title="Isi keranjang tidak bisa dibaca." description="Browser ini menolak penyimpanan. Izinkan penyimpanan situs, lalu buka keranjang lagi." action={<NiuvaLink href={cartHref} variant="outline" className="min-h-11">Kembali ke keranjang</NiuvaLink>} />;
  }

  if (snapshot.items.length === 0) {
    return <StatusNotice tone="info" title="Belum ada produk untuk checkout." description="Tambahkan produk ke keranjang dulu, lalu kembali ke sini." action={<NiuvaLink href={shopHref} variant="outline" className="min-h-11">Lihat Toko</NiuvaLink>} />;
  }

  if (hasUnavailableItem) {
    return <StatusNotice tone="warning" title="Keranjang perlu diperiksa lagi." description="Ada produk yang tidak dikenali atau jumlahnya melebihi stok. Perbaiki keranjang sebelum melanjutkan." action={<NiuvaLink href={cartHref} variant="outline" className="min-h-11">Buka keranjang</NiuvaLink>} />;
  }

  const busy = result === "submitting" || reviewingRates;
  const totalQuantity = snapshot.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <form noValidate onSubmit={submit} aria-label="Form checkout Customer" aria-busy={busy} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
      <div className="min-w-0 space-y-6">
        {isLive && demoMode ? (
          <aside aria-label="Checkout demo lokal" className="rounded-[var(--radius-control)] border border-success-border bg-success-background p-4 text-success">
            <p className="text-ui font-semibold">Checkout demo lokal aktif</p>
            <p className="mt-1 text-ui font-normal leading-[1.55]">Pesanan disimpan di database lokal. Pembayaran dan kurir memakai adapter demo, jadi tidak ada panggilan keluar.</p>
          </aside>
        ) : null}
        {!isLive ? (
          <aside aria-label="Kontrol preview checkout" className="rounded-[var(--radius-control)] border border-info-border bg-info-background p-4 text-info">
            <p className="text-ui font-semibold">Preview lokal · tidak membuat transaksi</p>
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
        ) : null}

        <div ref={statusRef} tabIndex={-1} className="rounded-[var(--radius-control)] empty:hidden focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {Object.keys(errors).length > 0 ? (
            <div role="alert" className="rounded-[var(--radius-control)] border border-destructive-border bg-destructive-background p-4 text-destructive">
              <p className="text-ui font-semibold">Periksa kembali data checkout.</p>
              <ul className="mt-2 list-inside list-disc text-ui font-normal">
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
          {result === "submitting" ? <p role="status" className="text-ui text-muted-foreground">{isLive ? demoMode ? "Membuat pesanan demo…" : "Membuat pesanan…" : "Memeriksa simulasi checkout… Data tidak dikirim."}</p> : null}
          {result === "reviewed" ? <StatusNotice tone="success" title="Preview checkout siap ditinjau." description="Kontak, alamat, dan opsi pengiriman lolos validasi lokal. Belum ada pesanan, pembayaran, atau data yang dikirim." /> : null}
          {result === "payment-pending" && isLive ? (
            <StatusNotice
              action={
                <div className="flex flex-wrap gap-2">
                  {paymentRedirectUrl && orderStatus === "PENDING_PAYMENT" ? (
                    <a className={buttonVariants({ className: "min-h-11" })} href={paymentRedirectUrl} rel="noreferrer" target="_blank">
                      {demoMode ? "Buka pembayaran demo" : "Buka pembayaran sandbox"}
                    </a>
                  ) : null}
                  {orderStatusToken ? <NiuvaLink className="min-h-11" href={`/orders/${orderStatusToken}`} variant="outline">Lihat status pesanan</NiuvaLink> : null}
                </div>
              }
              description={demoMode
                ? orderNumber ? `Pesanan ${orderNumber} tersimpan di database lokal dengan status ${orderStatusLabels[orderStatus]}. Tidak ada layanan luar yang dipanggil.` : `Pesanan demo tersimpan di database lokal dengan status ${orderStatusLabels[orderStatus]}.`
                : orderNumber
                  ? orderStatus === "PENDING_PAYMENT"
                    ? `Pesanan ${orderNumber} sudah dibuat. Selesaikan pembayaran; statusnya berubah setelah pembayaran dikonfirmasi.`
                    : `Pesanan ${orderNumber} berstatus ${orderStatusLabels[orderStatus]}.`
                  : `Pesanan sudah dibuat dengan status ${orderStatusLabels[orderStatus]}.`}
              title={demoMode ? "Pesanan demo tersimpan." : orderStatus === "PENDING_PAYMENT" ? "Pesanan tersimpan, menunggu pembayaran." : "Status pesanan dipulihkan."}
              tone={orderStatus === "PENDING_PAYMENT" ? "info" : "success"}
            />
          ) : null}
          {result === "payment-pending" && !isLive ? <StatusNotice tone="info" title="Simulasi pembayaran masih menunggu." description="Status pembayaran tidak ditentukan di halaman ini. Pada transaksi nyata, status berubah setelah pembayaran dikonfirmasi." action={<Button type="button" variant="outline" className="min-h-11" onClick={resetOutcome}>Kembali ke ringkasan</Button>} /> : null}
          {result === "payment-error" ? <StatusNotice tone="error" title={isLive ? "Pesanan belum dapat dibuat." : "Simulasi pembayaran gagal."} description={isLive ? serverError ?? "Periksa data, lalu coba lagi." : "Isian checkout tetap tersedia dan tidak ada transaksi nyata. Kembali ke skenario siap untuk mencoba alur pemulihan."} action={isLive && serverErrorCode === "OUT_OF_STOCK" ? <NiuvaLink href="/cart" variant="outline" className="min-h-11">Buka keranjang</NiuvaLink> : <Button type="button" variant="outline" className="min-h-11" onClick={resetOutcome}>Coba lagi</Button>} /> : null}
        </div>

        <div className={stepClass}>
          <fieldset disabled={busy} className="min-w-0">
            <legend className={legendClass}><StepNumber value={1} />Kontak pemesan</legend>
            <p className="-mt-2 mb-5 text-ui font-normal leading-[1.55] text-muted-foreground">Nama dan email diambil dari akun Anda. Tanda * menandai isian wajib.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="checkout-customerName" label="Nama pemesan" required error={errors.customerName} className="sm:col-span-2"><Input name="customerName" autoComplete="name" defaultValue={customer?.displayName ?? customer?.email ?? ""} readOnly required className={controlClass} /></FormField>
              <FormField id="checkout-customerEmail" label="Email terverifikasi" required error={errors.customerEmail}><Input name="customerEmail" type="email" autoComplete="email" defaultValue={customer?.email ?? ""} readOnly required className={controlClass} /></FormField>
              <FormField id="checkout-customerPhone" label="Nomor WhatsApp pemesan" required error={errors.customerPhone} description="Dipakai bila ada pertanyaan tentang pesanan."><Input name="customerPhone" type="tel" autoComplete="tel" required className={controlClass} /></FormField>
            </div>
          </fieldset>
        </div>

        <div className={stepClass}>
          <fieldset disabled={busy} className="min-w-0">
            <legend className={legendClass}><StepNumber value={2} />Alamat penerima</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="checkout-recipientName" label="Nama penerima" required error={errors.recipientName}><Input name="recipientName" autoComplete="shipping name" required className={controlClass} /></FormField>
              <FormField id="checkout-addressPhone" label="Nomor WhatsApp penerima" required error={errors.addressPhone}><Input name="addressPhone" type="tel" autoComplete="shipping tel" required className={controlClass} /></FormField>
              <FormField id="checkout-addressLine" label="Alamat lengkap" required error={errors.addressLine} description="Nama jalan, nomor bangunan, RT/RW, dan petunjuk yang membantu kurir." className="sm:col-span-2"><textarea name="addressLine" autoComplete="shipping street-address" required rows={3} className={controlClass} /></FormField>
              <FormField id="checkout-district" label="Kecamatan" error={errors.district}><Input name="district" autoComplete="shipping address-level3" className={controlClass} /></FormField>
              <FormField id="checkout-city" label="Kota atau kabupaten" required error={errors.city}><Input name="city" autoComplete="shipping address-level2" required className={controlClass} /></FormField>
              <FormField id="checkout-province" label="Provinsi" required error={errors.province}><Input name="province" autoComplete="shipping address-level1" required className={controlClass} /></FormField>
              <FormField id="checkout-postalCode" label="Kode pos" required error={errors.postalCode}><Input name="postalCode" inputMode="numeric" autoComplete="shipping postal-code" required maxLength={5} className={controlClass} /></FormField>
              <FormField id="checkout-country" label="Negara" variant="readOnly" className="sm:col-span-2"><Input value="Indonesia" readOnly className={controlClass} /></FormField>
            </div>
            <Button type="button" variant="outline" className="mt-6 min-h-11" disabled={reviewingRates} onClick={reviewRates}>{reviewingRates ? "Memuat opsi pengiriman…" : "Tinjau opsi pengiriman"}</Button>
          </fieldset>
        </div>

        <ShippingOptions mode={mode} status={shippingStatus} options={shippingOptions} selectedId={selectedShippingId} error={errors.shippingOption} onChange={value => { setSelectedShippingId(value); setErrors(clearShippingError); setResult("idle"); }} onRetry={retryRates} />
      </div>

      <aside aria-labelledby="checkout-summary-title" className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 id="checkout-summary-title" className="text-xl font-medium tracking-[-0.015em]">Ringkasan pesanan</h2>
        <ul className="mt-5 divide-y divide-border border-y border-border">
          {resolvedItems.map(({ item, match }) => match ? (
            <li key={item.variantId} className="py-3">
              <p className="text-ui font-medium">{getShopDisplayCopy(match.product).name}</p>
              <p className="mt-0.5 flex justify-between gap-4 text-caption text-muted-foreground"><span>{match.variant.name} · {item.quantity} barang</span><span className="shrink-0 text-ui font-medium tabular-nums text-foreground">{rupiah.format(BigInt(match.variant.priceRp) * BigInt(item.quantity))}</span></p>
            </li>
          ) : null)}
        </ul>
        <dl className="mt-4 space-y-3 text-ui">
          <div className="flex items-baseline justify-between gap-4"><dt className="font-normal text-muted-foreground">Subtotal ({totalQuantity} barang)</dt><dd className="font-medium tabular-nums">{rupiah.format(subtotal)}</dd></div>
          <div className="flex items-baseline justify-between gap-4"><dt className="font-normal text-muted-foreground">{isLive ? "Ongkir" : "Ongkir (contoh)"}</dt><dd className="text-right font-medium tabular-nums">{selectedShipping ? rupiah.format(shippingTotal) : "Pilih di langkah 3"}</dd></div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3"><dt className="font-semibold">Perkiraan total</dt><dd className="text-right text-lead font-semibold tabular-nums">{selectedShipping ? rupiah.format(estimatedTotal) : "Belum lengkap"}</dd></div>
        </dl>

        <Button type="submit" size="lg" disabled={!hydrated || busy || shippingStatus !== "ready" || !selectedShippingId} className="mt-6 min-h-12 w-full">
          {busy ? (isLive ? demoMode ? "Membuat pesanan demo…" : "Membuat pesanan…" : "Memeriksa preview…") : isLive ? demoMode ? "Buat pesanan demo" : "Buat pesanan" : "Tinjau checkout"}
        </Button>
        <p className="mt-3 text-caption leading-[1.45] text-muted-foreground">{demoMode ? "Mode demo: harga, stok, ongkir, dan total diperiksa ulang, lalu pesanan disimpan di database lokal." : isLive ? "Harga, stok, ongkir, dan total diperiksa lagi saat pesanan dibuat. Pesanan dianggap lunas setelah pembayaran dikonfirmasi." : "Preview lokal: tombol ini hanya menguji alur. Tidak ada pesanan, tarif, atau pembayaran yang dibuat."}</p>
        <noscript><p className="mt-3 text-ui text-destructive">Aktifkan JavaScript untuk membaca keranjang dan menyelesaikan checkout.</p></noscript>
      </aside>
    </form>
  );
}
