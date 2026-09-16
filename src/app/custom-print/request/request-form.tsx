"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

import { FileUploadField, type FileUploadStatus } from "@/components/niuva/file-upload-field";
import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPublicWhatsAppHref } from "@/features/public/company-content";
import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";

const acceptedExtensions = [".stl", ".3mf", ".obj", ".step", ".stp"] as const;
const maxFileSizeLabel = `${CUSTOM_FILE_MAX_BYTES / 1_024 / 1_024} MiB`;
const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional(),
);

const requestPreviewSchema = z.object({
  colorRequested: optionalText,
  customerEmail: z.email(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  materialRequested: z.string().trim().min(1),
  notes: optionalText,
  quantity: z.coerce.number().int().positive(),
  unitConfirmation: z.string().trim().min(1),
});

type PreviewFieldName = keyof z.infer<typeof requestPreviewSchema> | "file" | "rightsAck";
type PreviewErrors = Partial<Record<PreviewFieldName, string>>;
type UploadScenario = "accepted" | "failed" | "expired";
type SubmitResult = "idle" | "pending" | "ready" | "unavailable" | "error";
type RequestFormMode = "live" | "preview" | "unavailable";

const uploadIntentResponseSchema = z.object({
  expiresAt: z.string().min(1),
  fileId: z.uuid(),
  requiredHeaders: z.object({ "content-type": z.string().min(1) }),
  uploadToken: z.string().min(1),
  uploadUrl: z.url({ protocol: /^https?$/ }),
});

const uploadConfirmationResponseSchema = z.object({
  fileId: z.uuid(),
  status: z.literal("UPLOADED"),
});

const customRequestResponseSchema = z.object({
  accessToken: z.string().min(1),
  referenceNumber: z.string().min(1),
});

const supportedMimeTypes: Record<string, readonly string[]> = {
  ".3mf": ["model/3mf", "application/vnd.ms-3mfdocument"],
  ".obj": ["model/obj", "text/plain"],
  ".step": ["model/step", "application/step"],
  ".stl": ["model/stl", "application/sla", "application/vnd.ms-pki.stl"],
  ".stp": ["model/step", "application/step"],
};

class ClientRequestError extends Error {
  readonly expired: boolean;

  constructor(message: string, { expired = false }: { expired?: boolean } = {}) {
    super(message);
    this.name = "ClientRequestError";
    this.expired = expired;
  }
}

const fieldLabels: Record<PreviewFieldName, string> = {
  colorRequested: "Warna",
  customerEmail: "Email",
  customerName: "Nama",
  customerPhone: "Nomor WhatsApp",
  file: "File model",
  materialRequested: "Material",
  notes: "Catatan",
  quantity: "Jumlah",
  rightsAck: "Persetujuan pemrosesan",
  unitConfirmation: "Unit atau skala",
};

function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function formatBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${Math.ceil(bytes / 1_024)} KiB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MiB`;
}

function fileMetadata(file: File) {
  const extension = fileExtension(file.name).slice(1).toUpperCase() || "Tanpa ekstensi";
  const reviewType = extension === "STEP" || extension === "STP" ? `${extension}, review manual` : extension;
  return `${reviewType} · ${formatBytes(file.size)}`;
}

export function RequestForm({
  liveEnabled = false,
  previewEnabled = false,
}: {
  liveEnabled?: boolean;
  previewEnabled?: boolean;
}) {
  const mode: RequestFormMode = liveEnabled
    ? "live"
    : previewEnabled
      ? "preview"
      : "unavailable";
  const isLive = mode === "live";
  const isPreview = mode === "preview";
  const hydrated = useHydrated();
  const [errors, setErrors] = useState<PreviewErrors>({});
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [fileStatus, setFileStatus] = useState<FileUploadStatus>("idle");
  const [progress, setProgress] = useState<number>();
  const [scenario, setScenario] = useState<UploadScenario>("accepted");
  const [result, setResult] = useState<SubmitResult>("idle");
  const [referenceNumber, setReferenceNumber] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const pending = useRef(false);
  const scenarioRef = useRef<UploadScenario>("accepted");
  const statusRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const uploadOperationRef = useRef(0);
  const uploadAbortRef = useRef<AbortController | null>(null);

  function clearTimers() {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }

  useEffect(() => () => {
    for (const timer of timers.current) clearTimeout(timer);
    uploadAbortRef.current?.abort();
    uploadOperationRef.current += 1;
  }, []);

  useEffect(() => {
    if (Object.keys(errors).length > 0 || result === "ready" || result === "unavailable" || result === "error") {
      statusRef.current?.focus();
    }
  }, [errors, result]);

  function schedule(callback: () => void, delay: number) {
    timers.current.push(setTimeout(callback, delay));
  }

  function resetLiveUpload() {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    uploadOperationRef.current += 1;
    setUploadedFileId(undefined);
  }

  function isCurrentUpload(operationId: number) {
    return uploadOperationRef.current === operationId;
  }

  async function readApiResponse<T>(
    response: Response,
    schema: z.ZodType<T>,
    fallbackMessage: string,
  ): Promise<T> {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ClientRequestError(fallbackMessage);
    }

    if (!response.ok) {
      throw new ClientRequestError(
        response.status === 401 ? "Sesi upload berakhir. Pilih file untuk memulai kembali." : fallbackMessage,
        { expired: response.status === 401 },
      );
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ClientRequestError(fallbackMessage);
    }

    return parsed.data;
  }

  function declaredMimeType(nextFile: File): string | undefined {
    const extension = fileExtension(nextFile.name);
    const supported = supportedMimeTypes[extension];
    if (supported === undefined) return undefined;

    const browserMime = nextFile.type.trim().toLowerCase();
    if (browserMime === "" || browserMime === "application/octet-stream") {
      return supported[0];
    }

    return supported.includes(browserMime) ? browserMime : undefined;
  }

  function validateSelectedFile(nextFile: File): string | undefined {
    const extension = fileExtension(nextFile.name);
    if (!acceptedExtensions.includes(extension as (typeof acceptedExtensions)[number])) {
      return `Gunakan STL, 3MF, OBJ, STEP, atau STP untuk ${isPreview ? "preview ini" : "upload privat ini"}.`;
    }
    if (nextFile.size <= 0 || nextFile.size > CUSTOM_FILE_MAX_BYTES) {
      return `Ukuran file harus lebih dari 0 B dan tidak melebihi ${maxFileSizeLabel}.`;
    }
    if (isLive && declaredMimeType(nextFile) === undefined) {
      return "Tipe file tidak cocok dengan ekstensi. Pilih file model yang sesuai.";
    }
    return undefined;
  }

  function simulateFile(nextFile: File, nextScenario: UploadScenario = scenarioRef.current) {
    clearTimers();
    setFile(nextFile);
    setFileError(undefined);
    setResult("idle");
    setErrors((current) => {
      const next = { ...current };
      delete next.file;
      return next;
    });

    const validationError = validateSelectedFile(nextFile);
    if (validationError !== undefined) {
      setFileStatus("invalid");
      setProgress(undefined);
      setFileError(validationError);
      return;
    }

    setFileStatus("uploading");
    setProgress(12);
    schedule(() => setProgress(58), 160);
    schedule(() => {
      setFileStatus("validating");
      setProgress(86);
    }, 320);
    schedule(() => {
      if (nextScenario === "failed") {
        setFileStatus("failed");
        setProgress(64);
        return;
      }
      if (nextScenario === "expired") {
        setFileStatus("expired");
        setProgress(86);
        return;
      }
      setFileStatus("accepted");
      setProgress(100);
    }, 520);
  }

  async function uploadFile(nextFile: File) {
    resetLiveUpload();
    clearTimers();
    setFile(nextFile);
    setFileError(undefined);
    setResult("idle");
    setReferenceNumber(undefined);
    setServerError(undefined);
    setErrors((current) => {
      const next = { ...current };
      delete next.file;
      return next;
    });

    const validationError = validateSelectedFile(nextFile);
    if (validationError !== undefined) {
      setFileStatus("invalid");
      setProgress(undefined);
      setFileError(validationError);
      return;
    }

    const controller = new AbortController();
    const operationId = uploadOperationRef.current + 1;
    uploadOperationRef.current = operationId;
    uploadAbortRef.current = controller;
    setFileStatus("uploading");
    setProgress(12);

    try {
      const mimeType = declaredMimeType(nextFile);
      if (mimeType === undefined) {
        throw new ClientRequestError("Tipe file tidak cocok dengan ekstensi. Pilih file model yang sesuai.");
      }

      const intentResponse = await fetch("/api/uploads/intents", {
        body: JSON.stringify({
          mimeType,
          originalName: nextFile.name,
          sizeBytes: nextFile.size,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const intent = await readApiResponse(
        intentResponse,
        uploadIntentResponseSchema,
        "Sesi upload privat belum dapat dibuat. Coba lagi.",
      );
      if (!isCurrentUpload(operationId)) return;

      setProgress(28);
      const objectResponse = await fetch(intent.uploadUrl, {
        body: nextFile,
        headers: intent.requiredHeaders,
        method: "PUT",
        signal: controller.signal,
      });
      if (!objectResponse.ok) {
        throw new ClientRequestError("Coba upload kembali.");
      }
      if (!isCurrentUpload(operationId)) return;

      setFileStatus("validating");
      setProgress(82);
      const confirmationResponse = await fetch("/api/uploads/confirm", {
        body: JSON.stringify({ fileId: intent.fileId, uploadToken: intent.uploadToken }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const confirmation = await readApiResponse(
        confirmationResponse,
        uploadConfirmationResponseSchema,
        "File belum lolos pemeriksaan server. Coba upload kembali.",
      );
      if (!isCurrentUpload(operationId)) return;

      setUploadedFileId(confirmation.fileId);
      setFileStatus("accepted");
      setProgress(100);
      uploadAbortRef.current = null;
    } catch (error) {
      if (!isCurrentUpload(operationId)) return;
      uploadAbortRef.current = null;
      if (error instanceof DOMException && error.name === "AbortError") return;

      setUploadedFileId(undefined);
      setFileStatus(error instanceof ClientRequestError && error.expired ? "expired" : "failed");
      setProgress(undefined);
      setFileError(
        error instanceof ClientRequestError && error.expired
          ? error.message
          : error instanceof ClientRequestError
            ? error.message
            : "Coba upload kembali.",
      );
    }
  }

  function removeFile() {
    clearTimers();
    resetLiveUpload();
    setFile(null);
    setFileError(undefined);
    setFileStatus("idle");
    setProgress(undefined);
    setResult("idle");
    setReferenceNumber(undefined);
    setServerError(undefined);
    pending.current = false;
  }

  async function submitLiveRequest(parsed: z.infer<typeof requestPreviewSchema>, fileId: string) {
    const response = await fetch("/api/custom-print/requests", {
      body: JSON.stringify({ ...parsed, fileIds: [fileId] }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return readApiResponse(
      response,
      customRequestResponseSchema,
      "Request belum tersimpan. Coba lagi setelah koneksi pulih.",
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;

    const formData = new FormData(event.currentTarget);
    const parsed = requestPreviewSchema.safeParse(Object.fromEntries(formData));
    const nextErrors: PreviewErrors = {};
    const fileIdForSubmit = uploadedFileId;

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const name = String(issue.path[0]) as keyof z.infer<typeof requestPreviewSchema>;
        nextErrors[name] = name === "customerEmail"
          ? "Masukkan alamat email yang valid."
          : name === "quantity"
            ? "Masukkan jumlah berupa bilangan bulat lebih dari nol."
            : "Lengkapi informasi ini sebelum melanjutkan.";
      }
    }
    if (!file || fileStatus !== "accepted") {
      nextErrors.file = "Selesaikan pemeriksaan metadata file sebelum melanjutkan.";
      if (!file) {
        setFileStatus("invalid");
        setFileError(`Pilih satu file model untuk melengkapi ${isPreview ? "preview request" : "request ini"}.`);
      }
    }
    if (isLive && fileIdForSubmit === undefined) {
      nextErrors.file = "Tunggu sampai file selesai diunggah dan diverifikasi.";
    }
    if (formData.get("rightsAck") !== "on") {
      nextErrors.rightsAck = "Persetujuan diperlukan sebelum melanjutkan.";
    }

    setResult("idle");
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length > 0) return;

    if (mode === "unavailable") {
      setResult("unavailable");
      return;
    }

    pending.current = true;
    setResult("pending");
    if (isPreview) {
      schedule(() => {
        pending.current = false;
        setResult("ready");
      }, 500);
      return;
    }

    if (fileIdForSubmit === undefined) return;

    void submitLiveRequest(parsed.data, fileIdForSubmit)
      .then((response) => {
        pending.current = false;
        setReferenceNumber(response.referenceNumber);
        setResult("ready");
      })
      .catch((error) => {
        pending.current = false;
        setServerError(error instanceof ClientRequestError ? error.message : "Request belum tersimpan. Coba lagi.");
        setResult("error");
      });
  }

  const fileBusy = fileStatus === "uploading" || fileStatus === "validating" || fileStatus === "retrying";

  return (
    <form
      aria-busy={result === "pending"}
      aria-label="Form request custom print"
      className="rounded-xl border border-border bg-card p-5 shadow-floating sm:p-8"
      data-custom-request-form
      noValidate
      onSubmit={submit}
    >
      <div className="border-b border-border pb-6">
        <h2 className="text-xl font-semibold">Lengkapi konteks untuk review.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tanda * menunjukkan field wajib. Nilai yang belum pasti dapat dijelaskan melalui catatan.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isLive
            ? "File dikirim langsung ke ruang privat dan request diteruskan ke review operator setelah metadata dikonfirmasi."
            : isPreview
              ? "Isian dan file hanya berada di halaman ini. Tidak ada data yang dikirim atau disimpan."
              : "Ruang privat belum tersedia pada runtime ini. Tidak ada data yang dikirim atau disimpan."}
        </p>
      </div>

      {isPreview ? (
        <div className="my-6 rounded-lg border border-info-border bg-info-background p-4 text-info">
          <p className="text-sm font-semibold">Preview lokal dengan file contoh</p>
          <label className="mb-2 mt-3 block text-sm" htmlFor="custom-upload-scenario">Hasil simulasi file</label>
          <select
            className={controlClass}
            disabled={!hydrated || fileBusy || result === "pending"}
            id="custom-upload-scenario"
            onChange={(event) => {
              const next = event.target.value as UploadScenario;
              scenarioRef.current = next;
              setScenario(next);
              setResult("idle");
            }}
            value={scenario}
          >
            <option value="accepted">Metadata sesuai</option>
            <option value="failed">Simulasi gagal</option>
            <option value="expired">Sesi berakhir</option>
          </select>
        </div>
      ) : isLive ? (
        <div className="my-6 rounded-lg border border-success-border bg-success-background p-4 text-success">
          <p className="text-sm font-semibold">Upload privat aktif</p>
          <p className="mt-2 text-sm leading-6">
            File dikirim langsung ke storage privat dan hanya metadata yang diteruskan ke server untuk pemeriksaan.
          </p>
        </div>
      ) : (
        <div className="my-6">
          <StatusNotice
            description="Storage privat atau database belum tersedia pada runtime ini. Seluruh kontrol tetap terlihat untuk review, tetapi file dan request tidak dapat dikirim."
            title="Pengiriman privat belum tersedia."
            tone="info"
          />
        </div>
      )}

      <div className="mb-6 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" ref={statusRef} tabIndex={-1}>
        {Object.keys(errors).length > 0 ? (
          <div className="rounded-lg border border-destructive-border bg-destructive-background p-4 text-destructive" role="alert">
            <p className="font-semibold">Periksa kembali request Anda.</p>
            <ul className="mt-2 list-inside list-disc text-sm">
              {Object.entries(errors).map(([name, message]) => (
                <li key={name}>
                  <a
                    className="underline underline-offset-4"
                    href={`#custom-${name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(`custom-${name}`)?.focus();
                    }}
                  >
                    {fieldLabels[name as PreviewFieldName]}: {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {result === "pending" ? (
          <p className="text-sm text-muted-foreground" role="status">
            {isPreview ? "Memeriksa preview request. Data tidak dikirim." : "Mengirim request ke review operator."}
          </p>
        ) : null}
        {result === "ready" && isPreview ? (
          <StatusNotice
            description="Informasi dan metadata file lolos pemeriksaan lokal. Tidak ada file, request, nomor referensi, atau pesan yang dikirim."
            title="Preview request siap ditinjau."
            tone="success"
          />
        ) : null}
        {result === "ready" && isLive && referenceNumber ? (
          <StatusNotice
            action={
              <a
                className="inline-flex min-h-11 items-center rounded-lg border border-success-border bg-background px-4 py-2 text-sm font-semibold text-success underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href={createPublicWhatsAppHref(referenceNumber)}
              >
                Lanjutkan melalui WhatsApp
              </a>
            }
            description={`Referensi ${referenceNumber} sudah tercatat. Operator akan meninjau file dan konteks request Anda.`}
            title="Request tersimpan untuk review operator."
            tone="success"
          />
        ) : null}
        {result === "unavailable" ? (
          <StatusNotice
            description="Tidak ada file atau informasi yang dikirim. Simpan konteks Anda di tempat lain sebelum meninggalkan halaman."
            title="Pengiriman request belum tersedia."
            tone="info"
          />
        ) : null}
        {result === "error" ? (
          <StatusNotice
            description={serverError ?? "Request belum tersimpan. Coba lagi."}
            title="Request belum tersimpan."
            tone="error"
          />
        ) : null}
      </div>

      <fieldset className="min-w-0 space-y-8" disabled={mode === "unavailable" || result === "pending"}>
        <legend className="sr-only">Informasi request custom print</legend>

        <section className="space-y-5" aria-labelledby="file-section-title">
          <h3 className="border-b border-border pb-3 text-base font-semibold" id="file-section-title">File model</h3>
          <FileUploadField
            acceptedExtensions={acceptedExtensions}
            description={isPreview
              ? "STL, 3MF, dan OBJ untuk model awal. STEP/STP menjadi lampiran review manual. Preview tidak membaca isi biner."
              : "STL, 3MF, dan OBJ untuk model awal. STEP/STP menjadi lampiran review manual. File dikirim langsung ke ruang privat."}
            disabled={!hydrated || mode === "unavailable"}
            error={fileError}
            fileMeta={file ? fileMetadata(file) : undefined}
            fileName={file?.name}
            id="custom-file"
            label="File model 3D *"
            maxSizeLabel={maxFileSizeLabel}
            mode={isPreview ? "preview" : "live"}
            onRemove={file ? removeFile : undefined}
            onRetry={file ? () => {
              if (isPreview) {
                setFileStatus("retrying");
                setProgress(8);
                schedule(() => simulateFile(file), 120);
              } else {
                void uploadFile(file);
              }
            } : undefined}
            onSelect={(nextFile) => {
              if (!nextFile) return;
              if (isPreview) {
                simulateFile(nextFile);
              } else {
                void uploadFile(nextFile);
              }
            }}
            progress={progress}
            status={fileStatus}
          />
        </section>

        <section className="space-y-5" aria-labelledby="configuration-section-title">
          <h3 className="border-b border-border pb-3 text-base font-semibold" id="configuration-section-title">Konfigurasi awal</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField description="Operator akan memverifikasi pilihan ini saat review." error={errors.materialRequested} id="custom-materialRequested" label="Material" required>
              <select className={controlClass} defaultValue="" name="materialRequested" required>
                <option value="">Pilih kebutuhan material</option>
                <option value="PLA">PLA</option>
                <option value="ABS">ABS</option>
                <option value="OWN_FILAMENT">Membawa filament sendiri</option>
                <option value="NEEDS_RECOMMENDATION">Perlu rekomendasi operator</option>
              </select>
            </FormField>
            <FormField error={errors.colorRequested} id="custom-colorRequested" label="Warna (opsional)">
              <Input className={controlClass} name="colorRequested" />
            </FormField>
            <FormField error={errors.quantity} id="custom-quantity" label="Jumlah" required>
              <Input className={controlClass} inputMode="numeric" min={1} name="quantity" required type="number" />
            </FormField>
            <FormField description="Konfirmasi ini membantu mencegah salah ukuran, terutama pada STL." error={errors.unitConfirmation} id="custom-unitConfirmation" label="Unit atau skala" required>
              <select className={controlClass} defaultValue="" name="unitConfirmation" required>
                <option value="">Pilih konfirmasi unit</option>
                <option value="MILLIMETER_CONFIRMED">Model sudah menggunakan milimeter</option>
                <option value="OTHER_UNIT_NOTED">Unit lain, dijelaskan di catatan</option>
                <option value="NEEDS_OPERATOR_HELP">Belum yakin, perlu bantuan operator</option>
              </select>
            </FormField>
            <FormField className="sm:col-span-2" description="Sertakan fungsi, area kritis, orientasi, atau kebutuhan lain yang perlu diperiksa." error={errors.notes} id="custom-notes" label="Catatan (opsional)">
              <textarea className={controlClass} name="notes" rows={4} />
            </FormField>
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="contact-section-title">
          <h3 className="border-b border-border pb-3 text-base font-semibold" id="contact-section-title">Kontak untuk review</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField error={errors.customerName} id="custom-customerName" label="Nama" required>
              <Input autoComplete="name" className={controlClass} name="customerName" required />
            </FormField>
            <FormField error={errors.customerEmail} id="custom-customerEmail" label="Email" required>
              <Input autoComplete="email" className={controlClass} name="customerEmail" required type="email" />
            </FormField>
            <FormField className="sm:col-span-2" error={errors.customerPhone} id="custom-customerPhone" label="Nomor WhatsApp" required>
              <Input autoComplete="tel" className={controlClass} name="customerPhone" required type="tel" />
            </FormField>
          </div>
          <FormField
            description="Saya berhak membagikan file ini untuk pemeriksaan custom print oleh Niuva."
            error={errors.rightsAck}
            id="custom-rightsAck"
            label="Persetujuan pemrosesan"
            required
          >
            <input className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" name="rightsAck" required type="checkbox" />
          </FormField>
        </section>
      </fieldset>

      <div className="mt-8 border-t border-border pt-6">
        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={!hydrated || mode === "unavailable" || fileBusy || result === "pending"}
          size="lg"
          type="submit"
        >
          {result === "pending"
            ? isPreview ? "Memeriksa preview" : "Mengirim request"
            : isPreview ? "Uji request tanpa mengirim" : isLive ? "Kirim untuk review operator" : "Pengiriman belum tersedia"}
        </Button>
        <noscript><p className="mt-3 text-sm">Aktifkan JavaScript untuk mengirim file dan request secara aman.</p></noscript>
      </div>
    </form>
  );
}
