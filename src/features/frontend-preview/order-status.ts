import "server-only";

import type { OrderStatus } from "@/generated/prisma/client";
import {
  orderStatusDescription,
  orderStatusLabel,
  shipmentStatusLabel,
} from "@/features/customer-status/labels";
import { OrderStatusService, type PublicOrderStatus } from "@/modules/order/status-service";

export type OrderStatusPreviewScenario =
  | "live"
  | "retail-paid"
  | "retail-processing"
  | "retail-ready-to-ship"
  | "retail-shipped"
  | "retail-completed"
  | "custom-quote-pending"
  | "custom-quote-accepted"
  | "custom-production"
  | "custom-awaiting-shipping-payment"
  | "cancelled"
  | "late-payment"
  | "loading"
  | "service-error"
  | "expired-token"
  | "revoked-token";

export type OrderStatusPreview = Readonly<{
  createdAt: string;
  currentDescription: string;
  currentLabel: string;
  items: readonly Readonly<{
    label: string;
    quantity: number;
    total: string;
  }>[];
  nextAction: Readonly<{
    description: string;
    kind: "none" | "quote" | "payment-unavailable" | "shipping-payment-unavailable" | "support";
    label?: string;
    quoteHref?: string;
    title: string;
    tone: "success" | "warning" | "info" | "error";
  }>;
  orderNumber: string;
  orderType: "RETAIL" | "CUSTOM_PRINT";
  payment?: Readonly<{
    expiresAt: string;
    purpose: "ORDER_TOTAL" | "CUSTOM_SHIPPING";
    redirectUrl?: string;
    token?: string;
  }>;
  paidAt: string | null;
  shipment: Readonly<{
    status: string;
    trackingNumber: string | null;
  }> | null;
  steps: readonly Readonly<{
    description?: string;
    id: string;
    label: string;
    state: "pending" | "current" | "completed" | "delayed" | "failed" | "cancelled";
    timestamp?: string;
  }>[];
  total: string;
}>;

export type OrderStatusPreviewResult =
  | Readonly<{ kind: "ready"; order: OrderStatusPreview; scenario: OrderStatusPreviewScenario }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "service-error" }>
  | Readonly<{ kind: "access-denied"; reason: "expired" | "revoked" }>;

const supportedScenarios: readonly OrderStatusPreviewScenario[] = [
  "retail-paid",
  "retail-processing",
  "retail-ready-to-ship",
  "retail-shipped",
  "retail-completed",
  "custom-quote-pending",
  "custom-quote-accepted",
  "custom-production",
  "custom-awaiting-shipping-payment",
  "cancelled",
  "late-payment",
  "loading",
  "service-error",
  "expired-token",
  "revoked-token",
];

function resolveScenario(requested: unknown): OrderStatusPreviewScenario {
  return typeof requested === "string" && supportedScenarios.includes(requested as OrderStatusPreviewScenario)
    ? requested as OrderStatusPreviewScenario
    : "retail-paid";
}

export async function getOrderStatusPreview(input: Readonly<{
  preview: unknown;
  state: unknown;
  token: string;
}>): Promise<OrderStatusPreviewResult | null> {
  const isExplicitDevelopmentPreview =
    process.env.NODE_ENV === "development" &&
    input.preview === "examples" &&
    input.token === "preview-order";

  if (!isExplicitDevelopmentPreview) return null;

  const scenario = resolveScenario(input.state);

  if (scenario === "loading") return { kind: "loading" };
  if (scenario === "service-error") return { kind: "service-error" };
  if (scenario === "expired-token") return { kind: "access-denied", reason: "expired" };
  if (scenario === "revoked-token") return { kind: "access-denied", reason: "revoked" };

  const { buildExampleOrderStatus } = await import("./order-status-fixture");

  return {
    kind: "ready",
    order: buildExampleOrderStatus(scenario),
    scenario,
  };
}

const publicDateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const publicCurrencyFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

/** Public, token-authorized server projection for an order status page. */
export async function getLiveOrderStatus(input: Readonly<{
  orderId: string;
  token: string;
}>): Promise<Readonly<{ kind: "ready"; order: OrderStatusPreview; scenario: "live" }>> {
  const order = await new OrderStatusService().getPublicStatus(input);
  return {
    kind: "ready",
    order: toOrderStatusPreview(order),
    scenario: "live",
  };
}

function toOrderStatusPreview(order: PublicOrderStatus): OrderStatusPreview {
  const custom = order.orderType === "CUSTOM_PRINT";
  const items = order.items.map((item) => ({
    label: item.nameSnapshot,
    quantity: item.quantity,
    total: publicCurrencyFormatter.format(BigInt(toIntegerString(item.lineTotalRp))),
  }));
  const fallbackTotal = order.items.reduce(
    (total, item) => total + BigInt(toIntegerString(item.lineTotalRp)),
    BigInt(0),
  );
  const total = publicCurrencyFormatter.format(
    BigInt(toIntegerString(order.grandTotalRp ?? fallbackTotal)),
  );
  const steps = buildOrderSteps(order);

  return {
    createdAt: publicDateFormatter.format(order.createdAt),
    currentDescription: orderStatusDescription(order.status, custom),
    currentLabel: orderStatusLabel(order.status, custom),
    items,
    nextAction: orderNextAction(order.status, custom),
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    ...(order.payment === undefined
      ? {}
      : {
          payment: {
            expiresAt: publicDateFormatter.format(order.payment.expiresAt),
            purpose: order.payment.purpose,
            ...(order.payment.redirectUrl === undefined ? {} : { redirectUrl: order.payment.redirectUrl }),
            ...(order.payment.token === undefined ? {} : { token: order.payment.token }),
          },
        }),
    paidAt: order.paidAt === null ? null : publicDateFormatter.format(order.paidAt),
    shipment: order.shipments[0]
      ? {
          status: shipmentStatusLabel(order.shipments[0].status),
          trackingNumber: order.shipments[0].trackingNumber,
        }
      : null,
    steps,
    total,
  };
}

/** Timeline steps for one stored order; the token status page and the Customer account share them. */
export function buildOrderSteps(order: Pick<
  PublicOrderStatus,
  "cancelledAt" | "completedAt" | "createdAt" | "orderType" | "paidAt" | "status"
>): OrderStatusPreview["steps"] {
  const custom = order.orderType === "CUSTOM_PRINT";
  const stages = custom ? customStages : retailStages;

  if (order.status === "CANCELLED") {
    return [
      ...stages.map((stage) => ({
        description: stage.description,
        id: stage.id,
        label: stage.label,
        state: "pending" as const,
      })),
      {
        description: "Pesanan dihentikan.",
        id: "cancelled",
        label: "Pesanan dibatalkan",
        state: "cancelled" as const,
        ...(order.cancelledAt === null
          ? {}
          : { timestamp: publicDateFormatter.format(order.cancelledAt) }),
      },
    ];
  }

  const currentIndex = currentStageIndex(order.status, custom);
  return stages.map((stage, index) => ({
    description: stage.description,
    id: stage.id,
    label: stage.label,
    state:
      index < currentIndex
        ? ("completed" as const)
        : index === currentIndex
          ? ("current" as const)
          : ("pending" as const),
    ...(index === 0 ? { timestamp: publicDateFormatter.format(order.createdAt) } : {}),
    ...(stage.id === "paid" && order.paidAt !== null
      ? { timestamp: publicDateFormatter.format(order.paidAt) }
      : {}),
    ...(stage.id === "completed" && order.completedAt !== null
      ? { timestamp: publicDateFormatter.format(order.completedAt) }
      : {}),
  }));
}

type Stage = Readonly<{ description: string; id: string; label: string }>;

const retailStages: readonly Stage[] = [
  { description: "Pesanan tercatat dan menunggu pembayaran.", id: "payment", label: "Pembayaran" },
  { description: "Pembayaran sudah dikonfirmasi.", id: "paid", label: "Pembayaran terverifikasi" },
  { description: "Pesanan sedang diproses.", id: "processing", label: "Diproses" },
  { description: "Paket siap diserahkan ke kurir.", id: "ready-to-ship", label: "Siap dikirim" },
  { description: "Paket telah diserahkan ke kurir.", id: "shipped", label: "Dikirim" },
  { description: "Pesanan selesai.", id: "completed", label: "Selesai" },
];

const customStages: readonly Stage[] = [
  { description: "Pesanan custom menunggu pembayaran.", id: "payment", label: "Pembayaran" },
  { description: "Pembayaran sudah dikonfirmasi.", id: "paid", label: "Pembayaran terverifikasi" },
  { description: "Pekerjaan masuk produksi.", id: "production", label: "Produksi" },
  { description: "Finishing dan quality control berjalan.", id: "qc", label: "Finishing & QC" },
  { description: "Paket final diukur dan menunggu pembayaran pengiriman.", id: "shipping-payment", label: "Pengukuran paket" },
  { description: "Paket siap diserahkan ke kurir.", id: "ready-to-ship", label: "Siap dikirim" },
  { description: "Paket telah diserahkan ke kurir.", id: "shipped", label: "Dikirim" },
  { description: "Pesanan selesai.", id: "completed", label: "Selesai" },
];

function currentStageIndex(status: OrderStatus, custom: boolean): number {
  if (!custom) {
    const indexByStatus: Readonly<Record<string, number>> = {
      PENDING_PAYMENT: 0,
      PAID: 1,
      PROCESSING: 2,
      READY_TO_SHIP: 3,
      SHIPPED: 4,
      COMPLETED: 5,
    };
    return indexByStatus[status] ?? 0;
  }

  const indexByStatus: Readonly<Record<string, number>> = {
    WAITING_PAYMENT: 0,
    PAID: 1,
    IN_PRODUCTION: 2,
    FINISHING_QC: 3,
    WAITING_SHIPPING_PAYMENT: 4,
    READY_TO_SHIP: 5,
    SHIPPED: 6,
    COMPLETED: 7,
  };
  return indexByStatus[status] ?? 0;
}

/** What the Customer can expect next for a stored status; shared with the Customer account. */
export function orderNextAction(status: OrderStatus, custom: boolean): OrderStatusPreview["nextAction"] {
  if (status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT") {
    return {
      description: "Bayar hanya melalui instruksi resmi Niuva. Status berubah setelah pembayaran dikonfirmasi.",
      kind: "support",
      title: "Pembayaran masih menunggu",
      tone: "warning",
    };
  }
  if (status === "WAITING_SHIPPING_PAYMENT") {
    return {
      description: "Paket final sudah diukur. Hubungi Niuva melalui kanal konfirmasi untuk instruksi pembayaran pengiriman; status berubah setelah pembayaran dikonfirmasi.",
      kind: "support",
      title: "Pembayaran pengiriman menunggu instruksi",
      tone: "warning",
    };
  }
  if (status === "CANCELLED") {
    return {
      description: "Pesanan tidak dibuka kembali otomatis. Hubungi Niuva bila ada pembayaran terlambat atau perlu penanganan khusus.",
      kind: "support",
      title: "Hubungi Niuva bila perlu bantuan",
      tone: "error",
    };
  }
  if (status === "COMPLETED") {
    return { description: "Tidak ada tindakan berikutnya pada status ini.", kind: "none", title: "Pesanan selesai", tone: "success" };
  }
  return {
    description: custom ? "Tim Niuva memperbarui status saat tahap custom berikutnya dimulai." : "Tim Niuva memperbarui status saat pesanan masuk tahap berikutnya.",
    kind: "none",
    title: "Menunggu tahap berikutnya",
    tone: "info",
  };
}

function toIntegerString(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value).toString();
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (value !== null && typeof value === "object" && "toString" in value) {
    const text = String(value);
    return /^\d+(?:\.\d+)?$/.test(text) ? text.split(".")[0] ?? "0" : "0";
  }
  return "0";
}
