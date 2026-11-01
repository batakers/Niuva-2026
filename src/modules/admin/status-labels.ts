/**
 * Indonesian names for stored statuses shown in Admin. Pages used to title-case the raw enum
 * ("Ready To Ship"); one map keeps every list, detail, and action label on the same words.
 */
const labels: Readonly<Record<string, string>> = {
  // Order
  PENDING_PAYMENT: "Menunggu pembayaran",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  READY_TO_SHIP: "Siap dikirim",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  SUBMITTED: "Diajukan",
  UNDER_REVIEW: "Ditinjau",
  WAITING_FOR_APPROVAL: "Menunggu persetujuan",
  WAITING_PAYMENT: "Menunggu pembayaran",
  IN_PRODUCTION: "Produksi",
  FINISHING_QC: "Finishing & QC",
  WAITING_SHIPPING_PAYMENT: "Menunggu bayar ongkir",
  // Custom Print request and quote
  QUOTE_READY: "Quote disiapkan",
  QUOTE_SENT: "Quote terkirim",
  APPROVED: "Disetujui",
  DECLINED: "Ditolak",
  DRAFT: "Draft",
  SENT: "Terkirim",
  ACCEPTED: "Diterima",
  EXPIRED: "Kedaluwarsa",
  // Payment, shipment, and stock reservation
  PENDING: "Menunggu",
  SETTLED: "Lunas",
  FAILED: "Gagal",
  REFUNDED: "Dikembalikan",
  DELIVERED: "Sampai",
  EXCEPTION: "Perlu penanganan",
  ACTIVE: "Aktif",
  CONSUMED: "Terpakai",
  RELEASED: "Dilepas",
  // Files, invoices, pricing rules, invitations
  UPLOADED: "Terunggah",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  DELETED: "Dihapus",
  DELETE_PENDING: "Menunggu dihapus",
  ISSUED: "Terbit",
  VOID: "Batal",
  SUPERSEDED: "Diganti",
  RETIRED: "Nonaktif",
  REVOKED: "Dicabut",
  // Order item type and model unit confirmation
  PRODUCT: "Produk Toko",
  CUSTOM_PRINT: "Custom Print",
  MILLIMETER_CONFIRMED: "Milimeter dikonfirmasi",
  OTHER_UNIT_NOTED: "Unit lain dicatat",
  NEEDS_OPERATOR_HELP: "Perlu bantuan operator",
};

export function adminStatusLabel(value: string): string {
  return labels[value] ?? value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export type AdminStatusTone = "attention" | "danger" | "success" | "neutral";

const attention = new Set(["PENDING_PAYMENT", "WAITING_PAYMENT", "WAITING_SHIPPING_PAYMENT", "SUBMITTED", "UNDER_REVIEW", "WAITING_FOR_APPROVAL", "QUOTE_READY", "PENDING", "NEEDS_OPERATOR_HELP", "DELETE_PENDING"]);
const danger = new Set(["CANCELLED", "FAILED", "EXCEPTION", "REJECTED", "DECLINED", "VOID"]);
const success = new Set(["COMPLETED", "SETTLED", "DELIVERED", "VERIFIED", "ACCEPTED"]);

/** Colour follows what the status asks of the operator: act, fix, done, or nothing. */
export function adminStatusTone(value: string): AdminStatusTone {
  if (attention.has(value)) return "attention";
  if (danger.has(value)) return "danger";
  if (success.has(value)) return "success";
  return "neutral";
}
