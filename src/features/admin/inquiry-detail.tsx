"use client";

import type { ReactElement } from "react";
import { useState } from "react";

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
  DialogTrigger,
} from "@/components/ui/dialog";

type InquiryPreviewStatus = "NEW" | "CONTACTED" | "QUALIFIED";

type InquiryHistoryEntry = Readonly<{
  detail: string;
  id: string;
  title: string;
}>;

type AdminInquiryDetailProps = Readonly<{
  trigger: ReactElement;
}>;

const inquiryFixture = {
  budgetRange: "Belum dicantumkan",
  company: null,
  currentStage: "SKETCH",
  description: "Membutuhkan tinjauan awal untuk urutan prototyping dan kesiapan material display modular.",
  preferredService: "Desain dan prototyping",
  projectGoal: "Menilai arah prototype display modular sebelum konsultasi terstruktur.",
  reference: "BRF-EX-1049",
  targetDeadline: "Belum ditetapkan",
  targetQuantity: "Satu prototype untuk review",
} as const;

const statusConfig: Record<InquiryPreviewStatus, Readonly<{ label: string; className: string }>> = {
  NEW: {
    label: "Baru",
    className: "border-info-border bg-info-background text-info",
  },
  CONTACTED: {
    label: "Sudah dihubungi",
    className: "border-warning-border bg-warning-background text-warning",
  },
  QUALIFIED: {
    label: "Terkualifikasi",
    className: "border-success-border bg-success-background text-success",
  },
};

const localNextAction: Record<
  InquiryPreviewStatus,
  Readonly<{ label: string; nextStatus: InquiryPreviewStatus }> | null
> = {
  NEW: { label: "Tandai sudah dihubungi", nextStatus: "CONTACTED" },
  CONTACTED: { label: "Lanjutkan kualifikasi", nextStatus: "QUALIFIED" },
  QUALIFIED: null,
};

const initialHistory: readonly InquiryHistoryEntry[] = [
  {
    detail: "Status awal fixture adalah NEW. Tidak ada brief atau kontak produksi yang dimuat.",
    id: "received",
    title: "Brief preview diterima",
  },
];

function DetailDefinition({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

export function AdminInquiryDetail({ trigger }: AdminInquiryDetailProps) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<InquiryPreviewStatus>("NEW");
  const [history, setHistory] = useState<readonly InquiryHistoryEntry[]>(initialHistory);
  const [followUpPrepared, setFollowUpPrepared] = useState(false);
  const nextAction = localNextAction[status];

  function updateLocalStatus() {
    if (!nextAction) return;

    setStatus(nextAction.nextStatus);
    setHistory((currentHistory) => [
      ...currentHistory,
      {
        detail: `Status preview berubah dari ${status} ke ${nextAction.nextStatus}. Tidak ada audit atau mutasi server dibuat.`,
        id: `${status}-${nextAction.nextStatus}`,
        title: nextAction.label,
      },
    ]);
  }

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent
        className="right-0 left-auto top-0 h-[100dvh] w-full max-w-[34rem] translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-l border-border p-0 sm:max-w-[34rem]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs font-medium text-brand-700">{inquiryFixture.reference}</p>
            <Badge className={statusConfig[status].className} variant="outline">
              {statusConfig[status].label}
            </Badge>
          </div>
          <DialogTitle className="text-xl leading-tight font-semibold tracking-tight">
            Detail project brief
          </DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            Fixture development-only untuk meninjau konteks dan urutan keputusan inquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-5 py-6 sm:px-6">
          <StatusNotice
            description="Kontak, file, tautan referensi privat, dan data pelanggan asli tidak tersedia di preview ini."
            size="compact"
            title="Proyeksi inquiry aman untuk review UI"
            tone="info"
          />

          <section aria-labelledby="inquiry-context-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold" id="inquiry-context-heading">Konteks brief</h3>
              <p className="text-xs text-muted-foreground">Data sintetis</p>
            </div>
            <dl className="mt-3">
              <DetailDefinition label="Tujuan" value={inquiryFixture.projectGoal} />
              <DetailDefinition label="Ringkasan" value={inquiryFixture.description} />
              <DetailDefinition
                label="Tahap saat ini"
                value={inquiryFixture.currentStage === "SKETCH" ? "Sketsa" : inquiryFixture.currentStage}
              />
              <DetailDefinition label="Layanan dipilih" value={inquiryFixture.preferredService} />
              <DetailDefinition label="Company" value={inquiryFixture.company ?? "Tidak dicantumkan"} />
            </dl>
          </section>

          <section aria-labelledby="inquiry-parameters-heading">
            <h3 className="text-sm font-semibold" id="inquiry-parameters-heading">Parameter kerja</h3>
            <dl className="mt-3">
              <DetailDefinition label="Kuantitas" value={inquiryFixture.targetQuantity} />
              <DetailDefinition label="Target waktu" value={inquiryFixture.targetDeadline} />
              <DetailDefinition label="Rentang budget" value={inquiryFixture.budgetRange} />
              <DetailDefinition label="Kontak" value="Disembunyikan di preview" />
              <DetailDefinition label="Referensi privat" value="Tidak tersedia di preview" />
            </dl>
          </section>

          <section aria-labelledby="inquiry-history-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold" id="inquiry-history-heading">Riwayat preview</h3>
              <p className="text-xs text-muted-foreground">Lokal, tanpa audit server</p>
            </div>
            <ol aria-label="Riwayat inquiry preview" className="mt-3 space-y-3 border-l border-border pl-4">
              {history.map((entry) => (
                <li className="relative" key={entry.id}>
                  <span aria-hidden="true" className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full border border-border bg-background" />
                  <p className="text-sm font-medium">{entry.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="inquiry-actions-heading" className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold" id="inquiry-actions-heading">Tindakan berikutnya</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Saat terintegrasi, otorisasi `INQUIRY_MANAGE` dan transition map server tetap menjadi authority untuk setiap perubahan status.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {nextAction ? (
                <Button
                  className="min-h-11 cursor-pointer"
                  disabled={!hydrated}
                  onClick={updateLocalStatus}
                  type="button"
                >
                  {nextAction.label}
                </Button>
              ) : (
                <p className="rounded-lg border border-success-border bg-success-background px-3 py-2 text-sm text-success" role="status">
                  Preview berhenti pada tahap kualifikasi. Quote tetap memerlukan workflow terpisah.
                </p>
              )}
              <Button
                className="min-h-11 cursor-pointer"
                disabled={!hydrated}
                onClick={() => setFollowUpPrepared(true)}
                type="button"
                variant="outline"
              >
                Siapkan follow-up preview
              </Button>
            </div>
            {followUpPrepared ? (
              <StatusNotice
                className="mt-4"
                description="Tidak ada email, WhatsApp, API, atau data pelanggan yang dikirim atau disimpan."
                size="compact"
                title="Follow-up preview siap ditinjau"
                tone="success"
              />
            ) : null}
          </section>
        </div>

        <DialogFooter className="sticky bottom-0 mx-0 mb-0 rounded-none bg-background px-5 sm:px-6">
          <DialogClose render={<Button className="min-h-11 cursor-pointer" type="button" variant="outline" />}>
            Tutup detail
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
