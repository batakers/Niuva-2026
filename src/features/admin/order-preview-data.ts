export type AdminPreviewRole = "OWNER" | "ADMIN";

export type PreviewOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "COMPLETED"
  | "IN_PRODUCTION"
  | "FINISHING_QC"
  | "WAITING_SHIPPING_PAYMENT"
  | "CANCELLED";

export type PreviewOrderFixture = Readonly<{
  audit: readonly PreviewOrderAuditEntry[];
  exceptionReason: string | null;
  fulfillmentSummary: string;
  orderType: "RETAIL" | "CUSTOM_PRINT";
  paymentLabel: string;
  reference: string;
  shipmentLabel: string;
  status: PreviewOrderStatus;
  updatedAt: string;
}>;

export type PreviewOrderAuditEntry = Readonly<{
  detail: string;
  id: string;
  timestamp: string;
  title: string;
}>;

export const orderPreviewFixture = [
  {
    audit: [
      {
        detail: "Pembayaran utama tercatat sebagai contoh. Tidak ada event provider asli di preview.",
        id: "ord-4072-payment",
        timestamp: "Hari ini, 09.20",
        title: "Pembayaran utama terverifikasi",
      },
      {
        detail: "Order menunggu tindakan fulfillment berikutnya.",
        id: "ord-4072-created",
        timestamp: "Hari ini, 09.14",
        title: "Order dibuat",
      },
    ],
    exceptionReason: null,
    fulfillmentSummary: "Order siap memasuki proses fulfillment retail.",
    orderType: "RETAIL",
    paymentLabel: "Terverifikasi pada fixture",
    reference: "ORD-EX-4072",
    shipmentLabel: "Menunggu proses fulfillment",
    status: "PAID",
    updatedAt: "4 jam lalu",
  },
  {
    audit: [
      {
        detail: "Order contoh sudah melalui tahap pemenuhan dan menunggu pencatatan pengiriman.",
        id: "ord-4137-ready",
        timestamp: "Hari ini, 08.40",
        title: "Order siap dikirim",
      },
      {
        detail: "Pembayaran utama tercatat sebagai contoh.",
        id: "ord-4137-payment",
        timestamp: "Kemarin, 16.10",
        title: "Pembayaran utama terverifikasi",
      },
    ],
    exceptionReason: null,
    fulfillmentSummary: "Konfirmasi pengiriman hanya sah setelah snapshot shipment dibuat server.",
    orderType: "RETAIL",
    paymentLabel: "Terverifikasi pada fixture",
    reference: "ORD-EX-4137",
    shipmentLabel: "Siap diserahkan ke kurir",
    status: "READY_TO_SHIP",
    updatedAt: "5 jam lalu",
  },
  {
    audit: [
      {
        detail: "Produksi custom print sedang berlangsung pada fixture.",
        id: "ord-4265-production",
        timestamp: "Kemarin, 14.25",
        title: "Produksi dimulai",
      },
      {
        detail: "Pembayaran utama tercatat sebagai contoh sebelum proses produksi.",
        id: "ord-4265-payment",
        timestamp: "Kemarin, 10.03",
        title: "Pembayaran utama terverifikasi",
      },
    ],
    exceptionReason: null,
    fulfillmentSummary: "QC harus selesai sebelum ukuran paket akhir dicatat untuk shipping custom.",
    orderType: "CUSTOM_PRINT",
    paymentLabel: "Terverifikasi pada fixture",
    reference: "ORD-EX-4265",
    shipmentLabel: "Menunggu quality control",
    status: "IN_PRODUCTION",
    updatedAt: "1 hari lalu",
  },
  {
    audit: [
      {
        detail: "Pengukuran paket contoh sudah dicatat oleh alur server yang akan datang.",
        id: "ord-4351-measurement",
        timestamp: "Kemarin, 15.45",
        title: "Paket akhir diukur",
      },
      {
        detail: "Payment shipping kedua masih menunggu verifikasi provider.",
        id: "ord-4351-shipping-payment",
        timestamp: "Kemarin, 15.50",
        title: "Pembayaran pengiriman dibuat",
      },
    ],
    exceptionReason: "Pembayaran pengiriman kedua belum diselesaikan pada fixture.",
    fulfillmentSummary: "Tidak ada tindakan fulfillment browser sampai payment shipping diverifikasi server.",
    orderType: "CUSTOM_PRINT",
    paymentLabel: "Pembayaran utama terverifikasi pada fixture",
    reference: "ORD-EX-4351",
    shipmentLabel: "Menunggu pembayaran pengiriman",
    status: "WAITING_SHIPPING_PAYMENT",
    updatedAt: "1 hari lalu",
  },
  {
    audit: [
      {
        detail: "Order fixture belum menerima bukti pembayaran terverifikasi.",
        id: "ord-4420-created",
        timestamp: "2 hari lalu, 12.10",
        title: "Order dibuat",
      },
    ],
    exceptionReason: "Masa pembayaran fixture perlu ditinjau sebelum order berubah status.",
    fulfillmentSummary: "Status paid hanya dapat berasal dari webhook payment yang diverifikasi.",
    orderType: "RETAIL",
    paymentLabel: "Belum terverifikasi pada fixture",
    reference: "ORD-EX-4420",
    shipmentLabel: "Belum tersedia sebelum pembayaran",
    status: "PENDING_PAYMENT",
    updatedAt: "2 hari lalu",
  },
] as const satisfies readonly PreviewOrderFixture[];

export const orderStatusConfig: Record<
  PreviewOrderStatus,
  Readonly<{ className: string; label: string }>
> = {
  CANCELLED: {
    className: "border-destructive-border bg-destructive-background text-destructive",
    label: "Dibatalkan",
  },
  COMPLETED: {
    className: "border-success-border bg-success-background text-success",
    label: "Selesai",
  },
  FINISHING_QC: {
    className: "border-info-border bg-info-background text-info",
    label: "Quality control",
  },
  IN_PRODUCTION: {
    className: "border-info-border bg-info-background text-info",
    label: "Dalam produksi",
  },
  PAID: {
    className: "border-info-border bg-info-background text-info",
    label: "Berbayar, perlu diproses",
  },
  PENDING_PAYMENT: {
    className: "border-warning-border bg-warning-background text-warning",
    label: "Menunggu pembayaran",
  },
  PROCESSING: {
    className: "border-info-border bg-info-background text-info",
    label: "Sedang diproses",
  },
  READY_TO_SHIP: {
    className: "border-success-border bg-success-background text-success",
    label: "Siap dikirim",
  },
  SHIPPED: {
    className: "border-success-border bg-success-background text-success",
    label: "Dalam pengiriman",
  },
  WAITING_SHIPPING_PAYMENT: {
    className: "border-warning-border bg-warning-background text-warning",
    label: "Menunggu pembayaran pengiriman",
  },
};

export function getPreviewOrder(reference: string | null): PreviewOrderFixture | null {
  return orderPreviewFixture.find((order) => order.reference === reference) ?? null;
}

export function orderTypeLabel(orderType: PreviewOrderFixture["orderType"]): string {
  return orderType === "CUSTOM_PRINT" ? "Custom print" : "Ready-made";
}
