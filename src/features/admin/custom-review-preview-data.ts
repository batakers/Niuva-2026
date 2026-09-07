export type PreviewCustomRequestStatus = "SUBMITTED" | "UNDER_REVIEW" | "QUOTE_READY";

export type PreviewCustomFileState = "PRIVATE_NOT_RENDERED" | "VERIFICATION_PENDING";

export type PreviewCustomRequestFixture = Readonly<{
  fileState: PreviewCustomFileState;
  quantity: number;
  reference: string;
  requestedMaterial: string;
  reviewSummary: string;
  status: PreviewCustomRequestStatus;
  unitConfirmation: string;
  updatedAt: string;
}>;

export const customRequestStatusConfig: Readonly<Record<PreviewCustomRequestStatus, Readonly<{
  className: string;
  label: string;
}>>> = {
  SUBMITTED: {
    className: "border-info-border bg-info-background text-info",
    label: "Diajukan",
  },
  UNDER_REVIEW: {
    className: "border-warning-border bg-warning-background text-warning",
    label: "Sedang direview",
  },
  QUOTE_READY: {
    className: "border-success-border bg-success-background text-success",
    label: "Siap untuk draft quote",
  },
};

export const customFileStateConfig: Readonly<Record<PreviewCustomFileState, Readonly<{
  label: string;
  summary: string;
}>>> = {
  PRIVATE_NOT_RENDERED: {
    label: "File privat tidak tersedia di preview",
    summary: "Tidak ada URL, nama file, storage key, atau payload file yang dirender di browser.",
  },
  VERIFICATION_PENDING: {
    label: "Verifikasi file perlu dikonfirmasi server",
    summary: "Preview tidak menyatakan file siap, dapat diakses, atau dimiliki oleh operator saat ini.",
  },
};

export const customRequestPreviewFixture = [
  {
    fileState: "PRIVATE_NOT_RENDERED",
    quantity: 2,
    reference: "CPR-EX-2093",
    requestedMaterial: "PLA",
    reviewSummary: "Konfigurasi casing kontrol menunggu input slicer sebelum draft quote dapat dibuat.",
    status: "SUBMITTED",
    unitConfirmation: "Konfirmasi skala belum tersedia di preview.",
    updatedAt: "43 menit lalu",
  },
  {
    fileState: "VERIFICATION_PENDING",
    quantity: 1,
    reference: "CPR-EX-2148",
    requestedMaterial: "ABS",
    reviewSummary: "Review sudah dimulai, namun bukti input slicer belum ditampilkan pada fixture list.",
    status: "UNDER_REVIEW",
    unitConfirmation: "Unit milimeter dikonfirmasi pada fixture.",
    updatedAt: "1 jam lalu",
  },
  {
    fileState: "PRIVATE_NOT_RENDERED",
    quantity: 4,
    reference: "CPR-EX-2191",
    requestedMaterial: "PLA",
    reviewSummary: "Review contoh sudah lengkap. Pembuatan draft quote tetap berada pada tahap preview berikutnya.",
    status: "QUOTE_READY",
    unitConfirmation: "Konfirmasi skala belum dimuat pada fixture.",
    updatedAt: "Kemarin, 16.40",
  },
] as const satisfies readonly PreviewCustomRequestFixture[];

export function getPreviewCustomRequest(reference: string): PreviewCustomRequestFixture | null {
  return customRequestPreviewFixture.find((request) => request.reference === reference) ?? null;
}
