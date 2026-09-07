"use client";

import { useState } from "react";

import { StatusNotice } from "@/components/niuva/status-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHydrated } from "@/components/niuva/use-hydrated";
import {
  orderStatusConfig,
  orderTypeLabel,
  type AdminPreviewRole,
  type PreviewOrderAuditEntry,
  type PreviewOrderFixture,
  type PreviewOrderStatus,
} from "@/features/admin/order-preview-data";
import { PackageMeasurement, type PackageMeasurementValues } from "@/features/admin/package-measurement";

type AdminOrderDetailProps = Readonly<{
  onClose: () => void;
  order: PreviewOrderFixture;
  role: AdminPreviewRole;
}>;

type PreviewTransitionAction = Readonly<{
  label: string;
  next: PreviewOrderStatus;
}>;

export const previewOrderTransitions: Readonly<Record<PreviewOrderStatus, readonly PreviewOrderStatus[]>> = {
  CANCELLED: [],
  COMPLETED: [],
  FINISHING_QC: ["WAITING_SHIPPING_PAYMENT"],
  IN_PRODUCTION: ["FINISHING_QC"],
  PAID: ["PROCESSING"],
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PROCESSING: ["READY_TO_SHIP"],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
  WAITING_SHIPPING_PAYMENT: ["READY_TO_SHIP"],
};

const operatorTransitionActions: Partial<Record<PreviewOrderStatus, PreviewTransitionAction>> = {
  IN_PRODUCTION: { label: "Lanjutkan QC preview", next: "FINISHING_QC" },
  PAID: { label: "Mulai fulfillment preview", next: "PROCESSING" },
  PENDING_PAYMENT: { label: "Batalkan pembayaran pending preview", next: "CANCELLED" },
  PROCESSING: { label: "Tandai siap dikirim preview", next: "READY_TO_SHIP" },
  READY_TO_SHIP: { label: "Catat pengiriman preview", next: "SHIPPED" },
  SHIPPED: { label: "Tandai selesai preview", next: "COMPLETED" },
};

const retailTimeline: readonly PreviewOrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
];

const customTimeline: readonly PreviewOrderStatus[] = [
  "PAID",
  "IN_PRODUCTION",
  "FINISHING_QC",
  "WAITING_SHIPPING_PAYMENT",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
];

export function isPreviewTransitionAllowed(
  current: PreviewOrderStatus,
  next: PreviewOrderStatus,
): boolean {
  return previewOrderTransitions[current].includes(next);
}

function DetailDefinition({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function transitionAuditEntry(
  current: PreviewOrderStatus,
  next: PreviewOrderStatus,
): PreviewOrderAuditEntry {
  return {
    detail: `Status berubah dari ${orderStatusConfig[current].label} ke ${orderStatusConfig[next].label}. Tidak ada audit atau mutasi server dibuat.`,
    id: `${current}-${next}`,
    timestamp: "Baru saja",
    title: "Transition preview dicatat",
  };
}

export function AdminOrderDetail({ onClose, order, role }: AdminOrderDetailProps) {
  const hydrated = useHydrated();
  const [audit, setAudit] = useState<readonly PreviewOrderAuditEntry[]>(order.audit);
  const [financePreviewReady, setFinancePreviewReady] = useState(false);
  const [measurement, setMeasurement] = useState<PackageMeasurementValues | null>(null);
  const [status, setStatus] = useState<PreviewOrderStatus>(order.status);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const statusConfig = orderStatusConfig[status];
  const timeline = order.orderType === "CUSTOM_PRINT" ? customTimeline : retailTimeline;
  const currentTimelineIndex = timeline.indexOf(status);
  const operatorAction = operatorTransitionActions[status];
  const isCustomMeasurementStage = order.orderType === "CUSTOM_PRINT" && status === "FINISHING_QC";
  const isFinanceReviewable = status === "PAID";

  function recordLocalTransition(next: PreviewOrderStatus) {
    if (!isPreviewTransitionAllowed(status, next)) {
      setTransitionError("Perubahan preview diblokir karena edge status tersebut tidak valid.");
      return;
    }

    const previousStatus = status;
    setStatus(next);
    setAudit((entries) => [transitionAuditEntry(previousStatus, next), ...entries]);
    setTransitionError(null);
  }

  function handleMeasurementValidated(values: PackageMeasurementValues) {
    setMeasurement(values);
    setTransitionError(null);
  }

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) onClose();
    }} open>
      <DialogContent
        className="right-0 left-auto top-0 h-[100dvh] w-full max-w-[38rem] translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-l border-border p-0 sm:max-w-[38rem]"
        data-admin-order-detail="preview"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs font-medium text-brand-700">{order.reference}</p>
            <Badge className={statusConfig.className} variant="outline">{statusConfig.label}</Badge>
          </div>
          <DialogTitle className="text-xl leading-tight font-semibold tracking-tight">Detail fulfillment order</DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            Fixture development-only untuk meninjau state, alasan tindakan, dan precondition fulfillment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-5 py-6 sm:px-6">
          <StatusNotice
            description="Kontak, alamat, item, nominal, token, payload provider, file privat, dan catatan internal tidak tersedia di preview ini."
            size="compact"
            title="Proyeksi order aman untuk review UI"
            tone="info"
          />

          <section aria-labelledby="order-summary-heading">
            <h3 className="text-sm font-semibold" id="order-summary-heading">Konteks operasional</h3>
            <dl className="mt-3">
              <DetailDefinition label="Jenis" value={orderTypeLabel(order.orderType)} />
              <DetailDefinition label="Status" value={statusConfig.label} />
              <DetailDefinition label="Pembayaran" value={order.paymentLabel} />
              <DetailDefinition label="Pengiriman" value={order.shipmentLabel} />
              <DetailDefinition label="Pelanggan" value="Tidak dimuat di preview" />
              <DetailDefinition label="Diperbarui" value={order.updatedAt} />
            </dl>
            <p className="mt-4 border-l-2 border-brand-300 pl-3 text-sm leading-6 text-muted-foreground">
              {order.fulfillmentSummary}
            </p>
          </section>

          {order.exceptionReason ? (
            <StatusNotice
              description={order.exceptionReason}
              size="compact"
              title="Exception fixture perlu perhatian"
              tone="warning"
            />
          ) : null}

          <section aria-labelledby="order-timeline-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold" id="order-timeline-heading">Tahap fulfillment</h3>
              <p className="text-xs text-muted-foreground">Projection status, bukan source of truth</p>
            </div>
            <ol aria-label="Tahap fulfillment preview" className="mt-4 space-y-3 border-l border-border pl-4">
              {timeline.map((timelineStatus, index) => {
                const config = orderStatusConfig[timelineStatus];
                const isCurrent = timelineStatus === status;
                const isComplete = currentTimelineIndex >= index;

                return (
                  <li aria-current={isCurrent ? "step" : undefined} className="relative" key={timelineStatus}>
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[1.31rem] top-1.5 size-2 rounded-full border border-border ${isComplete ? "bg-brand-600" : "bg-background"}`}
                    />
                    <p className={isCurrent ? "text-sm font-semibold" : "text-sm font-medium text-muted-foreground"}>{config.label}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="order-actions-heading" className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold" id="order-actions-heading">Tindakan fulfillment</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Preview hanya memperlihatkan edge valid. Server tetap memverifikasi sesi, permission, status terbaru, audit, shipment, dan payment.
            </p>

            {transitionError ? (
              <StatusNotice
                className="mt-4"
                description={transitionError}
                role="alert"
                size="compact"
                title="Transition preview ditolak"
                tone="error"
              />
            ) : null}

            {status === "PENDING_PAYMENT" ? (
              <StatusNotice
                className="mt-4"
                description="Status berbayar tidak dapat diatur dari browser. Hanya webhook payment yang sudah diverifikasi yang dapat memindahkan order ke tahap paid."
                size="compact"
                title="Payment menunggu authority server"
                tone="warning"
              />
            ) : null}

            {status === "WAITING_SHIPPING_PAYMENT" ? (
              <StatusNotice
                className="mt-4"
                description="Paket telah masuk tahap payment shipping. Hanya payment shipping yang diverifikasi server yang dapat membuat order siap dikirim."
                size="compact"
                title="Shipping menunggu payment server"
                tone="warning"
              />
            ) : null}

            {operatorAction ? (
              <Button
                className="mt-4 min-h-11 cursor-pointer"
                disabled={!hydrated}
                onClick={() => recordLocalTransition(operatorAction.next)}
                type="button"
              >
                {operatorAction.label}
              </Button>
            ) : null}

            {isCustomMeasurementStage ? (
              <>
                <PackageMeasurement disabled={!hydrated} onValidated={handleMeasurementValidated} />
                {measurement ? (
                  <StatusNotice
                    className="mt-4"
                    description="Empat nilai paket valid di browser. Rate, snapshot shipment, dan payment shipping belum dibuat."
                    size="compact"
                    title="Pengukuran preview valid"
                    tone="success"
                  />
                ) : null}
                <Button
                  className="mt-4 min-h-11 cursor-pointer"
                  disabled={!hydrated || measurement === null}
                  onClick={() => recordLocalTransition("WAITING_SHIPPING_PAYMENT")}
                  type="button"
                >
                  Siapkan pembayaran pengiriman preview
                </Button>
              </>
            ) : null}

            {status === "CANCELLED" || status === "COMPLETED" ? (
              <StatusNotice
                className="mt-4"
                description="Tidak ada transition lanjutan pada fixture. Perubahan pengecualian tetap memerlukan workflow server yang terpisah."
                size="compact"
                title="Order berada pada status terminal"
                tone="info"
              />
            ) : null}
          </section>

          {isFinanceReviewable ? (
            <section aria-labelledby="order-finance-heading" className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold" id="order-finance-heading">Pembatalan dan refund</h3>
              {role === "ADMIN" ? (
                <StatusNotice
                  className="mt-4"
                  description="Admin tidak boleh membatalkan order berbayar atau menyetujui refund penuh. Permission server tetap menjadi authority."
                  size="compact"
                  title="Tindakan ini hanya dapat diminta oleh Owner"
                  tone="warning"
                />
              ) : (
                <>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Owner dapat memulai workflow refund penuh setelah payment mengonfirmasi hasilnya. Preview ini tidak membatalkan order atau mengirim refund.
                  </p>
                  <Button
                    className="mt-4 min-h-11 cursor-pointer"
                    disabled={!hydrated}
                    onClick={() => setFinancePreviewReady(true)}
                    type="button"
                    variant="outline"
                  >
                    Tinjau refund penuh preview
                  </Button>
                  {financePreviewReady ? (
                    <StatusNotice
                      className="mt-4"
                      description="Tidak ada refund, perubahan status, atau audit server dibuat. Workflow finance harus mengonfirmasi refund penuh sebelum pembatalan."
                      size="compact"
                      title="Workflow refund penuh belum terhubung"
                      tone="info"
                    />
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          <section aria-labelledby="order-audit-heading" className="border-t border-border pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold" id="order-audit-heading">Riwayat dan audit preview</h3>
              <p className="text-xs text-muted-foreground">Fixture lokal, tanpa audit server</p>
            </div>
            <ol aria-label="Riwayat order preview" className="mt-4 space-y-4 border-l border-border pl-4">
              {audit.map((entry) => (
                <li className="relative" key={entry.id}>
                  <span aria-hidden="true" className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full border border-border bg-background" />
                  <p className="text-sm font-medium">{entry.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.timestamp}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <DialogFooter className="sticky bottom-0 mx-0 mb-0 rounded-none bg-background px-5 sm:px-6">
          <DialogClose render={<Button className="min-h-11 cursor-pointer" type="button" variant="outline" />}>
            Tutup detail order
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
