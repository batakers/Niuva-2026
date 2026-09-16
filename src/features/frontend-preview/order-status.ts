import "server-only";

import type { OrderStatus } from "@/generated/prisma/client";
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
    title: string;
    tone: "success" | "warning" | "info" | "error";
  }>;
  orderNumber: string;
  orderType: "RETAIL" | "CUSTOM_PRINT";
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
  const stages = custom ? customStages : retailStages;
  const currentIndex = currentStageIndex(order.status, custom);
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
  const cancelled = order.status === "CANCELLED";
  const steps = cancelled
    ? [
        ...stages.map((stage) => ({
          description: stage.description,
          id: stage.id,
          label: stage.label,
          state: "pending" as const,
        })),
        {
          description: "Order dihentikan sesuai status server.",
          id: "cancelled",
          label: "Order dibatalkan",
          state: "cancelled" as const,
          timestamp: publicDateFormatter.format(order.createdAt),
        },
      ]
    : stages.map((stage, index) => ({
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

  return {
    createdAt: publicDateFormatter.format(order.createdAt),
    currentDescription: statusDescription(order.status, custom),
    currentLabel: statusLabel(order.status, custom),
    items,
    nextAction: nextAction(order.status, custom),
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    paidAt: order.paidAt === null ? null : publicDateFormatter.format(order.paidAt),
    shipment: order.shipments[0]
      ? {
          status: order.shipments[0].status,
          trackingNumber: order.shipments[0].trackingNumber,
        }
      : null,
    steps,
    total,
  };
}

type Stage = Readonly<{ description: string; id: string; label: string }>;

const retailStages: readonly Stage[] = [
  { description: "Order tercatat dan menunggu pembayaran.", id: "payment", label: "Pembayaran" },
  { description: "Pembayaran terverifikasi oleh server.", id: "paid", label: "Pembayaran terverifikasi" },
  { description: "Pesanan sedang diproses.", id: "processing", label: "Diproses" },
  { description: "Paket siap diserahkan ke kurir.", id: "ready-to-ship", label: "Siap dikirim" },
  { description: "Paket telah diserahkan ke kurir.", id: "shipped", label: "Dikirim" },
  { description: "Order selesai.", id: "completed", label: "Selesai" },
];

const customStages: readonly Stage[] = [
  { description: "Order custom menunggu pembayaran.", id: "payment", label: "Pembayaran" },
  { description: "Pembayaran terverifikasi oleh server.", id: "paid", label: "Pembayaran terverifikasi" },
  { description: "Pekerjaan masuk produksi.", id: "production", label: "Produksi" },
  { description: "Finishing dan quality control berjalan.", id: "qc", label: "Finishing & QC" },
  { description: "Paket final diukur dan menunggu pembayaran pengiriman.", id: "shipping-payment", label: "Pengukuran paket" },
  { description: "Paket siap diserahkan ke kurir.", id: "ready-to-ship", label: "Siap dikirim" },
  { description: "Paket telah diserahkan ke kurir.", id: "shipped", label: "Dikirim" },
  { description: "Order selesai.", id: "completed", label: "Selesai" },
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

function statusLabel(status: OrderStatus, custom: boolean): string {
  if (status === "CANCELLED") return "Order dibatalkan";
  if (status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT") return "Menunggu pembayaran";
  if (status === "PAID") return "Pembayaran terverifikasi";
  if (status === "PROCESSING") return "Sedang diproses";
  if (status === "IN_PRODUCTION") return "Sedang diproduksi";
  if (status === "FINISHING_QC") return "Finishing & QC";
  if (status === "WAITING_SHIPPING_PAYMENT") return "Menunggu pembayaran pengiriman";
  if (status === "READY_TO_SHIP") return "Siap dikirim";
  if (status === "SHIPPED") return "Dikirim";
  if (status === "COMPLETED") return "Selesai";
  if (status === "UNDER_REVIEW" || status === "WAITING_FOR_APPROVAL") return custom ? "Menunggu persetujuan" : "Sedang ditinjau";
  if (status === "SUBMITTED") return "Diterima";
  return "Status sedang diproses";
}

function statusDescription(status: OrderStatus, custom: boolean): string {
  if (status === "CANCELLED") return "Order ini dibatalkan oleh workflow server. Hubungi Niuva bila membutuhkan penjelasan lebih lanjut.";
  if (status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT") return "Order tercatat dan menunggu pembayaran yang diverifikasi server.";
  if (status === "PAID") return custom ? "Pembayaran terverifikasi. Pekerjaan custom akan bergerak ke produksi." : "Pembayaran terverifikasi. Pesanan segera masuk proses.";
  if (status === "PROCESSING" || status === "IN_PRODUCTION") return "Tim Niuva sedang memproses order sesuai data yang tersimpan.";
  if (status === "FINISHING_QC") return "Order custom berada pada tahap finishing dan quality control.";
  if (status === "WAITING_SHIPPING_PAYMENT") return "Paket final sedang dipersiapkan; pembayaran pengiriman menunggu langkah berikutnya.";
  if (status === "READY_TO_SHIP") return "Paket siap dikirim setelah detail pengiriman terkonfirmasi.";
  if (status === "SHIPPED") return "Paket sudah diserahkan ke kurir.";
  if (status === "COMPLETED") return "Order ditandai selesai oleh server.";
  return "Status order dibaca dari projection publik yang aman.";
}

function nextAction(status: OrderStatus, custom: boolean): OrderStatusPreview["nextAction"] {
  if (status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT") {
    return {
      description: "Gunakan kanal pembayaran yang dikirim bersama konfirmasi order. Status PAID hanya berubah setelah webhook diverifikasi.",
      kind: "support",
      title: "Pembayaran masih menunggu",
      tone: "warning",
    };
  }
  if (status === "CANCELLED") {
    return {
      description: "Order tidak dibuka kembali otomatis. Hubungi Niuva bila ada pembayaran terlambat atau perlu penanganan khusus.",
      kind: "support",
      title: "Hubungi Niuva bila perlu bantuan",
      tone: "error",
    };
  }
  if (status === "COMPLETED") {
    return { description: "Tidak ada tindakan berikutnya pada status ini.", kind: "none", title: "Order selesai", tone: "success" };
  }
  return {
    description: custom ? "Tim Niuva akan memperbarui status saat tahap custom berikutnya tervalidasi." : "Tim Niuva akan memperbarui status saat tahap fulfillment berikutnya tervalidasi.",
    kind: "none",
    title: "Menunggu pembaruan operasional",
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
