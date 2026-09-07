"use client";

import { useState } from "react";

import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
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
import { Input } from "@/components/ui/input";
import {
  customFileStateConfig,
  customRequestStatusConfig,
  type PreviewCustomRequestFixture,
  type PreviewCustomRequestStatus,
} from "@/features/admin/custom-review-preview-data";

type AdminCustomReviewProps = Readonly<{
  onClose: () => void;
  request: PreviewCustomRequestFixture;
}>;

type ReviewDraft = Readonly<{
  configuration: string;
  materialCode: string;
  notes: string;
  printDurationSeconds: string;
  verifiedWeightG: string;
}>;

type ReviewErrors = Partial<Record<keyof Pick<ReviewDraft, "materialCode" | "printDurationSeconds" | "verifiedWeightG">, string>>;

const initialDraft: ReviewDraft = {
  configuration: "",
  materialCode: "",
  notes: "",
  printDurationSeconds: "",
  verifiedWeightG: "",
};

const reviewTimeline: readonly PreviewCustomRequestStatus[] = ["SUBMITTED", "UNDER_REVIEW", "QUOTE_READY"];

export const previewCustomReviewTransitions: Readonly<Record<PreviewCustomRequestStatus, readonly PreviewCustomRequestStatus[]>> = {
  QUOTE_READY: [],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["QUOTE_READY"],
};

export function isPreviewCustomReviewTransitionAllowed(
  current: PreviewCustomRequestStatus,
  next: PreviewCustomRequestStatus,
): boolean {
  return previewCustomReviewTransitions[current].includes(next);
}

export function validatePreviewReviewDraft(draft: ReviewDraft): ReviewErrors {
  const errors: ReviewErrors = {};

  if (draft.materialCode.trim().length === 0) {
    errors.materialCode = "Masukkan kode material yang diverifikasi operator.";
  }

  if (!/^\d+(?:\.\d{1,6})?$/.test(draft.verifiedWeightG.trim())) {
    errors.verifiedWeightG = "Berat slicer harus berupa angka desimal nonnegatif hingga enam digit pecahan.";
  }

  if (!/^\d+$/.test(draft.printDurationSeconds.trim())) {
    errors.printDurationSeconds = "Durasi cetak harus berupa integer detik nonnegatif.";
  }

  return errors;
}

function DetailDefinition({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

export function AdminCustomReview({ onClose, request }: AdminCustomReviewProps) {
  const hydrated = useHydrated();
  const [draft, setDraft] = useState<ReviewDraft>(initialDraft);
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [reviewRecorded, setReviewRecorded] = useState(false);
  const [status, setStatus] = useState<PreviewCustomRequestStatus>(request.status);

  const currentStatus = customRequestStatusConfig[status];
  const currentTimelineIndex = reviewTimeline.indexOf(status);
  const isQuoteReady = status === "QUOTE_READY";

  function updateDraft(field: keyof ReviewDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function saveLocalReview() {
    const nextErrors = validatePreviewReviewDraft(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    if (status === "SUBMITTED" && isPreviewCustomReviewTransitionAllowed(status, "UNDER_REVIEW")) {
      setStatus("UNDER_REVIEW");
    }

    setStatus("QUOTE_READY");
    setReviewRecorded(true);
  }

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) onClose();
    }} open>
      <DialogContent
        className="right-0 left-auto top-0 h-[100dvh] w-full max-w-[42rem] translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-l border-border p-0 sm:max-w-[42rem]"
        data-admin-custom-review="preview"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs font-medium text-brand-700">{request.reference}</p>
            <Badge className={currentStatus.className} variant="outline">{currentStatus.label}</Badge>
          </div>
          <DialogTitle className="text-xl leading-tight font-semibold tracking-tight">Review custom print</DialogTitle>
          <DialogDescription className="max-w-xl leading-6">
            Fixture development-only untuk meninjau evidence operator sebelum handoff draft quote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-5 py-6 sm:px-6">
          <StatusNotice
            description="Nama customer, kontak, file, storage key, signed URL, token, nominal, payload provider, dan audit server tidak dimuat. Preview ini tidak memberi akses ke file privat."
            size="compact"
            title="Proyeksi request aman untuk review UI"
            tone="info"
          />

          <section aria-labelledby="custom-context-heading">
            <h3 className="text-sm font-semibold" id="custom-context-heading">Konteks request</h3>
            <dl className="mt-3">
              <DetailDefinition label="Status" value={currentStatus.label} />
              <DetailDefinition label="Material diminta" value={request.requestedMaterial} />
              <DetailDefinition label="Quantity request" value={`${request.quantity}`} />
              <DetailDefinition label="Unit atau skala" value={request.unitConfirmation} />
              <DetailDefinition label="Diperbarui" value={request.updatedAt} />
            </dl>
            <p className="mt-4 border-l-2 border-brand-300 pl-3 text-sm leading-6 text-muted-foreground">
              {request.reviewSummary}
            </p>
          </section>

          <section aria-labelledby="private-file-heading" className="border-t border-border pt-6" data-private-file-access="unavailable">
            <h3 className="text-sm font-semibold" id="private-file-heading">Bukti file privat</h3>
            <StatusNotice
              className="mt-4"
              description={customFileStateConfig[request.fileState].summary}
              size="compact"
              title={customFileStateConfig[request.fileState].label}
              tone="warning"
            />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Akses file sesungguhnya harus diterbitkan setelah Clerk, AdminProfile aktif, ownership, dan signed access diverifikasi server. Tidak ada tautan file pada preview ini.
            </p>
          </section>

          <section aria-labelledby="review-timeline-heading" className="border-t border-border pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold" id="review-timeline-heading">Tahap review</h3>
              <p className="text-xs text-muted-foreground">Snapshot visual, bukan source of truth</p>
            </div>
            <ol aria-label="Tahap review custom print preview" className="mt-4 space-y-3 border-l border-border pl-4">
              {reviewTimeline.map((timelineStatus, index) => {
                const config = customRequestStatusConfig[timelineStatus];
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

          <section aria-labelledby="slicer-input-heading" className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold" id="slicer-input-heading">Input hasil slicer</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Material, berat, dan durasi mengikuti kontrak review server. Quantity terkunci pada request. Konfigurasi dan catatan bersifat opsional.
            </p>

            {isQuoteReady ? (
              <StatusNotice
                className="mt-4"
                description="Fixture sudah berada pada tahap siap untuk draft quote. FE-22 akan meninjau rule pricing aktif, kalkulasi Decimal, expiry, dan sent quote yang immutable."
                size="compact"
                title="Review preview telah lengkap"
                tone="success"
              />
            ) : (
              <form
                className="mt-5 space-y-5"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  saveLocalReview();
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    description={`Request meminta ${request.requestedMaterial}. Masukkan kode yang benar-benar diverifikasi operator.`}
                    error={errors.materialCode}
                    id="custom-review-material"
                    label="Kode material"
                    required
                  >
                    <Input
                      className="min-h-11"
                      disabled={!hydrated}
                      name="materialCode"
                      onChange={(event) => updateDraft("materialCode", event.target.value)}
                      value={draft.materialCode}
                    />
                  </FormField>
                  <FormField
                    description="Quantity tidak dapat diubah dari review agar sama dengan request awal."
                    id="custom-review-quantity"
                    label="Quantity request"
                    variant="readOnly"
                  >
                    <Input className="min-h-11" value={`${request.quantity}`} />
                  </FormField>
                  <FormField
                    description="Gunakan gram desimal tanpa pembulatan tampilan."
                    error={errors.verifiedWeightG}
                    id="custom-review-weight"
                    label="Berat slicer (g)"
                    required
                  >
                    <Input
                      className="min-h-11"
                      disabled={!hydrated}
                      inputMode="decimal"
                      name="verifiedWeightG"
                      onChange={(event) => updateDraft("verifiedWeightG", event.target.value)}
                      value={draft.verifiedWeightG}
                    />
                  </FormField>
                  <FormField
                    description="Durasi disimpan sebagai integer detik oleh kontrak server."
                    error={errors.printDurationSeconds}
                    id="custom-review-duration"
                    label="Durasi cetak (detik)"
                    required
                  >
                    <Input
                      className="min-h-11"
                      disabled={!hydrated}
                      inputMode="numeric"
                      min="0"
                      name="printDurationSeconds"
                      onChange={(event) => updateDraft("printDurationSeconds", event.target.value)}
                      type="number"
                      value={draft.printDurationSeconds}
                    />
                  </FormField>
                  <FormField
                    className="sm:col-span-2"
                    description="Opsional. Catat parameter slicer atau konfigurasi yang perlu dipertahankan dalam snapshot quote."
                    id="custom-review-configuration"
                    label="Konfigurasi slicer"
                  >
                    <textarea
                      className="min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
                      disabled={!hydrated}
                      name="configuration"
                      onChange={(event) => updateDraft("configuration", event.target.value)}
                      rows={4}
                      value={draft.configuration}
                    />
                  </FormField>
                  <FormField
                    className="sm:col-span-2"
                    description="Opsional. Catatan internal tidak dicetak sebagai bagian dari projection customer."
                    id="custom-review-notes"
                    label="Catatan review"
                  >
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
                      disabled={!hydrated}
                      name="notes"
                      onChange={(event) => updateDraft("notes", event.target.value)}
                      rows={3}
                      value={draft.notes}
                    />
                  </FormField>
                </div>

                {Object.keys(errors).length > 0 ? (
                  <StatusNotice
                    description="Lengkapi atau koreksi input yang ditandai sebelum review preview diteruskan. Tidak ada data browser dikirim ke server."
                    role="alert"
                    size="compact"
                    title="Input review belum valid"
                    tone="error"
                  />
                ) : null}

                <Button className="min-h-11 cursor-pointer" disabled={!hydrated} type="submit">
                  Simpan review preview
                </Button>
              </form>
            )}

            {reviewRecorded ? (
              <StatusNotice
                className="mt-5"
                description="Preview merepresentasikan transisi SUBMITTED ke UNDER_REVIEW lalu QUOTE_READY secara lokal. Tidak ada review, audit, quote, atau perubahan status server dibuat."
                size="compact"
                title="Review preview siap untuk handoff draft quote"
                tone="success"
              />
            ) : null}
          </section>

          <section aria-labelledby="review-authority-heading" className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold" id="review-authority-heading">Authority yang tetap berada di server</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Server memverifikasi Clerk, AdminProfile aktif, permission CUSTOM_PRINT_REVIEW, ownership file, status terbaru, quantity, Decimal weight, audit, dan pricing rule sebelum quote dapat dibuat.
            </p>
          </section>
        </div>

        <DialogFooter className="sticky bottom-0 mx-0 mb-0 rounded-none bg-background px-5 sm:px-6">
          <DialogClose render={<Button className="min-h-11 cursor-pointer" type="button" variant="outline" />}>
            Tutup review custom print
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
