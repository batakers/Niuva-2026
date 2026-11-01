import type {
  CustomPrintQuoteStatus,
  CustomPrintRequestStatus,
  OrderStatus,
  OrderType,
  PaymentAttemptStatus,
  ShipmentStatus,
} from "@/generated/prisma/client";

/**
 * Customer-facing wording for stored statuses. The token status pages and the Customer
 * account read the same labels, so one status never has two names.
 */

export function orderTypeLabel(orderType: OrderType): string {
  return orderType === "CUSTOM_PRINT" ? "Custom 3D Print" : "Produk Toko";
}

export function orderStatusLabel(status: OrderStatus, custom: boolean): string {
  if (status === "CANCELLED") return "Pesanan dibatalkan";
  if (status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT") return "Menunggu pembayaran";
  if (status === "PAID") return "Pembayaran terverifikasi";
  if (status === "PROCESSING") return "Sedang diproses";
  if (status === "IN_PRODUCTION") return "Sedang diproduksi";
  if (status === "FINISHING_QC") return "Finishing & QC";
  if (status === "WAITING_SHIPPING_PAYMENT") return "Menunggu pembayaran pengiriman";
  if (status === "READY_TO_SHIP") return "Siap dikirim";
  if (status === "SHIPPED") return "Dikirim";
  if (status === "COMPLETED") return "Pesanan selesai";
  if (status === "UNDER_REVIEW" || status === "WAITING_FOR_APPROVAL") return custom ? "Menunggu persetujuan" : "Sedang ditinjau";
  if (status === "SUBMITTED") return "Diterima";
  return "Status sedang diproses";
}

export function orderStatusDescription(status: OrderStatus, custom: boolean): string {
  if (status === "CANCELLED") return "Pesanan ini dibatalkan. Hubungi Niuva bila Anda membutuhkan penjelasan.";
  if (status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT") return "Pesanan tercatat dan menunggu pembayaran.";
  if (status === "PAID") return custom ? "Pembayaran terverifikasi. Pekerjaan custom akan bergerak ke produksi." : "Pembayaran terverifikasi. Pesanan segera masuk proses.";
  if (status === "PROCESSING" || status === "IN_PRODUCTION") return "Tim Niuva sedang memproses pesanan Anda.";
  if (status === "FINISHING_QC") return "Pesanan custom sedang di-finishing dan diperiksa kualitasnya.";
  if (status === "WAITING_SHIPPING_PAYMENT") return "Paket final sudah diukur. Pembayaran pengiriman menunggu instruksi resmi Niuva.";
  if (status === "READY_TO_SHIP") return "Paket siap dikirim setelah detail pengiriman terkonfirmasi.";
  if (status === "SHIPPED") return "Paket sudah diserahkan ke kurir.";
  if (status === "COMPLETED") return "Pesanan sudah selesai.";
  return "Status pesanan sedang diperbarui.";
}

/** Order states that wait on the Customer rather than on Niuva. */
export function orderNeedsCustomer(status: OrderStatus): boolean {
  return status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT" || status === "WAITING_SHIPPING_PAYMENT";
}

const customRequestStatusLabels: Readonly<Record<CustomPrintRequestStatus, string>> = {
  APPROVED: "Quote disetujui",
  CANCELLED: "Dibatalkan",
  DECLINED: "Quote ditolak",
  QUOTE_READY: "Quote sedang disiapkan",
  QUOTE_SENT: "Quote telah dikirim",
  SUBMITTED: "Menunggu pemeriksaan",
  UNDER_REVIEW: "Sedang ditinjau",
};

const customRequestStatusDescriptions: Readonly<Record<CustomPrintRequestStatus, string>> = {
  APPROVED: "Quote sudah Anda terima. Pesanan dan pembayarannya tercatat di riwayat pesanan.",
  CANCELLED: "Pengajuan ini tidak dilanjutkan. Hubungi Niuva bila Anda membutuhkan penjelasan.",
  DECLINED: "Quote ditolak. Bila kebutuhan berubah, operator dapat menyiapkan versi baru.",
  QUOTE_READY: "Operator sudah meninjau model dan sedang menyiapkan quote.",
  QUOTE_SENT: "Quote siap ditinjau. Terima atau tolak sebelum masa berlakunya habis.",
  SUBMITTED: "Pengajuan diterima dan menunggu pemeriksaan operator.",
  UNDER_REVIEW: "Operator sedang memeriksa model, hasil slicer, dan biaya pekerjaan.",
};

export function customRequestStatusLabel(status: CustomPrintRequestStatus): string {
  return customRequestStatusLabels[status];
}

export function customRequestStatusDescription(status: CustomPrintRequestStatus): string {
  return customRequestStatusDescriptions[status];
}

const quoteStatusLabels: Readonly<Record<CustomPrintQuoteStatus, string>> = {
  ACCEPTED: "Diterima",
  DECLINED: "Ditolak",
  DRAFT: "Sedang disiapkan",
  EXPIRED: "Kedaluwarsa",
  SENT: "Menunggu keputusan Anda",
};

export function quoteStatusLabel(status: CustomPrintQuoteStatus): string {
  return quoteStatusLabels[status];
}

const paymentStatusLabels: Readonly<Record<PaymentAttemptStatus, string>> = {
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  FAILED: "Gagal",
  PENDING: "Menunggu pembayaran",
  REFUNDED: "Dikembalikan",
  SETTLED: "Terkonfirmasi",
};

export function paymentStatusLabel(status: PaymentAttemptStatus): string {
  return paymentStatusLabels[status];
}

const shipmentStatusLabels: Readonly<Record<ShipmentStatus, string>> & Readonly<Record<string, string | undefined>> = {
  DELIVERED: "Diterima",
  EXCEPTION: "Perlu penanganan",
  PENDING: "Disiapkan",
  SHIPPED: "Dalam pengiriman",
};

/** Accepts the projected string status of the token page; an unknown value is shown as stored. */
export function shipmentStatusLabel(status: ShipmentStatus | string): string {
  return shipmentStatusLabels[status] ?? status;
}

const filamentSourceLabels: Readonly<Record<string, string>> = {
  COMMUNAL: "filamen komunal",
  CUSTOMER_OWN: "filamen milik Anda",
  NIUVA_STOCK: "stok Niuva",
};

export function filamentSourceLabel(source: string): string {
  return filamentSourceLabels[source] ?? source;
}
