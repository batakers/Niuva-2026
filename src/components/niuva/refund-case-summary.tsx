import type { RefundCaseView } from "@/modules/refund/types";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const labels = { REQUESTED: "Menunggu pemeriksaan", APPROVED: "Disetujui Owner", RECONCILING: "Hasil refund sedang diperiksa", COMPLETED: "Penyelesaian terkonfirmasi" };
export const refundOutcomeLabels: Readonly<Record<string, string>> = { READY: "Menunggu proses", CHECKING: "Pembayaran sedang diperiksa", SUBMITTING: "Pengajuan sedang diproses", ACCEPTED: "Diterima provider; menunggu konfirmasi bank", RETRYABLE: "Menunggu pemeriksaan ulang", UNKNOWN: "Hasil belum pasti; sedang direkonsiliasi", REJECTED: "Memerlukan penanganan Owner", EXCEPTION: "Memerlukan pemeriksaan bukti", MANUAL_AUTHORIZED: "Pengembalian manual disetujui; menunggu bukti transfer", CONFIRMED: "Pengembalian terkonfirmasi" };
export function RefundCaseSummary({ refund }: Readonly<{ refund: RefundCaseView }>) {
  return <div className="space-y-5">
    <p className="break-words text-sm text-muted-foreground">Nomor kasus: {refund.id}</p>
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1 font-semibold">{labels[refund.status]}</dd></div>
      <div><dt className="text-muted-foreground">Total pembayaran dalam pengajuan</dt><dd className="mt-1 font-semibold tabular-nums">{money.format(BigInt(refund.amountRp))}</dd></div>
      <div><dt className="text-muted-foreground">Diterima</dt><dd className="mt-1">{date.format(new Date(refund.receivedAt))} WIB</dd></div>
      <div><dt className="text-muted-foreground">Retur / proses</dt><dd className="mt-1">{refund.completedAt ? `Terkonfirmasi ${date.format(new Date(refund.completedAt))} WIB` : refund.returnState === "PENDING" ? "Menunggu retur" : refund.readyAt ? "Syarat tercatat; proses mengikuti status kasus" : "Menunggu pemeriksaan syarat retur"}</dd></div>
    </dl>
    <div className="border-t border-border pt-4"><p className="text-sm font-medium">Alasan pengajuan</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{refund.reason}</p></div>
    <ul className="divide-y divide-border text-sm" aria-label="Alokasi pembayaran refund">{refund.allocations.map(allocation => <li className="flex flex-wrap justify-between gap-3 py-3" key={allocation.paymentAttemptId}><div><p>{allocation.purpose === "CUSTOM_SHIPPING" ? "Pengiriman final" : "Pembayaran order"}</p>{allocation.outcome ? <p className="mt-1 max-w-prose text-xs leading-5 text-muted-foreground">{refundOutcomeLabels[allocation.outcome.state] ?? "Sedang diperiksa"}{allocation.outcome.confirmedAt ? ` · ${date.format(new Date(allocation.outcome.confirmedAt))} WIB` : ""}</p> : null}</div><span className="tabular-nums">{money.format(BigInt(allocation.amountRp))}</span></li>)}</ul>
  </div>;
}
