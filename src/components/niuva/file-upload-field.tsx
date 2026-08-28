"use client";

import { useId, useRef, type ChangeEvent } from "react";
import { AlertCircle, FileCheck2, RefreshCw, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FileUploadStatus =
  | "idle"
  | "selecting"
  | "uploading"
  | "validating"
  | "accepted"
  | "invalid"
  | "failed"
  | "expired"
  | "retrying";

export type FileUploadSize = "default" | "compact";
export type FileUploadVariant = "single-private-file";

export type FileUploadFieldProps = {
  label: string;
  acceptedExtensions: readonly string[];
  maxSizeLabel: string;
  description?: string;
  fileName?: string;
  fileMeta?: string;
  status?: FileUploadStatus;
  error?: string;
  onSelect?: (file: File | null) => void;
  onRetry?: () => void;
  onRemove?: () => void;
  id?: string;
  variant?: FileUploadVariant;
  size?: FileUploadSize;
  disabled?: boolean;
  className?: string;
};

const statusLabels: Record<FileUploadStatus, string> = {
  idle: "Belum ada berkas",
  selecting: "Memilih berkas",
  uploading: "Mengunggah",
  validating: "Memeriksa",
  accepted: "Berkas diterima",
  invalid: "Berkas perlu diperbaiki",
  failed: "Upload gagal",
  expired: "Sesi berakhir",
  retrying: "Mencoba kembali",
};

const statusCopy: Record<FileUploadStatus, string> = {
  idle: "Pilih satu berkas untuk memulai pemeriksaan.",
  selecting: "Pilih berkas dari perangkat Anda.",
  uploading: "Berkas sedang dikirim ke ruang privat.",
  validating: "Berkas sedang diperiksa terhadap kebijakan server.",
  accepted: "Berkas siap diteruskan ke review operator.",
  invalid: "Periksa alasan di bawah, lalu pilih berkas lain.",
  failed: "Berkas belum tersimpan. Coba upload kembali.",
  expired: "Sesi upload berakhir sebelum proses selesai.",
  retrying: "Percobaan upload baru sedang dimulai.",
};

const errorDefaults: Record<"invalid" | "failed" | "expired", string> = {
  invalid: "Berkas tidak memenuhi format atau kebijakan ukuran yang berlaku.",
  failed: "Berkas belum tersimpan karena proses upload mengalami kendala.",
  expired: "Akses sesi upload berakhir. Mulai kembali untuk mendapatkan sesi baru.",
};

function isBusyStatus(status: FileUploadStatus) {
  return status === "uploading" || status === "validating" || status === "retrying";
}

function isErrorStatus(status: FileUploadStatus) {
  return status === "invalid" || status === "failed" || status === "expired";
}

export function FileUploadField({
  label,
  acceptedExtensions,
  maxSizeLabel,
  description,
  fileName,
  fileMeta,
  status = "idle",
  error,
  onSelect,
  onRetry,
  onRemove,
  id,
  variant = "single-private-file",
  size = "default",
  disabled = false,
  className,
}: FileUploadFieldProps) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = id ?? `file-upload-${generatedId}`;
  const statusId = `${inputId}-status`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = isBusyStatus(status);
  const errorState = isErrorStatus(status);
  const acceptedAttribute = acceptedExtensions
    .map((extension) => (extension.startsWith(".") ? extension : `.${extension}`))
    .join(",");
  const describedBy = [descriptionId, statusId].filter(Boolean).join(" ") || undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onSelect?.(event.currentTarget.files?.[0] ?? null);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  const recoveryAction =
    status === "failed" || status === "expired" ? (
      onRetry ? (
        <Button onClick={onRetry} size="sm" type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Coba lagi
        </Button>
      ) : null
    ) : status === "invalid" ? (
      <Button onClick={openFilePicker} size="sm" type="button" variant="outline">
        Pilih berkas lain
      </Button>
    ) : null;

  return (
    <div
      className={cn("space-y-3", className)}
      data-component="file-upload-field"
      data-size={size}
      data-status={status}
      data-variant={variant}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Label className={cn(disabled && "cursor-not-allowed opacity-60")} htmlFor={inputId}>
          {label}
        </Label>
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
          Private file
        </span>
      </div>

      {description ? (
        <p className="text-xs leading-5 text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}

      <Input
        accept={acceptedAttribute}
        aria-describedby={describedBy}
        aria-invalid={errorState || undefined}
        aria-label={label}
        disabled={disabled || busy}
        id={inputId}
        onChange={handleChange}
        ref={inputRef}
        type="file"
        className="sr-only"
      />

      <label
        className={cn(
          "flex min-h-28 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          size === "compact" && "min-h-20 p-3",
          (disabled || busy) && "cursor-not-allowed opacity-70",
          errorState && "border-destructive-border bg-destructive-background/40",
          status === "accepted" && "border-success-border bg-success-background/40",
        )}
        htmlFor={inputId}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-brand-700",
            size === "compact" && "size-8",
            errorState && "text-destructive",
            status === "accepted" && "text-success",
          )}
        >
          {errorState ? <AlertCircle /> : status === "accepted" ? <FileCheck2 /> : <UploadCloud />}
        </span>
        <span className="min-w-0 space-y-1">
          <span className="block text-sm font-medium text-foreground">{statusCopy[status]}</span>
          <span className="block text-xs leading-5 text-muted-foreground">
            {acceptedExtensions.join(", ")} · {maxSizeLabel}
          </span>
        </span>
      </label>

      <div aria-live="polite" className="text-xs text-muted-foreground" id={statusId}>
        <span className="sr-only">Status: {statusLabels[status]}</span>
        {!errorState && status !== "idle" ? statusCopy[status] : null}
      </div>

      {fileName ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileCheck2 aria-hidden="true" className="size-5 shrink-0 text-success" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {fileMeta ?? "Metadata menunggu validasi server"}
              </p>
            </div>
          </div>
          {onRemove ? (
            <Button onClick={onRemove} size="sm" type="button" variant="ghost">
              <X aria-hidden="true" />
              Hapus
            </Button>
          ) : null}
        </div>
      ) : null}

      {errorState ? (
        <div
          aria-live="assertive"
          className="space-y-2 rounded-lg border border-destructive-border bg-destructive-background p-3 text-sm"
          role="alert"
        >
          <p className="font-medium text-destructive">{statusLabels[status]}</p>
          <p className="text-destructive/80">{error ?? errorDefaults[status]}</p>
          {recoveryAction ? <div className="flex flex-wrap gap-2">{recoveryAction}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
